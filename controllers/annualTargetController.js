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
      const PRODUCTS_F1 = ["Master Batch", "Compound", "Chemical", "NBR", "TPR", "LD"];
      
      const defaultRows = PRODUCTS_F1.map(product => ({
        financialYear,
        product,
        planSales: {
          Apr: 0, May: 0, Jun: 0, Jul: 0, Aug: 0, Sep: 0,
          Oct: 0, Nov: 0, Dec: 0, Jan: 0, Feb: 0, Mar: 0
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
