const MonthlySalesPlan = require("../models/MonthlySalesPlan");
const sequelize = require("../database").sequelize;
const { Op } = require("sequelize");

// Standard Salespersons and Products for default seeding
const SALESPERSONS = ["Mani", "Sukhdev", "Sunil", "Suresh/ mahavir", "LS"];
const PRODUCTS = ["Master Batch", "Chemical", "PVC Compound", "TPR Compound", "LD", "NBR"];

// Mock Data for "2026-06" Seeding (corresponds to initialForm2Data from frontend)
const MOCK_JUNE_DATA = [
  // MASTERBATCH
  { month: "2026-06", product: "Master Batch", salesPerson: "Mani", planQty: 920, planValue: 65.0, w1Qty: 163, w1Value: 12.94 },
  { month: "2026-06", product: "Master Batch", salesPerson: "Sukhdev", planQty: 220, planValue: 16.0, w1Qty: 43, w1Value: 3.44 },
  { month: "2026-06", product: "Master Batch", salesPerson: "Sunil", planQty: 800, planValue: 60.0, w1Qty: 73, w1Value: 5.51 },
  { month: "2026-06", product: "Master Batch", salesPerson: "Suresh/ mahavir", planQty: 890, planValue: 75.0, w1Qty: 71, w1Value: 5.42 },
  { month: "2026-06", product: "Master Batch", salesPerson: "LS", planQty: 475, planValue: 40.0, w1Qty: 10, w1Value: 0.82 },
  // CHEMICAL
  { month: "2026-06", product: "Chemical", salesPerson: "Mani", planQty: 2500, planValue: 7.0, w1Qty: 508, w1Value: 3.38 },
  { month: "2026-06", product: "Chemical", salesPerson: "Sukhdev", planQty: 500, planValue: 10.0, w1Qty: 0, w1Value: 0.0 },
  { month: "2026-06", product: "Chemical", salesPerson: "Sunil", planQty: 1500, planValue: 10.0, w1Qty: 470, w1Value: 0.65 },
  { month: "2026-06", product: "Chemical", salesPerson: "Suresh/ mahavir", planQty: 3000, planValue: 12.0, w1Qty: 1024, w1Value: 6.0 },
  { month: "2026-06", product: "Chemical", salesPerson: "LS", planQty: 600, planValue: 5.0, w1Qty: 0, w1Value: 0.0 },
  // PVC COMPOUND
  { month: "2026-06", product: "PVC Compound", salesPerson: "Mani", planQty: 1800, planValue: 15.0, w1Qty: 320, w1Value: 2.65 },
  { month: "2026-06", product: "PVC Compound", salesPerson: "Sukhdev", planQty: 1200, planValue: 10.0, w1Qty: 250, w1Value: 2.08 },
  { month: "2026-06", product: "PVC Compound", salesPerson: "Sunil", planQty: 2200, planValue: 18.0, w1Qty: 410, w1Value: 3.35 },
  { month: "2026-06", product: "PVC Compound", salesPerson: "Suresh/ mahavir", planQty: 1500, planValue: 12.5, w1Qty: 280, w1Value: 2.3 },
  { month: "2026-06", product: "PVC Compound", salesPerson: "LS", planQty: 900, planValue: 8.0, w1Qty: 150, w1Value: 1.25 },
  // TPR COMPOUND
  { month: "2026-06", product: "TPR Compound", salesPerson: "Mani", planQty: 1400, planValue: 11.0, w1Qty: 210, w1Value: 1.65 },
  { month: "2026-06", product: "TPR Compound", salesPerson: "Sukhdev", planQty: 800, planValue: 7.0, w1Qty: 120, w1Value: 0.95 },
  { month: "2026-06", product: "TPR Compound", salesPerson: "Sunil", planQty: 1600, planValue: 13.0, w1Qty: 290, w1Value: 2.35 },
  { month: "2026-06", product: "TPR Compound", salesPerson: "Suresh/ mahavir", planQty: 1200, planValue: 9.5, w1Qty: 180, w1Value: 1.45 },
  { month: "2026-06", product: "TPR Compound", salesPerson: "LS", planQty: 600, planValue: 5.0, w1Qty: 90, w1Value: 0.75 },
  // LD
  { month: "2026-06", product: "LD", salesPerson: "Mani", planQty: 0, planValue: 0.0, w1Qty: 0, w1Value: 0.0 },
  { month: "2026-06", product: "LD", salesPerson: "Sukhdev", planQty: 0, planValue: 0.0, w1Qty: 0, w1Value: 0.0 },
  { month: "2026-06", product: "LD", salesPerson: "Sunil", planQty: 0, planValue: 0.0, w1Qty: 0, w1Value: 0.0 },
  { month: "2026-06", product: "LD", salesPerson: "Suresh/ mahavir", planQty: 0, planValue: 0.0, w1Qty: 0, w1Value: 0.0 },
  { month: "2026-06", product: "LD", salesPerson: "LS", planQty: 0, planValue: 0.0, w1Qty: 0, w1Value: 0.0 },
  // NBR
  { month: "2026-06", product: "NBR", salesPerson: "Mani", planQty: 0, planValue: 0.0, w1Qty: 0, w1Value: 0.0 },
  { month: "2026-06", product: "NBR", salesPerson: "Sukhdev", planQty: 0, planValue: 0.0, w1Qty: 0, w1Value: 0.0 },
  { month: "2026-06", product: "NBR", salesPerson: "Sunil", planQty: 0, planValue: 0.0, w1Qty: 0, w1Value: 0.0 },
  { month: "2026-06", product: "NBR", salesPerson: "Suresh/ mahavir", planQty: 0, planValue: 0.0, w1Qty: 0, w1Value: 0.0 },
  { month: "2026-06", product: "NBR", salesPerson: "LS", planQty: 0, planValue: 0.0, w1Qty: 0, w1Value: 0.0 }
];

/**
 * Get monthly plan, auto-seeding if records do not exist
 */
exports.getMonthlyPlan = async (req, res) => {
  const transaction = await sequelize.transaction();
  try {
    const { month } = req.query; // YYYY-MM
    if (!month || !/^\d{4}-\d{2}$/.test(month)) {
      await transaction.rollback();
      return res.status(400).json({ success: false, error: "Valid month (YYYY-MM) is required" });
    }

    // Check if records exist
    let plans = await MonthlySalesPlan.findAll({
      where: { month },
      order: [['product', 'ASC'], ['salesPerson', 'ASC']],
      transaction
    });

    if (plans.length > 0) {
      await transaction.commit();
      return res.json({ success: true, month, data: plans });
    }

    // Auto-seed/carryover logic since plans.length === 0
    console.log(`No records found for month ${month}. Initializing carryover/seeding...`);

    // Find the immediately preceding month
    const precedingRecord = await MonthlySalesPlan.findOne({
      where: { month: { [Op.lt]: month } },
      order: [['month', 'DESC']],
      transaction
    });

    if (precedingRecord) {
      const prevMonth = precedingRecord.month;
      const prevPlans = await MonthlySalesPlan.findAll({
        where: { month: prevMonth },
        transaction
      });

      console.log(`Carrying over records from ${prevMonth} to ${month}...`);
      const newPlansData = [];
      for (const prev of prevPlans) {
        const prevTotalPlanQty = (parseFloat(prev.prevPlanQty) || 0) + (parseFloat(prev.planQty) || 0);
        const prevTotalPlanVal = (parseFloat(prev.prevPlanValue) || 0) + (parseFloat(prev.planValue) || 0);
        const prevTotalAchQty = (parseFloat(prev.prevTotalQty) || 0) + 
                                (parseFloat(prev.w1Qty) || 0) + 
                                (parseFloat(prev.w2Qty) || 0) + 
                                (parseFloat(prev.w3Qty) || 0) + 
                                (parseFloat(prev.w4Qty) || 0);
        const prevTotalAchVal = (parseFloat(prev.prevTotalValue) || 0) + 
                                (parseFloat(prev.w1Value) || 0) + 
                                (parseFloat(prev.w2Value) || 0) + 
                                (parseFloat(prev.w3Value) || 0) + 
                                (parseFloat(prev.w4Value) || 0);
        
        const targets = await getForm1TargetQtyAndValue(month, prev.product);
        
        newPlansData.push({
          month,
          product: prev.product,
          salesPerson: prev.salesPerson,
          planQty: targets.planQty,
          planValue: targets.planValue,
          w1Qty: 0.00, w1Value: 0.00,
          w2Qty: 0.00, w2Value: 0.00,
          w3Qty: 0.00, w3Value: 0.00,
          w4Qty: 0.00, w4Value: 0.00,
          prevPlanQty: prevTotalPlanQty,
          prevPlanValue: prevTotalPlanVal,
          prevTotalQty: prevTotalAchQty,
          prevTotalValue: prevTotalAchVal,
          auditLogs: []
        });
      }

      plans = await MonthlySalesPlan.bulkCreate(newPlansData, { transaction });
    } else {
      if (month === "2026-06") {
        console.log(`Seeding initial mock data for 2026-06...`);
        plans = await MonthlySalesPlan.bulkCreate(MOCK_JUNE_DATA.map(d => ({
          ...d,
          w2Qty: 0, w2Value: 0, w3Qty: 0, w3Value: 0, w4Qty: 0, w4Value: 0,
          prevPlanQty: 0.00, prevPlanValue: 0.00,
          prevTotalQty: 0.00, prevTotalValue: 0.00,
          auditLogs: []
        })), { transaction });
      } else {
        console.log(`Seeding empty default rows for ${month}...`);
        const defaultData = [];
        for (const product of PRODUCTS) {
          const targets = await getForm1TargetQtyAndValue(month, product);
          for (const salesPerson of SALESPERSONS) {
            defaultData.push({
              month, product, salesPerson,
              planQty: targets.planQty,
              planValue: targets.planValue,
              w1Qty: 0, w1Value: 0.00,
              w2Qty: 0, w2Value: 0.00,
              w3Qty: 0, w3Value: 0.00,
              w4Qty: 0, w4Value: 0.00,
              prevPlanQty: 0.00, prevPlanValue: 0.00,
              prevTotalQty: 0.00, prevTotalValue: 0.00,
              auditLogs: []
            });
          }
        }
        plans = await MonthlySalesPlan.bulkCreate(defaultData, { transaction });
      }
    }

    await transaction.commit();
    return res.json({ success: true, month, data: plans });
  } catch (err) {
    await transaction.rollback();
    console.error("Error in getMonthlyPlan:", err);
    return res.status(500).json({ success: false, error: "Failed to load/initialize monthly sales plan" });
  }
};

/**
 * Create a new custom plan row and propagate it to subsequent months
 */
exports.createMonthlyPlan = async (req, res) => {
  const transaction = await sequelize.transaction();
  try {
    const { 
      month, product, salesPerson, 
      planQty, planValue,
      w1Qty, w1Value, w2Qty, w2Value,
      w3Qty, w3Value, w4Qty, w4Value
    } = req.body;

    if (!month || !product || !salesPerson) {
      await transaction.rollback();
      return res.status(400).json({ success: false, error: "Month, Product, and Salesperson are required" });
    }

    // Check if duplicate exists
    const duplicate = await MonthlySalesPlan.findOne({
      where: { month, product, salesPerson },
      transaction
    });
    if (duplicate) {
      await transaction.rollback();
      return res.status(400).json({ success: false, error: "Record already exists for this Representative, Product, and Month" });
    }

    // Calculate carryovers from previous month
    const prevMonthStr = getPreviousMonth(month);
    let prevPlanQty = 0;
    let prevPlanValue = 0;
    let prevTotalQty = 0;
    let prevTotalValue = 0;

    const prevRecord = await MonthlySalesPlan.findOne({
      where: { month: prevMonthStr, product, salesPerson },
      transaction
    });
    if (prevRecord) {
      prevPlanQty = (parseFloat(prevRecord.prevPlanQty) || 0) + (parseFloat(prevRecord.planQty) || 0);
      prevPlanValue = (parseFloat(prevRecord.prevPlanValue) || 0) + (parseFloat(prevRecord.planValue) || 0);
      prevTotalQty = (parseFloat(prevRecord.prevTotalQty) || 0) + 
                     (parseFloat(prevRecord.w1Qty) || 0) + 
                     (parseFloat(prevRecord.w2Qty) || 0) + 
                     (parseFloat(prevRecord.w3Qty) || 0) + 
                     (parseFloat(prevRecord.w4Qty) || 0);
      prevTotalValue = (parseFloat(prevRecord.prevTotalValue) || 0) + 
                       (parseFloat(prevRecord.w1Value) || 0) + 
                       (parseFloat(prevRecord.w2Value) || 0) + 
                       (parseFloat(prevRecord.w3Value) || 0) + 
                       (parseFloat(prevRecord.w4Value) || 0);
    }

    const newRecord = await MonthlySalesPlan.create({
      month, product, salesPerson,
      planQty: planQty || 0,
      planValue: planValue || 0,
      w1Qty: w1Qty || 0, w1Value: w1Value || 0.00,
      w2Qty: w2Qty || 0, w2Value: w2Value || 0.00,
      w3Qty: w3Qty || 0, w3Value: w3Value || 0.00,
      w4Qty: w4Qty || 0, w4Value: w4Value || 0.00,
      prevPlanQty,
      prevPlanValue,
      prevTotalQty,
      prevTotalValue,
      auditLogs: []
    }, { transaction });

    // Propagate row creation to subsequent months
    const subsequentMonths = await MonthlySalesPlan.findAll({
      attributes: [[sequelize.fn('DISTINCT', sequelize.col('month')), 'month']],
      where: { month: { [Op.gt]: month } },
      raw: true,
      transaction
    });

    const nextMonthPrevPlanQty = prevPlanQty + (planQty || 0);
    const nextMonthPrevPlanVal = prevPlanValue + (planValue || 0);

    const totalQty = (parseFloat(w1Qty) || 0) + 
                     (parseFloat(w2Qty) || 0) + 
                     (parseFloat(w3Qty) || 0) + 
                     (parseFloat(w4Qty) || 0);
    const totalVal = (parseFloat(w1Value) || 0) + 
                     (parseFloat(w2Value) || 0) + 
                     (parseFloat(w3Value) || 0) + 
                     (parseFloat(w4Value) || 0);

    const nextMonthPrevTotalQty = prevTotalQty + totalQty;
    const nextMonthPrevTotalVal = prevTotalValue + totalVal;

    for (const sub of subsequentMonths) {
      const subMonth = sub.month;
      const exists = await MonthlySalesPlan.findOne({
        where: { month: subMonth, product, salesPerson },
        transaction
      });
      if (!exists) {
        await MonthlySalesPlan.create({
          month: subMonth, product, salesPerson,
          planQty: 0, planValue: 0,
          w1Qty: 0, w1Value: 0,
          w2Qty: 0, w2Value: 0,
          w3Qty: 0, w3Value: 0,
          w4Qty: 0, w4Value: 0,
          prevPlanQty: nextMonthPrevPlanQty,
          prevPlanValue: nextMonthPrevPlanVal,
          prevTotalQty: nextMonthPrevTotalQty,
          prevTotalValue: nextMonthPrevTotalVal,
          auditLogs: []
        }, { transaction });
      }
    }

    await transaction.commit();
    return res.json({ success: true, data: newRecord });
  } catch (err) {
    await transaction.rollback();
    console.error("Error in createMonthlyPlan:", err);
    return res.status(500).json({ success: false, error: "Failed to create sales plan row" });
  }
};

/**
 * Edit a cell/row and cascade updates to all future months
 */
exports.updateMonthlyPlan = async (req, res) => {
  const transaction = await sequelize.transaction();
  try {
    const { id } = req.params;
    const bodyData = req.body;
    const { updatedBy, employeeId } = bodyData;

    const record = await MonthlySalesPlan.findByPk(id, { transaction });
    if (!record) {
      await transaction.rollback();
      return res.status(404).json({ success: false, error: "Record not found" });
    }

    const { month, product, salesPerson } = record;
    let changedField = null;
    let diff = 0;
    let oldValue = 0;
    let newValue = 0;

    if (bodyData.field !== undefined && bodyData.newValue !== undefined) {
      changedField = bodyData.field;
      oldValue = parseFloat(bodyData.oldValue) || 0;
      newValue = parseFloat(bodyData.newValue) || 0;
      diff = newValue - oldValue;
    } else {
      const watchFields = [
        'planQty', 'planValue',
        'w1Qty', 'w1Value', 'w2Qty', 'w2Value',
        'w3Qty', 'w3Value', 'w4Qty', 'w4Value'
      ];
      for (const field of watchFields) {
        if (bodyData[field] !== undefined) {
          const currentVal = parseFloat(record[field]) || 0;
          const newVal = parseFloat(bodyData[field]) || 0;
          if (currentVal !== newVal) {
            changedField = field;
            oldValue = currentVal;
            newValue = newVal;
            diff = newVal - currentVal;
            break;
          }
        }
      }
    }

    if (!changedField || diff === 0) {
      await transaction.commit();
      return res.json({ success: true, data: record });
    }

    // Update current month record
    record[changedField] = newValue;
    
    // Add audit log
    const auditLogEntry = {
      updatedBy: updatedBy || "System",
      employeeId: employeeId || "N/A",
      field: changedField,
      oldValue,
      newValue,
      timestamp: new Date().toISOString()
    };
    record.auditLogs = [...(record.auditLogs || []), auditLogEntry];
    await record.save({ transaction });

    // Cascade updates to future months' carryover totals
    if (changedField === 'planQty') {
      await MonthlySalesPlan.update(
        { prevPlanQty: sequelize.literal(`prev_plan_qty + ${diff}`) },
        {
          where: { salesPerson, product, month: { [Op.gt]: month } },
          transaction
        }
      );
    } else if (changedField === 'planValue') {
      await MonthlySalesPlan.update(
        { prevPlanValue: sequelize.literal(`prev_plan_value + ${diff}`) },
        {
          where: { salesPerson, product, month: { [Op.gt]: month } },
          transaction
        }
      );
    } else if (changedField.startsWith('w') && changedField.endsWith('Qty')) {
      await MonthlySalesPlan.update(
        { prevTotalQty: sequelize.literal(`prev_total_qty + ${diff}`) },
        {
          where: { salesPerson, product, month: { [Op.gt]: month } },
          transaction
        }
      );
    } else if (changedField.startsWith('w') && changedField.endsWith('Value')) {
      await MonthlySalesPlan.update(
        { prevTotalValue: sequelize.literal(`prev_total_value + ${diff}`) },
        {
          where: { salesPerson, product, month: { [Op.gt]: month } },
          transaction
        }
      );
    }

    await transaction.commit();
    return res.json({ success: true, data: record });
  } catch (err) {
    await transaction.rollback();
    console.error("Error in updateMonthlyPlan:", err);
    return res.status(500).json({ success: false, error: "Failed to update cell and cascade changes" });
  }
};

/**
 * Delete a row, cascade subtraction of its values to future months
 */
exports.deleteMonthlyPlan = async (req, res) => {
  const transaction = await sequelize.transaction();
  try {
    const { id } = req.params;

    const record = await MonthlySalesPlan.findByPk(id, { transaction });
    if (!record) {
      await transaction.rollback();
      return res.status(404).json({ success: false, error: "Record not found" });
    }

    const { month, product, salesPerson } = record;
    
    // Calculate cumulative contributions to deduct
    const deletedCumulativePlanQty = (parseFloat(record.prevPlanQty) || 0) + (parseFloat(record.planQty) || 0);
    const deletedCumulativePlanValue = (parseFloat(record.prevPlanValue) || 0) + (parseFloat(record.planValue) || 0);
    const deletedCumulativeTotalQty = (parseFloat(record.prevTotalQty) || 0) + 
                                     (parseFloat(record.w1Qty) || 0) + 
                                     (parseFloat(record.w2Qty) || 0) + 
                                     (parseFloat(record.w3Qty) || 0) + 
                                     (parseFloat(record.w4Qty) || 0);
    const deletedCumulativeTotalValue = (parseFloat(record.prevTotalValue) || 0) + 
                                       (parseFloat(record.w1Value) || 0) + 
                                       (parseFloat(record.w2Value) || 0) + 
                                       (parseFloat(record.w3Value) || 0) + 
                                       (parseFloat(record.w4Value) || 0);

    // Subtract this record's contribution from future months' carryovers
    await MonthlySalesPlan.update(
      {
        prevPlanQty: sequelize.literal(`prev_plan_qty - ${deletedCumulativePlanQty}`),
        prevPlanValue: sequelize.literal(`prev_plan_value - ${deletedCumulativePlanValue}`),
        prevTotalQty: sequelize.literal(`prev_total_qty - ${deletedCumulativeTotalQty}`),
        prevTotalValue: sequelize.literal(`prev_total_value - ${deletedCumulativeTotalValue}`)
      },
      {
        where: {
          salesPerson,
          product,
          month: { [Op.gt]: month }
        },
        transaction
      }
    );

    // Delete current month record
    await record.destroy({ transaction });

    await transaction.commit();
    return res.json({ success: true, message: "Record deleted and carryovers adjusted successfully" });
  } catch (err) {
    await transaction.rollback();
    console.error("Error in deleteMonthlyPlan:", err);
    return res.status(500).json({ success: false, error: "Failed to delete row" });
  }
};

/**
 * Retrieve compiled sales analytics for the dashboard
 */
exports.getSalesAnalytics = async (req, res) => {
  try {
    const { month } = req.query; // YYYY-MM
    if (!month || !/^\d{4}-\d{2}$/.test(month)) {
      return res.status(400).json({ success: false, error: "Valid month (YYYY-MM) is required" });
    }

    const currentPlans = await MonthlySalesPlan.findAll({ where: { month } });

    // 1. Compute summary stats using cumulative totals
    let totalPlanQty = 0;
    let totalAchievedQty = 0;
    let totalPlanValue = 0;
    let totalAchievedValue = 0;

    currentPlans.forEach(row => {
      const planQty = (parseFloat(row.prevPlanQty) || 0) + (parseFloat(row.planQty) || 0);
      const planVal = (parseFloat(row.prevPlanValue) || 0) + (parseFloat(row.planValue) || 0);
      const achQty = (parseFloat(row.prevTotalQty) || 0) + 
                     (parseFloat(row.w1Qty) || 0) + 
                     (parseFloat(row.w2Qty) || 0) + 
                     (parseFloat(row.w3Qty) || 0) + 
                     (parseFloat(row.w4Qty) || 0);
      const achVal = (parseFloat(row.prevTotalValue) || 0) + 
                     (parseFloat(row.w1Value) || 0) + 
                     (parseFloat(row.w2Value) || 0) + 
                     (parseFloat(row.w3Value) || 0) + 
                     (parseFloat(row.w4Value) || 0);

      totalPlanQty += planQty;
      totalAchievedQty += achQty;
      totalPlanValue += planVal;
      totalAchievedValue += achVal;
    });

    const qtyPercentage = totalPlanQty > 0 ? (totalAchievedQty / totalPlanQty) * 100 : 0;
    const valPercentage = totalPlanValue > 0 ? (totalAchievedValue / totalPlanValue) * 100 : 0;

    const summaryStats = {
      totalPlanQty,
      totalAchievedQty,
      qtyPercentage: Math.round(qtyPercentage * 10) / 10,
      totalPlanValue: Math.round(totalPlanValue * 100) / 100,
      totalAchievedValue: Math.round(totalAchievedValue * 100) / 100,
      valPercentage: Math.round(valPercentage * 10) / 10
    };

    // 2. Compute product-wise breakdown using cumulative totals
    const productData = PRODUCTS.map(prod => {
      const prodRows = currentPlans.filter(r => r.product === prod);
      let planQty = 0;
      let achQty = 0;
      let planValue = 0;
      let achValue = 0;
      let w1Qty = 0, w2Qty = 0, w3Qty = 0, w4Qty = 0;

      prodRows.forEach(r => {
        planQty += (parseFloat(r.prevPlanQty) || 0) + (parseFloat(r.planQty) || 0);
        planValue += (parseFloat(r.prevPlanValue) || 0) + (parseFloat(r.planValue) || 0);

        achQty += (parseFloat(r.prevTotalQty) || 0) + 
                  (parseFloat(r.w1Qty) || 0) + 
                  (parseFloat(r.w2Qty) || 0) + 
                  (parseFloat(r.w3Qty) || 0) + 
                  (parseFloat(r.w4Qty) || 0);
        
        achValue += (parseFloat(r.prevTotalValue) || 0) + 
                    (parseFloat(r.w1Value) || 0) + 
                    (parseFloat(r.w2Value) || 0) + 
                    (parseFloat(r.w3Value) || 0) + 
                    (parseFloat(r.w4Value) || 0);

        // We sum raw dispatches of the weeks for the product
        w1Qty += parseFloat(r.w1Qty) || 0;
        w2Qty += parseFloat(r.w2Qty) || 0;
        w3Qty += parseFloat(r.w3Qty) || 0;
        w4Qty += parseFloat(r.w4Qty) || 0;
      });

      const achQtyPct = planQty > 0 ? Math.round((achQty / planQty) * 100) : 0;
      const achValPct = planValue > 0 ? Math.round((achValue / planValue) * 100) : 0;

      return {
        name: prod,
        planQty,
        achQty,
        achQtyPct,
        planValue,
        achValue,
        achValPct,
        w1Qty,
        w2Qty,
        w3Qty,
        w4Qty
      };
    });

    // 3. Compute weekly trend (since week actuals are raw incremental dispatches, we sum them directly)
    const weeks = ["W1", "W2", "W3", "W4"];
    const weeklyTrendData = weeks.map((w, index) => {
      const idx = index + 1;
      const dataPoint = { name: `Week ${idx}` };
      PRODUCTS.forEach(prod => {
        const prodRows = currentPlans.filter(r => r.product === prod);
        let weekTotal = 0;
        prodRows.forEach(r => {
          weekTotal += parseFloat(r[`w${idx}Qty`]) || 0;
        });
        dataPoint[prod] = weekTotal;
      });
      return dataPoint;
    });

    // 4. Salesperson Performance comparison (cumulative targets and achievements)
    const repPerformanceData = SALESPERSONS.map(rep => {
      const repRows = currentPlans.filter(r => r.salesPerson === rep);
      let planQty = 0;
      let achQty = 0;

      repRows.forEach(r => {
        planQty += (parseFloat(r.prevPlanQty) || 0) + (parseFloat(r.planQty) || 0);
        achQty += (parseFloat(r.prevTotalQty) || 0) + 
                  (parseFloat(r.w1Qty) || 0) + 
                  (parseFloat(r.w2Qty) || 0) + 
                  (parseFloat(r.w3Qty) || 0) + 
                  (parseFloat(r.w4Qty) || 0);
      });

      return {
        name: rep,
        "Target Qty": planQty,
        "Achieved Qty": achQty
      };
    });

    // 5. YOY Trend comparison (Sales Qty converted to Metric Tons (MT))
    const allPlans = await MonthlySalesPlan.findAll();
    const months = [
      { name: "April", key: "2026-04", val25_26: 95.35 },
      { name: "May", key: "2026-05", val25_26: 87.07 },
      { name: "June", key: "2026-06", val25_26: 89.40 },
      { name: "July", key: "2026-07", val25_26: 115.41 },
      { name: "Aug", key: "2026-08", val25_26: 112.67 },
      { name: "Sep", key: "2026-09", val25_26: 128.90 },
      { name: "Oct", key: "2026-10", val25_26: 105.80 },
      { name: "Nov", key: "2026-11", val25_26: 107.20 },
      { name: "Dec", key: "2026-12", val25_26: 111.68 },
      { name: "Jan", key: "2027-01", val25_26: 98.14 },
      { name: "Feb", key: "2027-02", val25_26: 116.28 },
      { name: "Mar", key: "2027-03", val25_26: 82.80 }
    ];

    const yoyTrendData = months.map(m => {
      const monthRecords = allPlans.filter(r => r.month === m.key);
      let totalMT = 0;

      monthRecords.forEach(row => {
        // Incremental dispatch is the sum of raw week entries w1 + w2 + w3 + w4
        const incrementalQty = (parseFloat(row.w1Qty) || 0) + 
                               (parseFloat(row.w2Qty) || 0) + 
                               (parseFloat(row.w3Qty) || 0) + 
                               (parseFloat(row.w4Qty) || 0);

        if (row.product === "Master Batch") {
          totalMT += (incrementalQty * 25) / 1000;
        } else {
          totalMT += incrementalQty / 1000;
        }
      });

      const qty26_27 = Math.round(totalMT * 100) / 100;

      return {
        month: m.name,
        "2025-26": m.val25_26,
        "2026-27": qty26_27
      };
    });

    const [selYear, selMonthNum] = month.split("-").map(Number);
    let startYear = selYear;
    if (selMonthNum < 4) {
      startYear = selYear - 1;
    }
    const endYear = startYear + 1;
    const financialYear = `${startYear}-${String(endYear).slice(-2)}`;

    const fyMonths = [
      { name: "Apr", key: `${startYear}-04`, label: "April" },
      { name: "May", key: `${startYear}-05`, label: "May" },
      { name: "Jun", key: `${startYear}-06`, label: "June" },
      { name: "Jul", key: `${startYear}-07`, label: "July" },
      { name: "Aug", key: `${startYear}-08`, label: "August" },
      { name: "Sep", key: `${startYear}-09`, label: "September" },
      { name: "Oct", key: `${startYear}-10`, label: "October" },
      { name: "Nov", key: `${startYear}-11`, label: "November" },
      { name: "Dec", key: `${startYear}-12`, label: "December" },
      { name: "Jan", key: `${endYear}-01`, label: "January" },
      { name: "Feb", key: `${endYear}-02`, label: "February" },
      { name: "Mar", key: `${endYear}-03`, label: "March" }
    ];

    const selectedMonthIndex = fyMonths.findIndex(m => m.key === month);

    const AnnualTarget = require("../models/AnnualTarget");
    const annualTargets = await AnnualTarget.findAll({
      where: { financialYear }
    });

    const allYearPlans = await MonthlySalesPlan.findAll({
      where: {
        month: {
          [Op.between]: [`${startYear}-04`, `${endYear}-03`]
        }
      }
    });

    const PRODUCT_VALUE_RATES = {
      "Master Batch": 0.07,
      "Chemical": 0.0028,
      "PVC Compound": 0.0083,
      "Compound": 0.0083,
      "TPR Compound": 0.0078,
      "TPR": 0.0078,
      "LD": 0.0075,
      "NBR": 0.015
    };

    const getHistorical25_26Data = (monthAbbr) => {
      const mtTotals = {
        Apr: 95.35, May: 87.07, Jun: 89.40, Jul: 115.41, Aug: 112.67, Sep: 128.90,
        Oct: 105.80, Nov: 107.20, Dec: 111.68, Jan: 98.14, Feb: 116.28, Mar: 82.80
      };
      const totalMT = mtTotals[monthAbbr] || 100;
      
      const mbQty = totalMT * 0.30 * 40;
      const chemQty = totalMT * 0.25 * 1000;
      const pvcQty = totalMT * 0.20 * 1000;
      const tprQty = totalMT * 0.15 * 1000;
      const ldQty = totalMT * 0.05 * 1000;
      const nbrQty = totalMT * 0.05 * 1000;
      
      return {
        "Master Batch": { qty: mbQty, value: mbQty * PRODUCT_VALUE_RATES["Master Batch"] },
        "Chemical": { qty: chemQty, value: chemQty * PRODUCT_VALUE_RATES["Chemical"] },
        "PVC Compound": { qty: pvcQty, value: pvcQty * PRODUCT_VALUE_RATES["PVC Compound"] },
        "TPR Compound": { qty: tprQty, value: tprQty * PRODUCT_VALUE_RATES["TPR Compound"] },
        "LD": { qty: ldQty, value: ldQty * PRODUCT_VALUE_RATES["LD"] },
        "NBR": { qty: nbrQty, value: nbrQty * PRODUCT_VALUE_RATES["NBR"] }
      };
    };

    const productsList = ["Master Batch", "Chemical", "PVC Compound", "TPR Compound", "LD", "NBR"];

    const calculatedData = productsList.map(prod => {
      let annualTargetQty = 0;
      let annualTargetValue = 0;
      let ytdTargetQty = 0;
      let ytdTargetValue = 0;
      let ytdAchievedQty = 0;
      let ytdAchievedValue = 0;
      
      const targetRecord = annualTargets.find(t => t.product.toLowerCase().replace(/[^a-z]/g, "") === prod.toLowerCase().replace(/[^a-z]/g, ""));
      
      fyMonths.forEach((m, idx) => {
        const monthTargetQty = targetRecord ? (parseFloat(targetRecord.planSales?.[m.name]) || 0) : 0;
        const monthTargetValue = monthTargetQty * (PRODUCT_VALUE_RATES[prod] || 0.01);
        
        annualTargetQty += monthTargetQty;
        annualTargetValue += monthTargetValue;
        
        if (idx <= selectedMonthIndex) {
          ytdTargetQty += monthTargetQty;
          ytdTargetValue += monthTargetValue;
        }
        
        const monthPlans = allYearPlans.filter(p => p.month === m.key && p.product.toLowerCase().replace(/[^a-z]/g, "") === prod.toLowerCase().replace(/[^a-z]/g, ""));
        let monthAchQty = 0;
        let monthAchVal = 0;
        monthPlans.forEach(p => {
          monthAchQty += (parseFloat(p.w1Qty) || 0) + (parseFloat(p.w2Qty) || 0) + (parseFloat(p.w3Qty) || 0) + (parseFloat(p.w4Qty) || 0);
          monthAchVal += (parseFloat(p.w1Value) || 0) + (parseFloat(p.w2Value) || 0) + (parseFloat(p.w3Value) || 0) + (parseFloat(p.w4Value) || 0);
        });
        
        if (idx <= selectedMonthIndex) {
          ytdAchievedQty += monthAchQty;
          ytdAchievedValue += monthAchVal;
        }
      });

      return {
        product: prod,
        annualTargetQty,
        annualTargetValue: Math.round(annualTargetValue * 100) / 100,
        ytdTargetQty,
        ytdTargetValue: Math.round(ytdTargetValue * 100) / 100,
        ytdAchievedQty,
        ytdAchievedValue: Math.round(ytdAchievedValue * 100) / 100
      };
    });

    const overallSalesValue = calculatedData.map(d => ({
      product: d.product,
      "Annual Target": d.annualTargetValue,
      "YTD Target": d.ytdTargetValue,
      "YTD Achievement": d.ytdAchievedValue
    }));

    const annualYtdComparison = calculatedData.map(d => ({
      product: d.product,
      annualTargetQty: d.annualTargetQty,
      annualTargetValue: d.annualTargetValue,
      ytdTargetQty: d.ytdTargetQty,
      ytdTargetValue: d.ytdTargetValue,
      ytdAchievedQty: d.ytdAchievedQty,
      ytdAchievedValue: d.ytdAchievedValue
    }));

    const salesValueTrend = {
      combined: fyMonths.map((m, idx) => {
        const histData = getHistorical25_26Data(m.name);
        let lastYearQty = 0;
        let lastYearValue = 0;
        productsList.forEach(p => {
          lastYearQty += histData[p].qty;
          lastYearValue += histData[p].value;
        });
        
        let thisYearQty = 0;
        let thisYearValue = 0;
        const monthPlans = allYearPlans.filter(p => p.month === m.key);
        monthPlans.forEach(p => {
          thisYearQty += (parseFloat(p.w1Qty) || 0) + (parseFloat(p.w2Qty) || 0) + (parseFloat(p.w3Qty) || 0) + (parseFloat(p.w4Qty) || 0);
          thisYearValue += (parseFloat(p.w1Value) || 0) + (parseFloat(p.w2Value) || 0) + (parseFloat(p.w3Value) || 0) + (parseFloat(p.w4Value) || 0);
        });
        
        return {
          month: m.name,
          lastYearQty: Math.round(lastYearQty * 100) / 100,
          lastYearValue: Math.round(lastYearValue * 100) / 100,
          thisYearQty: Math.round(thisYearQty * 100) / 100,
          thisYearValue: Math.round(thisYearValue * 100) / 100
        };
      }),
      productWise: {}
    };

    productsList.forEach(prod => {
      salesValueTrend.productWise[prod] = fyMonths.map((m, idx) => {
        const histData = getHistorical25_26Data(m.name);
        const lastYearQty = histData[prod].qty;
        const lastYearValue = histData[prod].value;
        
        let thisYearQty = 0;
        let thisYearValue = 0;
        const monthPlans = allYearPlans.filter(p => p.month === m.key && p.product.toLowerCase().replace(/[^a-z]/g, "") === prod.toLowerCase().replace(/[^a-z]/g, ""));
        monthPlans.forEach(p => {
          thisYearQty += (parseFloat(p.w1Qty) || 0) + (parseFloat(p.w2Qty) || 0) + (parseFloat(p.w3Qty) || 0) + (parseFloat(p.w4Qty) || 0);
          thisYearValue += (parseFloat(p.w1Value) || 0) + (parseFloat(p.w2Value) || 0) + (parseFloat(p.w3Value) || 0) + (parseFloat(p.w4Value) || 0);
        });
        
        return {
          month: m.name,
          lastYearQty: Math.round(lastYearQty * 100) / 100,
          lastYearValue: Math.round(lastYearValue * 100) / 100,
          thisYearQty: Math.round(thisYearQty * 100) / 100,
          thisYearValue: Math.round(thisYearValue * 100) / 100
        };
      });
    });

    const growthComparison = {
      combined: salesValueTrend.combined.map(t => {
        const qtyGrowth = t.lastYearQty > 0 ? ((t.thisYearQty - t.lastYearQty) / t.lastYearQty) * 100 : 0;
        const valueGrowth = t.lastYearValue > 0 ? ((t.thisYearValue - t.lastYearValue) / t.lastYearValue) * 100 : 0;
        return {
          month: t.month,
          qtyGrowth: Math.round(qtyGrowth * 10) / 10,
          valueGrowth: Math.round(valueGrowth * 10) / 10
        };
      }),
      productWise: {}
    };

    productsList.forEach(prod => {
      growthComparison.productWise[prod] = salesValueTrend.productWise[prod].map(t => {
        const qtyGrowth = t.lastYearQty > 0 ? ((t.thisYearQty - t.lastYearQty) / t.lastYearQty) * 100 : 0;
        const valueGrowth = t.lastYearValue > 0 ? ((t.thisYearValue - t.lastYearValue) / t.lastYearValue) * 100 : 0;
        return {
          month: t.month,
          qtyGrowth: Math.round(qtyGrowth * 10) / 10,
          valueGrowth: Math.round(valueGrowth * 10) / 10
        };
      });
    });

    return res.json({
      success: true,
      data: {
        summaryStats,
        productData,
        weeklyTrendData,
        repPerformanceData,
        yoyTrendData,
        analyticsDetails: {
          overallSalesValue,
          annualYtdComparison,
          salesValueTrend,
          growthComparison
        }
      }
    });
  } catch (err) {
    console.error("Error in getSalesAnalytics:", err);
    return res.status(500).json({ success: false, error: "Failed to generate sales analytics" });
  }
};

// Helper function to get previous month string YYYY-MM
function getPreviousMonth(monthStr) {
  const [year, month] = monthStr.split("-").map(Number);
  let prevYear = year;
  let prevMonth = month - 1;
  if (prevMonth === 0) {
    prevMonth = 12;
    prevYear = year - 1;
  }
  return `${prevYear}-${String(prevMonth).padStart(2, '0')}`;
}

async function getForm1TargetQtyAndValue(monthKey, product) {
  const AnnualTarget = require("../models/AnnualTarget");
  const [year, monthNum] = monthKey.split("-").map(Number);
  let startYear = year;
  let endYear = year + 1;
  const monthAbbrs = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const monthAbbr = monthAbbrs[monthNum - 1];
  
  if (monthNum < 4) {
    startYear = year - 1;
    endYear = year;
  }
  const financialYear = `${startYear}-${String(endYear).slice(-2)}`;
  
  const target = await AnnualTarget.findOne({
    where: { financialYear, product }
  });
  
  if (!target || !target.planSales || !target.planSales[monthAbbr]) {
    return { planQty: 0, planValue: 0 };
  }
  
  const monthData = target.planSales[monthAbbr];
  let qty = 0;
  let valCr = 0;
  if (typeof monthData === 'object') {
    qty = parseFloat(monthData.qty) || 0;
    valCr = parseFloat(monthData.value) || 0;
  } else {
    qty = parseFloat(monthData) || 0;
  }
  
  let finalQty = qty;
  if (product === "Master Batch") {
    finalQty = qty / 35;
  }
  
  return {
    planQty: finalQty / 5,
    planValue: (valCr * 100) / 5
  };
}

exports.getAnnualData = async (req, res) => {
  try {
    const { financialYear } = req.query;
    if (!financialYear || !/^\d{4}-\d{2}$/.test(financialYear)) {
      return res.status(400).json({ success: false, error: "Valid financialYear (YYYY-YY) is required" });
    }

    const [startYearStr, endYearStr] = financialYear.split("-");
    const startYear = parseInt(startYearStr, 10);
    const endYear = 2000 + parseInt(endYearStr, 10);

    const months = [];
    for (let m = 4; m <= 12; m++) {
      months.push(`${startYear}-${String(m).padStart(2, '0')}`);
    }
    for (let m = 1; m <= 3; m++) {
      months.push(`${endYear}-${String(m).padStart(2, '0')}`);
    }

    const plans = await MonthlySalesPlan.findAll({
      where: {
        month: {
          [Op.in]: months
        }
      }
    });

    return res.json({ success: true, data: plans });
  } catch (error) {
    console.error("Error in getAnnualData controller:", error);
    return res.status(500).json({ success: false, error: "Internal server error" });
  }
};
