const express = require("express");
const router = express.Router();

const { authenticateToken } = require("../middleware/auth");
const salesController = require("../controllers/salesController");

// Monthly Sales Plan CRUD endpoints
router.get("/monthly-plan", authenticateToken, salesController.getMonthlyPlan);
router.post("/monthly-plan", authenticateToken, salesController.createMonthlyPlan);
router.put("/monthly-plan/:id", authenticateToken, salesController.updateMonthlyPlan);
router.delete("/monthly-plan/:id", authenticateToken, salesController.deleteMonthlyPlan);

// Sales Analytics endpoint
router.get("/analytics", authenticateToken, salesController.getSalesAnalytics);

module.exports = router;
