const DepartmentModel = require("../../models/Settings/Department_model");
const { ValidationError, UniqueConstraintError } = require('sequelize');

// Create Department
exports.createDepartment = async (req, res) => {
  try {
    const { departmentId, name } = req.body;

    if (!departmentId || !name) {
      return res
        .status(400)
        .json({ message: "departmentId and name are required" });
    }

    const newDept = await DepartmentModel.create({ 
      departmentId, 
      name 
    });

    res.status(201).json({
      message: "Department created successfully",
      department: newDept,
    });
  } catch (error) {
    // Handle unique constraint error for departmentId
    if (error instanceof UniqueConstraintError) {
      return res.status(409).json({
        message: "Department with this ID already exists",
        error: error.message,
      });
    }
    
    res.status(500).json({
      message: "Error creating department",
      error: error.message,
    });
  }
};

// Get All Departments
exports.getDepartments = async (req, res) => {
  try {
    const departments = await DepartmentModel.findAll({
      order: [['created_at', 'DESC']]
    });
    res.status(200).json(departments);
  } catch (error) {
    res.status(500).json({
      message: "Error fetching departments",
      error: error.message,
    });
  }
};

// Get Single Department
exports.getDepartmentById = async (req, res) => {
  try {
    const dept = await DepartmentModel.findByPk(req.params.id);

    if (!dept) {
      return res.status(404).json({ message: "Department not found" });
    }

    res.status(200).json(dept);
  } catch (error) {
    res.status(500).json({
      message: "Error fetching department",
      error: error.message,
    });
  }
};

// Update Department
exports.updateDepartment = async (req, res) => {
  try {
    const { name } = req.body;

    const dept = await DepartmentModel.findByPk(req.params.id);

    if (!dept) {
      return res.status(404).json({ message: "Department not found" });
    }

    await dept.update({ name });

    res.status(200).json({
      message: "Department updated successfully",
      department: dept,
    });
  } catch (error) {
    res.status(500).json({
      message: "Error updating department",
      error: error.message,
    });
  }
};

// Delete Department
exports.deleteDepartment = async (req, res) => {
  try {
    const dept = await DepartmentModel.findByPk(req.params.id);

    if (!dept) {
      return res.status(404).json({ message: "Department not found" });
    }

    await dept.destroy();

    res.status(200).json({ message: "Department deleted successfully" });
  } catch (error) {
    res.status(500).json({
      message: "Error deleting department",
      error: error.message,
    });
  }
};