// routes/departmentHeadRoutes.js
const express = require('express');
const departmentHeadRoutes = express.Router();
const departmentHeadController = require('../controllers/departmentHeadController');
const { authenticate, isAdmin } = require('../middleware/auth');

// All routes require admin access
// departmentHeadRoutes.use(authenticate, isAdmin);

// Get all department heads
departmentHeadRoutes.get('/heads', departmentHeadController.getAllDepartmentHeads);

// Get managers under a specific department head
departmentHeadRoutes.get('/head/:headId/managers', departmentHeadController.getHeadManagers);

// Get managers by department (without head assignment)
departmentHeadRoutes.get('/managers/by-department', departmentHeadController.getManagersByDepartment);

// Get available managers (without head assignment)
departmentHeadRoutes.get('/managers/available', departmentHeadController.getAvailableManagers);

// Assign managers to department head
departmentHeadRoutes.post('/head/:headId/assign', departmentHeadController.assignManagersToHead);

// Remove managers from department head
departmentHeadRoutes.post('/head/:headId/remove', departmentHeadController.removeManagersFromHead);

// Get department head statistics
departmentHeadRoutes.get('/stats', departmentHeadController.getDepartmentHeadStats);

// Reassign manager to different department head
departmentHeadRoutes.put('/manager/:managerId/reassign', departmentHeadController.reassignManager);

module.exports = departmentHeadRoutes;