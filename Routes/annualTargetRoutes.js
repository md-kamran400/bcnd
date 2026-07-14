const express = require("express");
const router = express.Router();

const { authenticateToken } = require("../middleware/auth");
const annualTargetController = require("../controllers/annualTargetController");

// CRUD routes for Form 1: Annual Target Setup
router.get("/", authenticateToken, annualTargetController.getAnnualTargets);
router.post("/", authenticateToken, annualTargetController.saveAnnualTarget);
router.put("/:id", authenticateToken, annualTargetController.updateAnnualTarget);
router.delete("/:id", authenticateToken, annualTargetController.deleteAnnualTarget);

module.exports = router;
