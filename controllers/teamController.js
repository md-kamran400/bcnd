// const { User, Employee } = require("../models");
const User = require("../models/User");
const Employee = require("../models/Employee");
// const { sequelize } = require("../models");
const sequelize = require("../database").sequelize;
const { Op } = require("sequelize");

/**
 * Get all managers (users with role 'Manager')
 */
exports.getAllManagers = async (req, res) => {
  try {
    const managers = await User.findAll({
      where: { role: "Manager" },
      attributes: { exclude: ["passwordHash", "otp", "sessions", "setupToken", "passwordReset"] },
      include: [{
        model: User,
        as: "teamMembers",
        attributes: ["name", "employeeId", "email", "department", "role"],
        limit: 5,
        required: false
      }],
      order: [["name", "ASC"]]
    });

    return res.json({
      success: true,
      managers,
    });
  } catch (err) {
    console.error("Error fetching managers:", err);
    return res.status(500).json({
      success: false,
      error: "Failed to fetch managers",
    });
  }
};

/**
 * Get all employees (users with role 'Employee')
 */
exports.getAllEmployees = async (req, res) => {
  try {
    const { department, excludeAssigned } = req.query;

    const whereClause = { role: "Employee" };

    if (department && department !== "all") {
      whereClause.department = department;
    }

    if (excludeAssigned === "true") {
      whereClause.managedBy = null;
    }

    const employees = await User.findAll({
      where: whereClause,
      attributes: ["id", "name", "employeeId", "email", "department", "role", "managedBy", "assignedTeam"],
      include: [{
        model: User,
        as: "manager",
        attributes: ["name", "employeeId", "email"]
      }],
      order: [["name", "ASC"]]
    });

    return res.json({
      success: true,
      employees,
    });
  } catch (err) {
    console.error("Error fetching employees:", err);
    return res.status(500).json({
      success: false,
      error: "Failed to fetch employees",
    });
  }
};

/**
 * Get team members for a specific manager
 */
exports.getManagerTeam = async (req, res) => {
  try {
    const { managerId } = req.params;

    const manager = await User.findByPk(managerId, {
      attributes: ["id", "name", "employeeId", "email", "department", "role"],
      raw: true
    });

    if (!manager) {
      return res.status(404).json({
        success: false,
        error: "Manager not found",
      });
    }

    // Get team members separately
    const teamMembers = await User.findAll({
      where: { managedBy: managerId },
      attributes: ["id", "name", "employeeId", "email", "department", "role", "assignedTeam"],
      raw: true
    });

    return res.json({
      success: true,
      manager,
      teamMembers,
    });
  } catch (err) {
    console.error("Error fetching manager team:", err);
    return res.status(500).json({
      success: false,
      error: "Failed to fetch manager team",
    });
  }
};

/**
 * Assign employees to a manager
 */
exports.assignTeamToManager = async (req, res) => {
  const transaction = await sequelize.transaction();

  try {
    const { managerId } = req.params;
    const { employeeIds, teamName } = req.body;

    if (!managerId || !employeeIds || !Array.isArray(employeeIds)) {
      return res.status(400).json({
        success: false,
        error: "Manager ID and employee IDs array are required",
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

    // Verify all employee IDs exist and have Employee role
    const employees = await User.findAll({
      where: {
        id: { [Op.in]: employeeIds },
        role: "Employee",
      },
      transaction
    });

    if (employees.length !== employeeIds.length) {
      const foundIds = employees.map((e) => e.id.toString());
      const missingIds = employeeIds.filter((id) => !foundIds.includes(id));

      await transaction.rollback();
      return res.status(400).json({
        success: false,
        error: "One or more employees not found or not of Employee role",
        missingIds,
      });
    }

    // Clear existing team members from this manager
    await User.update(
      {
        managedBy: null,
        assignedTeam: null,
      },
      {
        where: { managedBy: managerId },
        transaction
      }
    );

    // Assign new team members
    await User.update(
      {
        managedBy: managerId,
        assignedTeam: teamName || `${manager.name}'s Team`,
      },
      {
        where: { id: { [Op.in]: employeeIds } },
        transaction
      }
    );

    // Update manager's teamMembers (if you store the relationship in manager table)
    // Note: This depends on your schema - if you have a Many-to-Many relationship,
    // you might need to update a junction table instead
    await User.update(
      {
        teamMembers: employeeIds, // This assumes you store array in PostgreSQL (using JSON/Array type)
      },
      {
        where: { id: managerId },
        transaction
      }
    );

    await transaction.commit();

    // Fetch updated manager with team members
    const updatedManager = await User.findByPk(managerId, {
      attributes: ["id", "name", "employeeId", "email", "department", "role", "teamMembers"],
      include: [{
        model: User,
        as: "teamMembers",
        attributes: ["id", "name", "employeeId", "email", "department", "role"],
        limit: 10
      }]
    });

    return res.json({
      success: true,
      message: "Team assigned successfully",
      teamCount: employeeIds.length,
      manager: updatedManager,
    });
  } catch (err) {
    await transaction.rollback();
    console.error("Error assigning team:", err);
    return res.status(500).json({
      success: false,
      error: "Failed to assign team: " + err.message,
    });
  }
};

/**
 * Remove employees from a manager's team
 */
exports.removeFromTeam = async (req, res) => {
  const transaction = await sequelize.transaction();

  try {
    const { managerId } = req.params;
    const { employeeIds } = req.body;

    if (!managerId || !employeeIds || !Array.isArray(employeeIds)) {
      return res.status(400).json({
        success: false,
        error: "Manager ID and employee IDs array are required",
      });
    }

    // Verify manager exists
    const manager = await User.findByPk(managerId, { transaction });
    if (!manager) {
      await transaction.rollback();
      return res.status(404).json({
        success: false,
        error: "Manager not found",
      });
    }

    // Remove employees from team
    await User.update(
      {
        managedBy: null,
        assignedTeam: null,
      },
      {
        where: {
          id: { [Op.in]: employeeIds },
          managedBy: managerId,
        },
        transaction
      }
    );

    // Update manager's teamMembers array (if stored)
    const currentTeamMembers = manager.teamMembers || [];
    const updatedTeamMembers = currentTeamMembers.filter(
      id => !employeeIds.includes(id.toString())
    );

    await User.update(
      {
        teamMembers: updatedTeamMembers,
      },
      {
        where: { id: managerId },
        transaction
      }
    );

    await transaction.commit();

    return res.json({
      success: true,
      message: "Employees removed from team successfully",
      removedCount: employeeIds.length,
    });
  } catch (err) {
    await transaction.rollback();
    console.error("Error removing from team:", err);
    return res.status(500).json({
      success: false,
      error: "Failed to remove from team",
    });
  }
};

/**
 * Get team statistics
 */
exports.getTeamStats = async (req, res) => {
  try {
    // Using raw query for complex aggregation
    const stats = await sequelize.query(`
      SELECT 
        u.id,
        u.name,
        u."employeeId",
        u.email,
        u.department,
        COUNT(t.id) as "teamCount",
        json_agg(json_build_object(
          'id', t.id,
          'name', t.name,
          'employeeId', t."employeeId",
          'email', t.email
        ) ORDER BY t.name) FILTER (WHERE t.id IS NOT NULL) as "teamMembers"
      FROM "Users" u
      LEFT JOIN "Users" t ON t."managedBy" = u.id AND t.role = 'Employee'
      WHERE u.role = 'Manager'
      GROUP BY u.id, u.name, u."employeeId", u.email, u.department
      ORDER BY "teamCount" DESC
      LIMIT 10
    `, {
      type: sequelize.QueryTypes.SELECT,
    });

    // Process the results to limit team members to 3
    const processedStats = stats.map(stat => ({
      ...stat,
      teamCount: parseInt(stat.teamCount),
      teamMembers: stat.teamMembers ? stat.teamMembers.slice(0, 3) : []
    }));

    return res.json({
      success: true,
      stats: processedStats,
    });
  } catch (err) {
    console.error("Error fetching team stats:", err);
    return res.status(500).json({
      success: false,
      error: "Failed to fetch team statistics",
    });
  }
};

/**
 * Reassign employee to different manager
 */
exports.reassignEmployee = async (req, res) => {
  const transaction = await sequelize.transaction();

  try {
    const { employeeId } = req.params;
    const { newManagerId } = req.body;

    if (!employeeId || !newManagerId) {
      return res.status(400).json({
        success: false,
        error: "Employee ID and New Manager ID are required",
      });
    }

    // Verify employee exists and has Employee role
    const employee = await User.findByPk(employeeId, { transaction });
    if (!employee || employee.role !== "Employee") {
      await transaction.rollback();
      return res.status(404).json({
        success: false,
        error: "Employee not found",
      });
    }

    // Verify new manager exists and has Manager role
    const newManager = await User.findByPk(newManagerId, { transaction });
    if (!newManager || newManager.role !== "Manager") {
      await transaction.rollback();
      return res.status(404).json({
        success: false,
        error: "New manager not found or not a Manager",
      });
    }

    // Remove from old manager's team if exists
    if (employee.managedBy) {
      const oldManager = await User.findByPk(employee.managedBy, { transaction });
      if (oldManager) {
        const oldManagerTeamMembers = oldManager.teamMembers || [];
        const updatedOldTeamMembers = oldManagerTeamMembers.filter(
          id => id.toString() !== employeeId
        );
        
        await User.update(
          { teamMembers: updatedOldTeamMembers },
          { where: { id: employee.managedBy }, transaction }
        );
      }
    }

    // Add to new manager's team
    await User.update(
      {
        managedBy: newManagerId,
        assignedTeam: `${newManager.name}'s Team`,
      },
      {
        where: { id: employeeId },
        transaction
      }
    );

    // Update new manager's teamMembers array
    const newManagerTeamMembers = newManager.teamMembers || [];
    if (!newManagerTeamMembers.includes(employeeId)) {
      newManagerTeamMembers.push(employeeId);
      
      await User.update(
        { teamMembers: newManagerTeamMembers },
        { where: { id: newManagerId }, transaction }
      );
    }

    await transaction.commit();

    return res.json({
      success: true,
      message: "Employee reassigned successfully",
      employee: {
        name: employee.name,
        employeeId: employee.employeeId,
      },
      newManager: {
        name: newManager.name,
        employeeId: newManager.employeeId,
      },
    });
  } catch (err) {
    await transaction.rollback();
    console.error("Error reassigning employee:", err);
    return res.status(500).json({
      success: false,
      error: "Failed to reassign employee",
    });
  }
};

/**
 * Get employee without manager (available for assignment)
 */
exports.getAvailableEmployees = async (req, res) => {
  try {
    const employees = await User.findAll({
      where: {
        role: "Employee",
        managedBy: null,
      },
      attributes: ["id", "name", "employeeId", "email", "department"],
      order: [["name", "ASC"]]
    });

    return res.json({
      success: true,
      employees,
    });
  } catch (err) {
    console.error("Error fetching available employees:", err);
    return res.status(500).json({
      success: false,
      error: "Failed to fetch available employees",
    });
  }
};