const express = require("express");
const multer = require("multer");
const path = require("path");

const router = express.Router();

const {authenticateToken, requireAdminOrManager, requireEmployee, requireAdmin } = require("../middleware/auth");
const employeeController = require("../controllers/employeeController");
const excelController = require("../controllers/docs_controller/excelController");
const documentController = require("../controllers/docs_controller/documentController");

// Multer storage for profile photos
const profileStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, '/var/www/hrms-uploads/profile');
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const safeName = req.user?.employeeId || "employee";
    cb(null, `${safeName}-${Date.now()}${ext}`);
  },
});

// Multer storage for documents
const documentStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, '/var/www/hrms-uploads/documents');
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const safeName = req.user?.employeeId || "employee";
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(7);
    cb(null, `${safeName}_${timestamp}_${random}${ext}`);
  },
});

const uploadProfile = multer({
  storage: profileStorage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
});

const uploadDocument = multer({
  storage: documentStorage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB per file
  fileFilter: (req, file, cb) => {
    const allowedTypes = [
      "application/pdf",
      "image/jpeg",
      "image/jpg",
      "image/png",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ];

    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(
        new Error(
          "Invalid file type. Only PDF, DOC, DOCX, JPG, PNG are allowed.",
        ),
      );
    }
  },
});

// ==========================================================================================================
// CURRENT USER ROUTES
// ==========================================================================================================

// Get currently logged-in employee's profile
router.get("/me", requireEmployee, employeeController.getMyProfile);

// Update currently logged-in employee's profile (limited fields)
router.patch("/me", requireEmployee, employeeController.updateMyProfile);

// Upload profile photo for current employee
router.post(
  "/me/photo",
  requireEmployee,
  uploadProfile.single("photo"),
  employeeController.uploadProfilePhoto,
);

// Update profile photo for current employee (replace)
router.put(
  "/me/photo",
  requireEmployee,
  uploadProfile.single("photo"),
  employeeController.updateProfilePhoto,
);

// Delete profile photo for current employee
router.delete(
  "/me/photo",
  requireEmployee,
  employeeController.deleteProfilePhoto,
);

// Document Management Routes for Current User
router.get("/me/documents", requireEmployee, documentController.getMyDocuments);

router.post(
  "/me/documents/upload",
  requireEmployee,
  uploadDocument.single("file"),
  documentController.uploadDocument,
);

router.post(
  "/me/documents/upload-multiple",
  requireEmployee,
  uploadDocument.array("files", 10),
  documentController.uploadMultipleDocuments,
);

router.get(
  "/me/documents/:documentId/view",
  requireEmployee,
  documentController.viewDocument,
);

router.delete(
  "/me/documents/:documentId",
  requireEmployee,
  documentController.deleteDocument,
);

router.put(
  "/me/documents/:documentId",
  requireEmployee,
  documentController.updateDocument,
);

router.get(
  "/me/documents/storage/info",
  requireEmployee,
  documentController.getStorageInfo,
);

// ==========================================================================================================
// EXCEL / BULK ROUTES
// ==========================================================================================================

router.get(
  "/export",
  authenticateToken,
  requireAdminOrManager,
  excelController.exportEmployees,
);

router.get(
  "/template",
  authenticateToken,
  requireAdminOrManager,
  excelController.downloadTemplate,
);

router.post(
  "/import",
  authenticateToken,
  requireAdminOrManager,
  excelController.uploadExcel.single("excelFile"),
  excelController.importEmployees,
);

// ==========================================================================================================
// ADMIN / GENERAL CRUD ROUTES
// ==========================================================================================================

// List all employees (Admin only)
router.get("/", requireAdminOrManager, employeeController.listEmployees);

// Create new employee and linked user
router.post("/with-user", requireAdmin, employeeController.createEmployeeWithUser);

// Create new employee only
router.post("/", requireAdmin, employeeController.createEmployee);

// Get by employeeId (Admin or owner)
router.get(
  "/:employeeId",
  authenticateToken,
  employeeController.getEmployeeByEmployeeId,
);

// Update by employeeId (Admin or owner)
router.put("/:employeeId", authenticateToken, employeeController.updateEmployee);

// Delete by employeeId (Admin only)
router.delete("/:employeeId", requireAdmin, employeeController.deleteEmployee);

// Get documents for a specific employeeId
router.get(
  "/:employeeId/documents",
  authenticateToken, 
  documentController.getEmployeeDocuments
);

// View specific document
router.get(
  "/:employeeId/documents/:documentId/view",
  authenticateToken,
  documentController.viewEmployeeDocument
);

module.exports = router;