const User = require("../models/User");
const sequelize = require("../database").sequelize;
const { Op } = require("sequelize");

/**
 * Get all department heads (users with role 'Department Head')
 * with full hierarchy: Department Head -> Managers -> Employees
 */
exports.getAllDepartmentHeads = async (req, res) => {
  try {
    const departmentHeads = await User.findAll({
      where: { role: "Department Head" },
      attributes: {
        exclude: [
          "passwordHash",
          "otp",
          "sessions",
          "setupToken",
          "passwordReset",
        ],
      },
      include: [
        {
          model: User,
          as: "teamMembers",
          attributes: [
            "id",
            "name",
            "employeeId",
            "email",
            "department",
            "role",
          ],
          include: [
            {
              model: User,
              as: "teamMembers",
              attributes: [
                "id",
                "name",
                "employeeId",
                "email",
                "department",
                "role",
                "assignedTeam",
              ],
              limit: 10,
              required: false,
              separate: true, // This helps with limiting nested includes
            },
          ],
          limit: 5,
          required: false,
          separate: true,
        },
      ],
      order: [["name", "ASC"]],
    });

    return res.json({
      success: true,
      departmentHeads,
    });
  } catch (err) {
    console.error("Error fetching department heads:", err);
    return res.status(500).json({
      success: false,
      error: "Failed to fetch department heads",
    });
  }
};

/**
 * Get managers under a specific department head with their team members
 */
exports.getHeadManagers = async (req, res) => {
  try {
    const { headId } = req.params;

    const departmentHead = await User.findByPk(headId, {
      attributes: ["id", "name", "employeeId", "email", "department", "role"],
      raw: true,
    });

    if (!departmentHead) {
      return res.status(404).json({
        success: false,
        error: "Department head not found",
      });
    }

    // Get managers assigned to this department head with their team members populated
    const managers = await User.findAll({
      where: {
        managedBy: headId,
        role: "Manager",
      },
      attributes: [
        "id",
        "name",
        "employeeId",
        "email",
        "department",
        "role",
        "assignedTeam",
        "teamMembers",
      ],
      include: [
        {
          model: User,
          as: "teamMembers",
          attributes: [
            "id",
            "name",
            "employeeId",
            "email",
            "department",
            "role",
            "assignedTeam",
          ],
          limit: 20,
          required: false,
          separate: true,
        },
      ],
      raw: false,
    });

    return res.json({
      success: true,
      departmentHead,
      managers,
    });
  } catch (err) {
    console.error("Error fetching head managers:", err);
    return res.status(500).json({
      success: false,
      error: "Failed to fetch department head managers",
    });
  }
};

/**
 * Get managers by department (for filtering)
 */
exports.getManagersByDepartment = async (req, res) => {
  try {
    const { department, excludeAssigned } = req.query;

    const whereClause = { role: "Manager" };

    if (department && department !== "all") {
      whereClause.department = department;
    }

    if (excludeAssigned === "true") {
      whereClause.managedBy = null;
    }

    const managers = await User.findAll({
      where: whereClause,
      attributes: [
        "id",
        "name",
        "employeeId",
        "email",
        "department",
        "role",
        "managedBy",
        "teamMembers",
      ],
      include: [
        {
          model: User,
          as: "manager",
          attributes: ["id", "name", "employeeId", "email"],
        },
        {
          model: User,
          as: "teamMembers",
          attributes: ["id", "name", "employeeId"],
          limit: 3,
          required: false,
          separate: true,
        },
      ],
      order: [["name", "ASC"]],
    });

    return res.json({
      success: true,
      managers,
    });
  } catch (err) {
    console.error("Error fetching managers by department:", err);
    return res.status(500).json({
      success: false,
      error: "Failed to fetch managers",
    });
  }
};

/**
 * Get available managers (without department head assignment)
 */
exports.getAvailableManagers = async (req, res) => {
  try {
    const { department } = req.query;

    const whereClause = {
      role: "Manager",
      managedBy: null,
    };

    if (department && department !== "all") {
      whereClause.department = department;
    }

    const managers = await User.findAll({
      where: whereClause,
      attributes: [
        "id",
        "name",
        "employeeId",
        "email",
        "department",
        "teamMembers",
      ],
      include: [
        {
          model: User,
          as: "teamMembers",
          attributes: ["id", "name", "employeeId"],
          limit: 3,
          required: false,
          separate: true,
        },
      ],
      order: [["name", "ASC"]],
    });

    return res.json({
      success: true,
      managers,
    });
  } catch (err) {
    console.error("Error fetching available managers:", err);
    return res.status(500).json({
      success: false,
      error: "Failed to fetch available managers",
    });
  }
};

/**
 * Assign managers to a department head
 */
exports.assignManagersToHead = async (req, res) => {
  const transaction = await sequelize.transaction();

  try {
    const { headId } = req.params;
    const { managerIds } = req.body;

    if (!headId || !managerIds || !Array.isArray(managerIds)) {
      return res.status(400).json({
        success: false,
        error: "Department head ID and manager IDs array are required",
      });
    }

    // Verify department head exists and has Department Head role
    const departmentHead = await User.findByPk(headId, { transaction });
    if (!departmentHead || departmentHead.role !== "Department Head") {
      await transaction.rollback();
      return res.status(404).json({
        success: false,
        error: "Department head not found",
      });
    }

    // Verify all manager IDs exist and have Manager role
    const managers = await User.findAll({
      where: {
        id: { [Op.in]: managerIds },
        role: "Manager",
      },
      transaction,
    });

    if (managers.length !== managerIds.length) {
      const foundIds = managers.map((m) => m.id.toString());
      const missingIds = managerIds.filter((id) => !foundIds.includes(id));

      await transaction.rollback();
      return res.status(400).json({
        success: false,
        error: "One or more managers not found or not of Manager role",
        missingIds,
      });
    }

    // Verify managers belong to the same department as department head
    const invalidManagers = managers.filter(
      (m) => m.department !== departmentHead.department,
    );

    if (invalidManagers.length > 0) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        error:
          "All managers must belong to the same department as the department head",
        invalidManagers: invalidManagers.map((m) => ({
          id: m.id,
          name: m.name,
          department: m.department,
        })),
      });
    }

    // Clear existing managers from this department head
    await User.update(
      {
        managedBy: null,
      },
      {
        where: {
          managedBy: headId,
          role: "Manager",
        },
        transaction,
      },
    );

    // Assign new managers to department head
    await User.update(
      {
        managedBy: headId,
      },
      {
        where: { id: { [Op.in]: managerIds } },
        transaction,
      },
    );

    // Update department head's teamMembers array
    await User.update(
      {
        teamMembers: managerIds,
      },
      {
        where: { id: headId },
        transaction,
      },
    );

    await transaction.commit();

    // Fetch updated department head with managers
    const updatedHead = await User.findByPk(headId, {
      attributes: [
        "id",
        "name",
        "employeeId",
        "email",
        "department",
        "role",
        "teamMembers",
      ],
      include: [
        {
          model: User,
          as: "teamMembers",
          attributes: [
            "id",
            "name",
            "employeeId",
            "email",
            "department",
            "role",
          ],
          include: [
            {
              model: User,
              as: "teamMembers",
              attributes: ["id", "name", "employeeId"],
              limit: 3,
              required: false,
            },
          ],
        },
      ],
    });

    return res.json({
      success: true,
      message: "Managers assigned successfully to department head",
      managerCount: managerIds.length,
      departmentHead: updatedHead,
    });
  } catch (err) {
    await transaction.rollback();
    console.error("Error assigning managers to department head:", err);
    return res.status(500).json({
      success: false,
      error: "Failed to assign managers: " + err.message,
    });
  }
};

/**
 * Remove managers from a department head
 */
exports.removeManagersFromHead = async (req, res) => {
  const transaction = await sequelize.transaction();

  try {
    const { headId } = req.params;
    const { managerIds } = req.body;

    if (!headId || !managerIds || !Array.isArray(managerIds)) {
      return res.status(400).json({
        success: false,
        error: "Department head ID and manager IDs array are required",
      });
    }

    // Verify department head exists
    const departmentHead = await User.findByPk(headId, { transaction });
    if (!departmentHead) {
      await transaction.rollback();
      return res.status(404).json({
        success: false,
        error: "Department head not found",
      });
    }

    // Remove managers from department head
    await User.update(
      {
        managedBy: null,
      },
      {
        where: {
          id: { [Op.in]: managerIds },
          managedBy: headId,
        },
        transaction,
      },
    );

    // Update department head's teamMembers array
    const currentTeamMembers = departmentHead.teamMembers || [];
    const updatedTeamMembers = currentTeamMembers.filter(
      (id) => !managerIds.includes(id.toString()),
    );

    await User.update(
      {
        teamMembers: updatedTeamMembers,
      },
      {
        where: { id: headId },
        transaction,
      },
    );

    await transaction.commit();

    return res.json({
      success: true,
      message: "Managers removed from department head successfully",
      removedCount: managerIds.length,
    });
  } catch (err) {
    await transaction.rollback();
    console.error("Error removing managers from department head:", err);
    return res.status(500).json({
      success: false,
      error: "Failed to remove managers",
    });
  }
};

/**
 * Get department head statistics
 */
exports.getDepartmentHeadStats = async (req, res) => {
  try {
    // Using raw query for complex aggregation
    const stats = await sequelize.query(
      `
      WITH manager_stats AS (
        SELECT 
          m."managedBy" as "headId",
          COUNT(DISTINCT e.id) as "employeeCount"
        FROM "Users" m
        LEFT JOIN "Users" e ON e."managedBy" = m.id AND e.role = 'Employee'
        WHERE m.role = 'Manager'
        GROUP BY m."managedBy"
      )
      SELECT 
        dh.id,
        dh.name,
        dh."employeeId",
        dh.email,
        dh.department,
        COUNT(DISTINCT m.id) as "managerCount",
        COALESCE(SUM(ms."employeeCount"), 0) as "totalEmployees",
        json_agg(
          json_build_object(
            'id', m.id,
            'name', m.name,
            'employeeId', m."employeeId",
            'email', m.email,
            'department', m.department,
            'managerCount', COALESCE(ms."employeeCount", 0)
          )
          ORDER BY m.name
        ) FILTER (WHERE m.id IS NOT NULL) as "managers"
      FROM "Users" dh
      LEFT JOIN "Users" m ON m."managedBy" = dh.id AND m.role = 'Manager'
      LEFT JOIN manager_stats ms ON ms."headId" = dh.id
      WHERE dh.role = 'Department Head'
      GROUP BY dh.id, dh.name, dh."employeeId", dh.email, dh.department
      ORDER BY "managerCount" DESC
      LIMIT 10
    `,
      {
        type: sequelize.QueryTypes.SELECT,
      },
    );

    // Process the results to limit managers to 3
    const processedStats = stats.map((stat) => ({
      ...stat,
      managerCount: parseInt(stat.managerCount),
      totalEmployees: parseInt(stat.totalEmployees),
      managers: stat.managers ? stat.managers.slice(0, 3) : [],
    }));

    return res.json({
      success: true,
      stats: processedStats,
    });
  } catch (err) {
    console.error("Error fetching department head stats:", err);
    return res.status(500).json({
      success: false,
      error: "Failed to fetch department head statistics",
    });
  }
};

/**
 * Reassign manager to different department head
 */
exports.reassignManager = async (req, res) => {
  const transaction = await sequelize.transaction();

  try {
    const { managerId } = req.params;
    const { newHeadId } = req.body;

    if (!managerId || !newHeadId) {
      return res.status(400).json({
        success: false,
        error: "Manager ID and New Department Head ID are required",
      });
    }

    // Verify manager exists and has Manager role
    const manager = await User.findByPk(managerId, { transaction });
    if (!manager || manager.role !== "Manager") {
      await transaction.rollback();
      return res.status(404).json({
        success: false,
        error: "Manager not found",
      });
    }

    // Verify new department head exists and has Department Head role
    const newHead = await User.findByPk(newHeadId, { transaction });
    if (!newHead || newHead.role !== "Department Head") {
      await transaction.rollback();
      return res.status(404).json({
        success: false,
        error: "New department head not found or not a Department Head",
      });
    }

    // Verify departments match
    if (manager.department !== newHead.department) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        error: "Manager and department head must belong to the same department",
      });
    }

    // Remove from old department head's team if exists
    if (manager.managedBy) {
      const oldHead = await User.findByPk(manager.managedBy, { transaction });
      if (oldHead) {
        const oldHeadTeamMembers = oldHead.teamMembers || [];
        const updatedOldTeamMembers = oldHeadTeamMembers.filter(
          (id) => id.toString() !== managerId,
        );

        await User.update(
          { teamMembers: updatedOldTeamMembers },
          { where: { id: manager.managedBy }, transaction },
        );
      }
    }

    // Assign to new department head
    await User.update(
      {
        managedBy: newHeadId,
      },
      {
        where: { id: managerId },
        transaction,
      },
    );

    // Update new department head's teamMembers array
    const newHeadTeamMembers = newHead.teamMembers || [];
    if (!newHeadTeamMembers.includes(managerId)) {
      newHeadTeamMembers.push(managerId);

      await User.update(
        { teamMembers: newHeadTeamMembers },
        { where: { id: newHeadId }, transaction },
      );
    }

    await transaction.commit();

    return res.json({
      success: true,
      message: "Manager reassigned successfully",
      manager: {
        name: manager.name,
        employeeId: manager.employeeId,
        department: manager.department,
      },
      newHead: {
        name: newHead.name,
        employeeId: newHead.employeeId,
        department: newHead.department,
      },
    });
  } catch (err) {
    await transaction.rollback();
    console.error("Error reassigning manager:", err);
    return res.status(500).json({
      success: false,
      error: "Failed to reassign manager",
    });
  }
};
