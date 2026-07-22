const AnnualTarget = require("../models/AnnualTarget");
const { Op } = require('sequelize');

/**
 * Form 1: Get Annual Targets by Financial Year
 * GET /api/sales/annual-target?financialYear=2026-27
 */
exports.getAnnualTargets = async (req, res) => {
  try {
    const { financialYear } = req.query;
    if (!financialYear) {
      return res.status(400).json({ success: false, error: "financialYear query parameter is required" });
    }

    let targets = await AnnualTarget.findAll({
      where: { financialYear },
      order: [['product', 'ASC']]
    });

    if (targets.length === 0) {
      console.log(`No annual targets found for FY ${financialYear}. Seeding default empty entries...`);
      const PRODUCTS_F1 = ["Master Batch", "Chemical", "PVC Compound", "TPR Compound", "LD", "NBR"];
      
      const defaultRows = PRODUCTS_F1.map(product => ({
        financialYear,
        product,
        planSales: {
          Apr: { qty: 0, value: 0 }, May: { qty: 0, value: 0 }, Jun: { qty: 0, value: 0 },
          Jul: { qty: 0, value: 0 }, Aug: { qty: 0, value: 0 }, Sep: { qty: 0, value: 0 },
          Oct: { qty: 0, value: 0 }, Nov: { qty: 0, value: 0 }, Dec: { qty: 0, value: 0 },
          Jan: { qty: 0, value: 0 }, Feb: { qty: 0, value: 0 }, Mar: { qty: 0, value: 0 }
        }
      }));

      targets = await AnnualTarget.bulkCreate(defaultRows);
    }

    return res.json({ success: true, financialYear, data: targets });
  } catch (err) {
    console.error("Error in getAnnualTargets:", err);
    return res.status(500).json({ success: false, error: "Failed to load annual targets" });
  }
};

/**
 * Form 1: Create or Upsert Annual Target (Optimized)
 * POST /api/sales/annual-target
 */
exports.saveAnnualTarget = async (req, res) => {
  try {
    const { id, financialYear, product, planSales } = req.body;
    if (!financialYear || !product) {
      return res.status(400).json({ success: false, error: "financialYear and product are required" });
    }

    let target;
    if (id) {
      target = await AnnualTarget.findByPk(id);
    }

    if (!target) {
      target = await AnnualTarget.findOne({ where: { financialYear, product } });
    }

    if (target) {
      target.planSales = planSales || target.planSales;
      await target.save();
    } else {
      target = await AnnualTarget.create({
        financialYear,
        product,
        planSales: planSales || {}
      });
    }

    // Optimized sync - only sync changed month if provided
    if (planSales) {
      await syncForm1ToForm2Optimized(target.financialYear, target.product, planSales);
    }

    return res.json({ success: true, data: target });
  } catch (err) {
    console.error("Error in saveAnnualTarget:", err);
    return res.status(500).json({ success: false, error: "Failed to save annual target" });
  }
};

/**
 * Form 1: Update Annual Target by ID (Optimized)
 * PUT /api/sales/annual-target/:id
 */
exports.updateAnnualTarget = async (req, res) => {
  try {
    const { id } = req.params;
    const { planSales } = req.body;

    const target = await AnnualTarget.findByPk(id);
    if (!target) {
      return res.status(404).json({ success: false, error: "Annual target not found" });
    }

    target.planSales = planSales || target.planSales;
    await target.save();

    if (planSales) {
      await syncForm1ToForm2Optimized(target.financialYear, target.product, planSales);
    }

    return res.json({ success: true, data: target });
  } catch (err) {
    console.error("Error in updateAnnualTarget:", err);
    return res.status(500).json({ success: false, error: "Failed to update annual target" });
  }
};

/**
 * Form 1: Delete Annual Target by ID
 * DELETE /api/sales/annual-target/:id
 */
exports.deleteAnnualTarget = async (req, res) => {
  try {
    const { id } = req.params;
    const deleted = await AnnualTarget.destroy({ where: { id } });
    if (!deleted) {
      return res.status(404).json({ success: false, error: "Annual target not found" });
    }
    return res.json({ success: true, message: "Annual target deleted successfully" });
  } catch (err) {
    console.error("Error in deleteAnnualTarget:", err);
    return res.status(500).json({ success: false, error: "Failed to delete annual target" });
  }
};

// --- OPTIMIZED HELPER FUNCTIONS ---

function getMonthKey(fy, monthAbbr) {
  const [startYearStr] = fy.split("-");
  const startYear = parseInt(startYearStr);
  const endYear = startYear + 1;
  
  const monthMap = {
    Apr: `${startYear}-04`,
    May: `${startYear}-05`,
    Jun: `${startYear}-06`,
    Jul: `${startYear}-07`,
    Aug: `${startYear}-08`,
    Sep: `${startYear}-09`,
    Oct: `${startYear}-10`,
    Nov: `${startYear}-11`,
    Dec: `${startYear}-12`,
    Jan: `${endYear}-01`,
    Feb: `${endYear}-02`,
    Mar: `${endYear}-03`
  };
  return monthMap[monthAbbr];
}

// Optimized sync - only sync changed months
async function syncForm1ToForm2Optimized(financialYear, product, planSales) {
  const MonthlySalesPlan = require("../models/MonthlySalesPlan");
  const SALESPERSONS = ["Mani", "Sukhdev", "Sunil", "Suresh/ mahavir", "LS"];
  const MONTHS = ["Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec", "Jan", "Feb", "Mar"];
  
  // Only process months that have data
  const changedMonths = MONTHS.filter(month => planSales && planSales[month]);
  
  if (changedMonths.length === 0) return;

  // Prepare all bulk operations
  const bulkOps = [];
  
  for (const monthAbbr of changedMonths) {
    const monthKey = getMonthKey(financialYear, monthAbbr);
    if (!monthKey) continue;
    
    let targetQty = 0;
    let targetValueCr = 0;
    
    if (planSales[monthAbbr]) {
      if (typeof planSales[monthAbbr] === 'object') {
        targetQty = parseFloat(planSales[monthAbbr].qty) || 0;
        targetValueCr = parseFloat(planSales[monthAbbr].value) || 0;
      } else {
        targetQty = parseFloat(planSales[monthAbbr]) || 0;
      }
    }
    
    const targetValueLakhs = targetValueCr * 100;
    let planQtyPerPerson = targetQty / 5;
    if (product === "Master Batch") {
      planQtyPerPerson = (targetQty / 35) / 5;
    }
    const planValuePerPerson = targetValueLakhs / 5;
    
    for (const salesPerson of SALESPERSONS) {
      bulkOps.push({
        where: { month: monthKey, product, salesPerson },
        update: {
          planQty: planQtyPerPerson,
          planValue: planValuePerPerson
        },
        create: {
          month: monthKey,
          product,
          salesPerson,
          planQty: planQtyPerPerson,
          planValue: planValuePerPerson,
          w1Qty: 0, w1Value: 0,
          w2Qty: 0, w2Value: 0,
          w3Qty: 0, w3Value: 0,
          w4Qty: 0, w4Value: 0,
          prevPlanQty: 0, prevPlanValue: 0,
          prevTotalQty: 0, prevTotalValue: 0,
          auditLogs: []
        }
      });
    }
  }

  // Execute bulk upsert
  if (bulkOps.length > 0) {
    await MonthlySalesPlan.bulkCreate(
      bulkOps.map(op => op.create),
      { updateOnDuplicate: ['planQty', 'planValue', 'updated_at'] }
    );
  }

  // Async recompute without waiting (fire and forget)
  // This prevents blocking the response
  setImmediate(async () => {
    try {
      await recomputeCascadesOptimized(product);
    } catch (err) {
      console.error('Error in background recompute:', err);
    }
  });
}

// Optimized cascade recomputation
async function recomputeCascadesOptimized(product) {
  const MonthlySalesPlan = require("../models/MonthlySalesPlan");
  const SALESPERSONS = ["Mani", "Sukhdev", "Sunil", "Suresh/ mahavir", "LS"];
  
  const allPlans = await MonthlySalesPlan.findAll({
    where: { product },
    order: [['salesPerson', 'ASC'], ['month', 'ASC']]
  });

  // Group by salesPerson
  const groupedPlans = {};
  for (const plan of allPlans) {
    if (!groupedPlans[plan.salesPerson]) {
      groupedPlans[plan.salesPerson] = [];
    }
    groupedPlans[plan.salesPerson].push(plan);
  }

  // Process each salesperson
  const updatePromises = [];
  for (const salesPerson of SALESPERSONS) {
    const plans = groupedPlans[salesPerson] || [];
    let runningPlanQty = 0;
    let runningPlanValue = 0;
    let runningTotalQty = 0;
    let runningTotalValue = 0;
    
    for (const plan of plans) {
      // Only update if values changed
      const newPrevPlanQty = runningPlanQty;
      const newPrevPlanValue = runningPlanValue;
      const newPrevTotalQty = runningTotalQty;
      const newPrevTotalValue = runningTotalValue;
      
      if (plan.prevPlanQty !== newPrevPlanQty || 
          plan.prevPlanValue !== newPrevPlanValue ||
          plan.prevTotalQty !== newPrevTotalQty ||
          plan.prevTotalValue !== newPrevTotalValue) {
        
        plan.prevPlanQty = newPrevPlanQty;
        plan.prevPlanValue = newPrevPlanValue;
        plan.prevTotalQty = newPrevTotalQty;
        plan.prevTotalValue = newPrevTotalValue;
        updatePromises.push(plan.save());
      }
      
      runningPlanQty += parseFloat(plan.planQty) || 0;
      runningPlanValue += parseFloat(plan.planValue) || 0;
      
      const monthAchQty = (parseFloat(plan.w1Qty) || 0) + 
                          (parseFloat(plan.w2Qty) || 0) + 
                          (parseFloat(plan.w3Qty) || 0) + 
                          (parseFloat(plan.w4Qty) || 0);
      const monthAchVal = (parseFloat(plan.w1Value) || 0) + 
                          (parseFloat(plan.w2Value) || 0) + 
                          (parseFloat(plan.w3Value) || 0) + 
                          (parseFloat(plan.w4Value) || 0);
                          
      runningTotalQty += monthAchQty;
      runningTotalValue += monthAchVal;
    }
  }

  if (updatePromises.length > 0) {
    await Promise.all(updatePromises);
  }
}