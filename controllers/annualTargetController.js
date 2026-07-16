const AnnualTarget = require("../models/AnnualTarget");

/**
 * Form 1: Get Annual Targets by Financial Year
 * GET /api/sales/annual-target?financialYear=2026-27
 */
exports.getAnnualTargets = async (req, res) => {
  try {
    const { financialYear } = req.query; // e.g. "2026-27"
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
 * Form 1: Create or Upsert Annual Target
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

    // Link Form 1 to Form 2: sync targets divided equally across 5 salespersons
    await syncForm1ToForm2(target.financialYear, target.product, target.planSales);

    return res.json({ success: true, data: target });
  } catch (err) {
    console.error("Error in saveAnnualTarget:", err);
    return res.status(500).json({ success: false, error: "Failed to save annual target" });
  }
};

/**
 * Form 1: Update Annual Target by ID
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

    // Link Form 1 to Form 2: sync targets divided equally across 5 salespersons
    await syncForm1ToForm2(target.financialYear, target.product, target.planSales);

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

// --- HELPER FUNCTIONS FOR SYNCING FORM 1 TO FORM 2 ---

function getMonthKey(fy, monthAbbr) {
  const [startYearStr, endYearSuffix] = fy.split("-");
  const startYear = parseInt(startYearStr);
  const endYear = startYear + 1; // e.g. "2026-27" -> 2026 and 2027
  
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

async function recomputeCascades(product, salesPerson) {
  const MonthlySalesPlan = require("../models/MonthlySalesPlan");
  const plans = await MonthlySalesPlan.findAll({
    where: { product, salesPerson },
    order: [['month', 'ASC']]
  });
  
  let runningPlanQty = 0;
  let runningPlanValue = 0;
  let runningTotalQty = 0;
  let runningTotalValue = 0;
  
  for (const plan of plans) {
    plan.prevPlanQty = runningPlanQty;
    plan.prevPlanValue = runningPlanValue;
    plan.prevTotalQty = runningTotalQty;
    plan.prevTotalValue = runningTotalValue;
    
    await plan.save();
    
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

async function syncForm1ToForm2(financialYear, product, planSales) {
  const MonthlySalesPlan = require("../models/MonthlySalesPlan");
  const SALESPERSONS = ["Mani", "Sukhdev", "Sunil", "Suresh/ mahavir", "LS"];
  const MONTHS = ["Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec", "Jan", "Feb", "Mar"];
  
  for (const monthAbbr of MONTHS) {
    const monthKey = getMonthKey(financialYear, monthAbbr);
    if (!monthKey) continue;
    
    let targetQty = 0;
    let targetValueCr = 0;
    
    if (planSales && planSales[monthAbbr]) {
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
      const [plan, created] = await MonthlySalesPlan.findOrCreate({
        where: {
          month: monthKey,
          product,
          salesPerson
        },
        defaults: {
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
      
      if (!created) {
        plan.planQty = planQtyPerPerson;
        plan.planValue = planValuePerPerson;
        await plan.save();
      }
    }
  }

  // Cascading update for all 5 salespeople
  for (const salesPerson of SALESPERSONS) {
    await recomputeCascades(product, salesPerson);
  }
}
