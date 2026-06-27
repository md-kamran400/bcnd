const ExcelJS = require("exceljs");
const multer = require("multer");
const path = require("path");
const { Op } = require("sequelize");
const Employee = require("../../models/Employee");
const User = require("../../models/User");
const authController = require("../authController");
const fs = require("fs").promises;
const sequelize = require("../../database").sequelize;

// Configure multer for Excel file upload
const excelStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, "..", "uploads", "excel"));
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, `employees-${uniqueSuffix}${path.extname(file.originalname)}`);
  },
});

const uploadExcel = multer({
  storage: excelStorage,
  fileFilter: (req, file, cb) => {
    const allowedTypes = [
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "application/vnd.ms-excel",
      "text/csv",
    ];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("Only Excel and CSV files are allowed"));
    }
  },
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
});

// Parse one row: same columns as User Management
const parseEmployeeRow = (row) => {
  const c = row.values || [];
  const employeeId = (c[1] ?? "").toString().trim();
  const employeeCode = (c[2] ?? "").toString().trim() || employeeId;
  const name = (c[3] ?? "").toString().trim();
  const email = (c[4] ?? "").toString().trim().toLowerCase();
  const role = (c[5] ?? "").toString().trim() || "Employee";
  const department = (c[6] ?? "").toString().trim();

  return {
    employeeId,
    employeeCode,
    name,
    email,
    role: ["Admin", "Employee", "Manager"].includes(role) ? role : "Employee",
    department,
  };
};

// Import employees from Excel
const importEmployees = async (req, res) => {
  const transaction = await sequelize.transaction();

  try {
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(req.file.path);

    const worksheet = workbook.getWorksheet(1);
    const rowsData = [];
    const errors = [];
    let successCount = 0;
    let failCount = 0;

    worksheet.eachRow({ includeEmpty: false }, (row, rowIndex) => {
      if (rowIndex === 1) return; // Skip header

      try {
        const data = parseEmployeeRow(row);
        if (!data.employeeId || !data.name || !data.email) {
          errors.push({
            row: rowIndex,
            employeeId: data.employeeId || "N/A",
            error: "Missing required: Employee ID, Name, Email",
          });
          failCount++;
          return;
        }
        rowsData.push({ ...data, rowIndex });
      } catch (err) {
        errors.push({ row: rowIndex, error: err.message });
        failCount++;
      }
    });

    for (const data of rowsData) {
      try {
        // Check if employee exists
        const existingEmployee = await Employee.findOne({
          where: {
            [Op.or]: [
              { employeeId: data.employeeId },
              { employeeCode: data.employeeCode },
            ],
            auditSoftDeleteIsDeleted: false,
          },
        });

        if (existingEmployee) {
          errors.push({
            row: data.rowIndex,
            employeeId: data.employeeId,
            error: `Employee ID or Code already exists`,
          });
          failCount++;
          continue;
        }

        const nameParts = data.name.split(" ").filter(Boolean);
        const firstName = nameParts[0] || "";
        const lastName = nameParts.slice(1).join(" ") || "";

        // Prepare employee data (flattened for PostgreSQL)
        const employeeData = {
          employeeId: data.employeeId,
          employeeCode: data.employeeCode,
          personLegalNameFirstName: firstName,
          personLegalNameLastName: lastName,
          personLegalNameFullName: data.name,
          contactWorkEmail: data.email,
          employmentDateOfJoining: new Date(),
          employmentType: "full-time",
          workerCategory: "permanent",
          lifecycleStatus: "active",
          auditCreatedBy: req.user?.employeeId || "SYSTEM_IMPORT",
          auditUpdatedBy: req.user?.employeeId || "SYSTEM_IMPORT",
          auditRecordVersion: 1,
          assignments: [
            {
              isPrimary: true,
              organization: {
                departmentName: data.department || "General",
                designationName: data.role,
                locationName: "Head Office",
              },
            },
          ],
        };

        const employee = await Employee.create(employeeData, { transaction });

        try {
          await authController.createUserForEmployee(employee, {
            role: data.role,
            department: data.department,
          });
        } catch (userErr) {
          console.error(
            "Import: user create/send email failed for",
            data.employeeId,
            userErr,
          );
          // Employee already created; count as success, user may already exist or email failed
        }

        successCount++;
      } catch (err) {
        errors.push({
          row: data.rowIndex,
          employeeId: data.employeeId,
          error: err.message,
        });
        failCount++;
      }
    }

    await transaction.commit();

    // Clean up uploaded file
    try {
      await fs.unlink(req.file.path);
    } catch (e) {
      console.error("Cleanup upload:", e);
    }

    return res.status(200).json({
      success: true,
      message: `Import completed: ${successCount} created, ${failCount} failed`,
      summary: {
        totalProcessed: rowsData.length,
        successCount,
        failCount,
        errors: errors.length,
      },
      createdCount: successCount,
      failedCount: failCount,
      errors: errors.slice(0, 10),
    });
  } catch (error) {
    await transaction.rollback();
    console.error("Error importing employees:", error);

    // Clean up uploaded file
    if (req.file) {
      try {
        await fs.unlink(req.file.path);
      } catch (e) {
        console.error("Cleanup upload:", e);
      }
    }

    return res.status(500).json({
      error: "Failed to import employees",
      details: error.message,
    });
  }
};

// Export employees to Excel
const exportEmployees = async (req, res) => {
  try {
    const employees = await Employee.findAll({
      where: {
        auditSoftDeleteIsDeleted: false,
      },
    });

    if (!employees || employees.length === 0) {
      return res.status(404).json({
        error: "No employees found to export",
        message: "Please add employees first before exporting",
      });
    }

    const employeeIds = employees.map((e) => e.employeeId);

    // Get associated users
    const users = await User.findAll({
      where: {
        employeeId: employeeIds,
      },
      attributes: ["employeeId", "role", "department"],
    });

    const usersByEmployeeId = {};
    users.forEach((u) => {
      usersByEmployeeId[u.employeeId] = u;
    });

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("Employees");

    worksheet.columns = [
      { header: "Employee ID", key: "employeeId", width: 15 },
      { header: "Employee Code", key: "employeeCode", width: 15 },
      { header: "Name", key: "name", width: 22 },
      { header: "Email", key: "email", width: 28 },
      { header: "Role", key: "role", width: 12 },
      { header: "Department", key: "department", width: 15 },
    ];

    worksheet.getRow(1).font = { bold: true };
    worksheet.getRow(1).fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FFE0E0E0" },
    };

    employees.forEach((emp) => {
      const fullName =
        emp.personLegalNameFullName ||
        [emp.personLegalNameFirstName, emp.personLegalNameLastName]
          .filter(Boolean)
          .join(" ")
          .trim() ||
        "";

      const user = usersByEmployeeId[emp.employeeId];

      worksheet.addRow({
        employeeId: emp.employeeId || "",
        employeeCode: emp.employeeCode || "",
        name: fullName,
        email: emp.contactWorkEmail || emp.contactPersonalEmail || "",
        role: user?.role || "",
        department:
          user?.department ||
          emp.assignments?.[0]?.organization?.departmentName ||
          "",
      });
    });

    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    );
    res.setHeader(
      "Content-Disposition",
      `attachment; filename=employees_${new Date().toISOString().split("T")[0]}.xlsx`,
    );
    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    console.error("Error exporting employees:", error);
    return res.status(500).json({
      error: "Failed to export employees",
      details:
        process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

// Download template
const downloadTemplate = async (req, res) => {
  try {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("Employee Template");

    const headers = [
      {
        header: "Employee ID*",
        key: "employeeId",
        width: 15,
        sample: "EMP_001",
      },
      {
        header: "Employee Code*",
        key: "employeeCode",
        width: 15,
        sample: "EMP_001",
      },
      { header: "Name*", key: "name", width: 22, sample: "John Doe" },
      {
        header: "Email*",
        key: "email",
        width: 28,
        sample: "john.doe@company.com",
      },
      { header: "Role*", key: "role", width: 12, sample: "Employee" },
      { header: "Department*", key: "department", width: 15, sample: "IT" },
    ];

    worksheet.columns = headers.map((h) => ({
      header: h.header,
      key: h.key,
      width: h.width,
    }));

    worksheet.getRow(1).font = { bold: true, color: { argb: "FFFFFFFF" } };
    worksheet.getRow(1).fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FF2E75B5" },
    };

    const sampleRow = headers.reduce((obj, h) => {
      obj[h.key] = h.sample;
      return obj;
    }, {});
    worksheet.addRow(sampleRow);

    const instructionsSheet = workbook.addWorksheet("Instructions");
    instructionsSheet.columns = [
      { header: "Field", key: "field", width: 20 },
      { header: "Description", key: "description", width: 50 },
      { header: "Required", key: "required", width: 10 },
    ];

    const instructions = [
      {
        field: "Employee ID",
        description: "Unique ID (e.g. EMP_001)",
        required: "Yes",
      },
      {
        field: "Employee Code",
        description: "Same as Employee ID if blank",
        required: "Yes",
      },
      { field: "Name", description: "Full name", required: "Yes" },
      {
        field: "Email",
        description: "Work email (user account)",
        required: "Yes",
      },
      {
        field: "Role",
        description: "Admin, Employee, or Manager",
        required: "Yes",
      },
      {
        field: "Department",
        description: "Finance, IT, or Quality",
        required: "Yes",
      },
    ];

    instructionsSheet.addRows(instructions);
    instructionsSheet.getRow(1).font = { bold: true };

    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    );
    res.setHeader(
      "Content-Disposition",
      "attachment; filename=employee_import_template.xlsx",
    );
    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    console.error("Error downloading template:", error);
    return res.status(500).json({
      error: "Failed to download template",
      details: error.message,
    });
  }
};

module.exports = {
  uploadExcel,
  importEmployees,
  exportEmployees,
  downloadTemplate,
};
