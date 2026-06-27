const express = require("express");
const {
  createRole,
  getRoles,
  getRoleById,
  updateRole,
  deleteRole,
} = require("../../controllers/Settings/roleController");

const roleRoutes = express.Router();

roleRoutes.post("/", createRole);
roleRoutes.get("/", getRoles);
roleRoutes.get("/:id", getRoleById);
roleRoutes.put("/:id", updateRole);
roleRoutes.delete("/:id", deleteRole);

module.exports = roleRoutes;