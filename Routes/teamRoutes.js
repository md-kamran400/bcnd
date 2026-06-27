const express = require('express');
const teamRoutes = express.Router();
const teamController = require('../controllers/teamController');
const { authenticate, isAdmin } = require('../middleware/auth');

// All routes require admin access
// teamRoutes.use(authenticate, isAdmin);

// Get all managers
teamRoutes.get('/managers', teamController.getAllManagers);

// Get all employees (filterable)
teamRoutes.get('/employees', teamController.getAllEmployees);

// Get available employees (without manager)
teamRoutes.get('/employees/available', teamController.getAvailableEmployees);

// Get manager's team
teamRoutes.get('/manager/:managerId/team', teamController.getManagerTeam);

// Assign team to manager
teamRoutes.post('/manager/:managerId/assign', teamController.assignTeamToManager);

// Remove employees from team
teamRoutes.post('/manager/:managerId/remove', teamController.removeFromTeam);

// Get team statistics
teamRoutes.get('/stats', teamController.getTeamStats);

// Reassign employee to different manager
teamRoutes.put('/employee/:employeeId/reassign', teamController.reassignEmployee);

module.exports = teamRoutes;