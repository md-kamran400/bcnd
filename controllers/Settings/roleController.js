const RoleModel = require("../../models/Settings/Roles_model");
const { ValidationError, UniqueConstraintError } = require('sequelize');

// Create Role
exports.createRole = async (req, res) => {
  try {
    const { roleId, name } = req.body;

    if (!roleId || !name) {
      return res.status(400).json({ message: "roleId and name are required" });
    }

    const newRole = await RoleModel.create({ 
      roleId, 
      name 
    });

    res.status(201).json({
      message: "Role created successfully",
      role: newRole,
    });
  } catch (error) {
    // Handle unique constraint error for roleId
    if (error instanceof UniqueConstraintError) {
      return res.status(409).json({
        message: "Role with this ID already exists",
        error: error.message,
      });
    }
    
    res.status(500).json({
      message: "Error creating role",
      error: error.message,
    });
  }
};

// Get all roles
exports.getRoles = async (req, res) => {
  try {
    const roles = await RoleModel.findAll({
      order: [['created_at', 'DESC']]
    });
    res.status(200).json(roles);
  } catch (error) {
    res.status(500).json({
      message: "Error fetching roles",
      error: error.message,
    });
  }
};

// Get single role
exports.getRoleById = async (req, res) => {
  try {
    const role = await RoleModel.findByPk(req.params.id);

    if (!role) {
      return res.status(404).json({ message: "Role not found" });
    }

    res.status(200).json(role);
  } catch (error) {
    res.status(500).json({
      message: "Error fetching role",
      error: error.message,
    });
  }
};

// Update role
exports.updateRole = async (req, res) => {
  try {
    const { name } = req.body;

    const role = await RoleModel.findByPk(req.params.id);

    if (!role) {
      return res.status(404).json({ message: "Role not found" });
    }

    await role.update({ name });

    res.status(200).json({
      message: "Role updated successfully",
      role: role,
    });
  } catch (error) {
    res.status(500).json({
      message: "Error updating role",
      error: error.message,
    });
  }
};

// Delete role
exports.deleteRole = async (req, res) => {
  try {
    const role = await RoleModel.findByPk(req.params.id);

    if (!role) {
      return res.status(404).json({ message: "Role not found" });
    }

    await role.destroy();

    res.status(200).json({ message: "Role deleted successfully" });
  } catch (error) {
    res.status(500).json({
      message: "Error deleting role",
      error: error.message,
    });
  }
};