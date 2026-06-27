const path = require("path");
const fs = require("fs").promises;
const fsSync = require("fs");
const { Op } = require("sequelize");
const Employee = require("../../models/Employee");

// Document type validation
const VALID_DOCUMENT_TYPES = {
  // Personal Documents
  aadhar_card: { category: "Personal", label: "Aadhar Card" },
  pan_card: { category: "Personal", label: "PAN Card" },
  passport: { category: "Personal", label: "Passport" },
  voter_id: { category: "Personal", label: "Voter ID" },
  driving_license: { category: "Personal", label: "Driving License" },

  // Educational Documents
  "10th_marksheet": { category: "Certifications", label: "10th Marksheet" },
  "12th_marksheet": { category: "Certifications", label: "12th Marksheet" },
  diploma_certificate: {
    category: "Certifications",
    label: "Diploma Certificate",
  },
  degree_certificate: {
    category: "Certifications",
    label: "Degree Certificate",
  },
  post_graduate_degree: {
    category: "Certifications",
    label: "Post Graduate Degree",
  },
  professional_certification: {
    category: "Certifications",
    label: "Professional Certification",
  },

  // Employment Documents
  appointment_letter: { category: "Employment", label: "Appointment Letter" },
  experience_letter: { category: "Employment", label: "Experience Letter" },
  relieving_letter: { category: "Employment", label: "Relieving Letter" },
  salary_slips: { category: "Employment", label: "Salary Slips" },
  form_16: { category: "Employment", label: "Form 16" },
  offer_letter: { category: "Employment", label: "Offer Letter" },

  // Legal Documents
  police_verification: { category: "Legal", label: "Police Verification" },
  background_check: { category: "Legal", label: "Background Check Report" },
  nda_agreement: { category: "Legal", label: "NDA Agreement" },
  employment_contract: { category: "Legal", label: "Employment Contract" },

  // Other Documents
  bank_proof: { category: "Other", label: "Bank Proof" },
  photograph: { category: "Other", label: "Photograph" },
  signature: { category: "Other", label: "Signature" },
  other: { category: "Other", label: "Other" },
};

// Ensure upload directory exists
const ensureUploadDir = async () => {
  const uploadDir = path.join("/var/www/hrms-uploads/documents");
  try {
    await fs.access(uploadDir);
  } catch {
    await fs.mkdir(uploadDir, { recursive: true });
  }
  return uploadDir;
};

// Helper function to validate document type and category
const validateDocumentType = (subCategory, category) => {
  if (!subCategory) {
    return { isValid: false, error: "Document type is required" };
  }

  const docTypeInfo = VALID_DOCUMENT_TYPES[subCategory];
  if (!docTypeInfo) {
    return { isValid: false, error: `Invalid document type: ${subCategory}` };
  }

  if (category && docTypeInfo.category !== category) {
    return {
      isValid: false,
      error: `Document type "${subCategory}" belongs to "${docTypeInfo.category}" category, not "${category}"`,
    };
  }

  return { isValid: true, docTypeInfo };
};

// Helper function to generate safe filename
const generateSafeFileName = (employeeId, originalName) => {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(7);
  const extension = path.extname(originalName);
  const baseName = path
    .basename(originalName, extension)
    .replace(/[^a-zA-Z0-9]/g, "_")
    .substring(0, 50);
  return `${employeeId}_${timestamp}_${random}_${baseName}${extension}`;
};

// ==================================================================================
// CURRENT USER ACTIONS (My Documents)
// ==================================================================================

// Get employee documents (For the logged-in user)
const getMyDocuments = async (req, res) => {
  try {
    const employeeId = req.user?.employeeId;

    if (!employeeId) {
      return res
        .status(400)
        .json({ error: "Authenticated user does not have an employeeId" });
    }

    const employee = await Employee.findOne({
      where: {
        employeeId,
        auditSoftDeleteIsDeleted: false,
      },
    });

    if (!employee) {
      return res.status(404).json({ error: "Employee not found" });
    }

    const documents = employee.documentsUploadedDocuments || [];
    const storageUsage = employee.documentsStorageUsage || {
      used: 0,
      limit: 50 * 1024 * 1024,
    };

    // Enhance documents with type labels
    const enhancedDocuments = documents.map((doc) => ({
      ...doc,
      typeLabel:
        VALID_DOCUMENT_TYPES[doc.subCategory]?.label ||
        doc.subCategory ||
        "Unknown",
    }));

    return res.json({
      success: true,
      documents: enhancedDocuments,
      storageUsage,
      totalDocuments: documents.length,
    });
  } catch (err) {
    console.error("Error fetching documents:", err);
    return res.status(500).json({ error: "Failed to fetch documents" });
  }
};

// ==================================================================================
// ADMIN / MANAGER ACTIONS (View Others)
// ==================================================================================

// Get documents for a specific employeeId (Admin/Manager view)
const getEmployeeDocuments = async (req, res) => {
  try {
    const { employeeId } = req.params;

    // Security Check: Only Admin or the employee themselves can access
    if (req.user.role !== "Admin" && req.user.employeeId !== employeeId) {
      return res.status(403).json({ error: "Access denied" });
    }

    // Find the Employee
    const employee = await Employee.findOne({
      where: {
        employeeId,
        auditSoftDeleteIsDeleted: false,
      },
      attributes: ["documentsUploadedDocuments", "documentsStorageUsage"],
    });

    if (!employee) {
      return res.status(404).json({ error: "Employee not found" });
    }

    const documents = employee.documentsUploadedDocuments || [];
    const storageUsage = employee.documentsStorageUsage || {
      used: 0,
      limit: 50 * 1024 * 1024,
    };

    // Enhance documents with type labels
    const enhancedDocuments = documents.map((doc) => ({
      ...doc,
      typeLabel:
        VALID_DOCUMENT_TYPES[doc.subCategory]?.label ||
        doc.subCategory ||
        "Unknown",
    }));

    return res.json({
      success: true,
      documents: enhancedDocuments,
      storageUsage,
      totalDocuments: documents.length,
    });
  } catch (err) {
    console.error("Error fetching employee documents:", err);
    return res.status(500).json({ error: "Failed to fetch documents" });
  }
};

// View a specific document for a specific employee (Admin/Manager view)
const viewEmployeeDocument = async (req, res) => {
  try {
    const { employeeId, documentId } = req.params;

    // Security Check
    if (req.user.role !== "Admin" && req.user.employeeId !== employeeId) {
      return res.status(403).json({ error: "Access denied" });
    }

    const employee = await Employee.findOne({
      where: {
        employeeId,
        auditSoftDeleteIsDeleted: false,
      },
    });

    if (!employee) {
      return res.status(404).json({ error: "Employee not found" });
    }

    const document = employee.documentsUploadedDocuments?.find(
      (doc) => doc.documentId === documentId,
    );

    if (!document) {
      return res.status(404).json({ error: "Document not found" });
    }

    // Construct absolute path
    const filePath = path.join(
      "/var/www/hrms-uploads/documents",
      document.fileName,
    );

    // Check if file exists
    try {
      await fs.access(filePath);
    } catch (err) {
      console.error("File missing at path:", filePath);
      return res.status(404).json({ error: "File not found on server" });
    }

    // Send file
    res.setHeader(
      "Content-Type",
      document.mimeType || "application/octet-stream",
    );
    res.setHeader(
      "Content-Disposition",
      `inline; filename="${encodeURIComponent(document.originalName)}"`,
    );

    const fileStream = fsSync.createReadStream(filePath);
    fileStream.pipe(res);
  } catch (err) {
    console.error("Error viewing employee document:", err);
    return res.status(500).json({ error: "Failed to retrieve document" });
  }
};

// ==================================================================================
// SHARED / EXISTING ACTIONS
// ==================================================================================

const uploadDocument = async (req, res) => {
  try {
    const employeeId = req.user?.employeeId;

    if (!employeeId) {
      return res
        .status(400)
        .json({ error: "Authenticated user does not have an employeeId" });
    }

    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    const { category = "Other", subCategory, description, tags } = req.body;

    // Validate document type
    if (!subCategory) {
      await fs.unlink(req.file.path).catch(console.error);
      return res.status(400).json({
        error: "Document type is required",
        field: "subCategory",
      });
    }

    const validation = validateDocumentType(subCategory, category);
    if (!validation.isValid) {
      await fs.unlink(req.file.path).catch(console.error);
      return res.status(400).json({
        error: validation.error,
        field: "subCategory",
      });
    }

    const fileSize = req.file.size;

    // Check employee's current storage usage
    const employee = await Employee.findOne({
      where: {
        employeeId,
        auditSoftDeleteIsDeleted: false,
      },
    });

    if (!employee) {
      await fs.unlink(req.file.path).catch(console.error);
      return res.status(404).json({ error: "Employee not found" });
    }

    const currentUsage = employee.documentsStorageUsage?.used || 0;
    const storageLimit =
      employee.documentsStorageUsage?.limit || 50 * 1024 * 1024;

    // Check if there's enough space
    if (currentUsage + fileSize > storageLimit) {
      await fs.unlink(req.file.path).catch(console.error);

      const remainingMB = (
        (storageLimit - currentUsage) /
        (1024 * 1024)
      ).toFixed(2);
      return res.status(400).json({
        error: "Storage limit exceeded",
        message: `Only ${remainingMB} MB remaining. File size: ${(fileSize / (1024 * 1024)).toFixed(2)} MB`,
      });
    }

    // Generate safe file name
    const safeFileName = generateSafeFileName(
      employeeId,
      req.file.originalname,
    );
    const uploadDir = await ensureUploadDir();
    const filePath = path.join(uploadDir, safeFileName);

    // Move file from temp location
    await fs.rename(req.file.path, filePath);

    // Parse tags
    const tagsArray = tags
      ? tags
          .split(",")
          .map((tag) => tag.trim())
          .filter((tag) => tag)
      : [];

    // Create document object
    const newDocument = {
      documentId: `DOC_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      fileName: safeFileName,
      originalName: req.file.originalname,
      filePath: `/uploads/hrms-uploads/documents/${safeFileName}`,
      fileSize,
      mimeType: req.file.mimetype,
      category: validation.docTypeInfo.category,
      subCategory,
      description: description || "",
      uploadDate: new Date(),
      uploadedBy: employeeId,
      status: "Pending",
      tags: tagsArray,
      accessControl: {
        canView: [employeeId],
        canEdit: [employeeId],
        canDelete: [employeeId],
      },
    };

    // Get current documents array
    const currentDocuments = employee.documentsUploadedDocuments || [];
    const updatedDocuments = [...currentDocuments, newDocument];

    // Update storage usage
    const updatedStorageUsage = {
      used: currentUsage + fileSize,
      limit: storageLimit,
      lastUpdated: new Date(),
    };

    // Update employee
    await employee.update({
      documentsUploadedDocuments: updatedDocuments,
      documentsStorageUsage: updatedStorageUsage,
    });

    return res.json({
      success: true,
      message: "Document uploaded successfully",
      document: {
        ...newDocument,
        typeLabel: VALID_DOCUMENT_TYPES[subCategory].label,
      },
      storageUsage: updatedStorageUsage,
    });
  } catch (err) {
    console.error("Error uploading document:", err);

    // Clean up file if error occurred
    if (req.file && req.file.path) {
      try {
        await fs.unlink(req.file.path);
      } catch (cleanupErr) {
        console.error("Error cleaning up file:", cleanupErr);
      }
    }

    return res.status(500).json({ error: "Failed to upload document" });
  }
};

const uploadMultipleDocuments = async (req, res) => {
  try {
    const employeeId = req.user?.employeeId;

    if (!employeeId) {
      return res
        .status(400)
        .json({ error: "Authenticated user does not have an employeeId" });
    }

    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ error: "No files uploaded" });
    }

    const { category = "Other", subCategory, description, tags } = req.body;

    // Validate document type for multiple uploads
    if (!subCategory) {
      for (const file of req.files) {
        await fs.unlink(file.path).catch(console.error);
      }
      return res.status(400).json({
        error: "Document type is required for all files",
        field: "subCategory",
      });
    }

    const validation = validateDocumentType(subCategory, category);
    if (!validation.isValid) {
      for (const file of req.files) {
        await fs.unlink(file.path).catch(console.error);
      }
      return res.status(400).json({
        error: validation.error,
        field: "subCategory",
      });
    }

    const employee = await Employee.findOne({
      where: {
        employeeId,
        auditSoftDeleteIsDeleted: false,
      },
    });

    if (!employee) {
      for (const file of req.files) {
        await fs.unlink(file.path).catch(console.error);
      }
      return res.status(404).json({ error: "Employee not found" });
    }

    let currentUsage = employee.documentsStorageUsage?.used || 0;
    const storageLimit =
      employee.documentsStorageUsage?.limit || 50 * 1024 * 1024;
    const uploadDir = await ensureUploadDir();
    const currentDocuments = employee.documentsUploadedDocuments || [];

    const uploadedDocs = [];
    const errors = [];

    // Parse tags once for all documents
    const tagsArray = tags
      ? tags
          .split(",")
          .map((tag) => tag.trim())
          .filter((tag) => tag)
      : [];

    // Process each file
    for (const file of req.files) {
      try {
        // Check available space for this file
        if (currentUsage + file.size > storageLimit) {
          const remainingMB = (
            (storageLimit - currentUsage) /
            (1024 * 1024)
          ).toFixed(2);
          errors.push({
            fileName: file.originalname,
            error: `Storage limit exceeded. Only ${remainingMB} MB remaining`,
          });
          await fs.unlink(file.path).catch(console.error);
          continue;
        }

        // Generate safe file name
        const safeFileName = generateSafeFileName(
          employeeId,
          file.originalname,
        );
        const filePath = path.join(uploadDir, safeFileName);

        // Move file
        await fs.rename(file.path, filePath);

        // Create document object
        const newDocument = {
          documentId: `DOC_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          fileName: safeFileName,
          originalName: file.originalname,
          filePath: `/uploads/hrms-uploads/documents/${safeFileName}`,
          fileSize: file.size,
          mimeType: file.mimetype,
          category: validation.docTypeInfo.category,
          subCategory,
          description: description || "",
          uploadDate: new Date(),
          uploadedBy: employeeId,
          status: "Pending",
          tags: tagsArray,
          accessControl: {
            canView: [employeeId],
            canEdit: [employeeId],
            canDelete: [employeeId],
          },
        };

        // Add to current documents
        currentDocuments.push(newDocument);
        currentUsage += file.size;

        uploadedDocs.push({
          ...newDocument,
          typeLabel: VALID_DOCUMENT_TYPES[subCategory].label,
        });
      } catch (fileError) {
        console.error(`Error processing file ${file.originalname}:`, fileError);
        errors.push({
          fileName: file.originalname,
          error: fileError.message,
        });

        if (file && file.path) {
          try {
            await fs.unlink(file.path);
          } catch (cleanupErr) {
            console.error("Error cleaning up file:", cleanupErr);
          }
        }
      }
    }

    // Update employee with all changes
    if (uploadedDocs.length > 0) {
      await employee.update({
        documentsUploadedDocuments: currentDocuments,
        documentsStorageUsage: {
          used: currentUsage,
          limit: storageLimit,
          lastUpdated: new Date(),
        },
      });
    }

    return res.json({
      success: true,
      message: `Successfully uploaded ${uploadedDocs.length} document(s)`,
      uploadedDocuments: uploadedDocs,
      errors: errors.length > 0 ? errors : undefined,
      storageUsage: {
        used: currentUsage,
        limit: storageLimit,
        remaining: storageLimit - currentUsage,
        percentage: (currentUsage / storageLimit) * 100,
      },
    });
  } catch (err) {
    console.error("Error uploading multiple documents:", err);

    if (req.files) {
      for (const file of req.files) {
        if (file && file.path) {
          await fs.unlink(file.path).catch(console.error);
        }
      }
    }

    return res.status(500).json({ error: "Failed to upload documents" });
  }
};

// View/Download document (Current User View)
const viewDocument = async (req, res) => {
  try {
    const { documentId } = req.params;
    const employeeId = req.user?.employeeId;

    if (!employeeId) {
      return res
        .status(400)
        .json({ error: "Authenticated user does not have an employeeId" });
    }

    const employee = await Employee.findOne({
      where: {
        employeeId,
        auditSoftDeleteIsDeleted: false,
      },
    });

    if (!employee) {
      return res.status(404).json({ error: "Employee not found" });
    }

    const document = employee.documentsUploadedDocuments?.find(
      (doc) => doc.documentId === documentId,
    );

    if (!document) {
      return res.status(404).json({ error: "Document not found" });
    }

    // Check if user has permission to view
    const canView = document.accessControl?.canView || [];
    if (!canView.includes(employeeId) && document.uploadedBy !== employeeId) {
      if (req.user?.role !== "Admin") {
        return res
          .status(403)
          .json({ error: "You don't have permission to view this document" });
      }
    }

    // Use absolute path
    const filePath = path.join(
      "/var/www/hrms-uploads/documents",
      document.fileName,
    );

    try {
      await fs.access(filePath);
    } catch (err) {
      console.error("File not found:", err);
      return res.status(404).json({
        error: "File not found on server",
        path: document.filePath,
        fullPath: filePath,
      });
    }

    // Set headers for file download/view
    res.setHeader("Content-Type", document.mimeType);
    res.setHeader(
      "Content-Disposition",
      `inline; filename="${encodeURIComponent(document.originalName)}"`,
    );

    // Stream the file
    const fileStream = fsSync.createReadStream(filePath);
    fileStream.pipe(res);
  } catch (err) {
    console.error("Error viewing document:", err);
    return res.status(500).json({
      error: "Failed to retrieve document",
      details: process.env.NODE_ENV === "development" ? err.message : undefined,
    });
  }
};

// Delete document
const deleteDocument = async (req, res) => {
  try {
    const { documentId } = req.params;
    const employeeId = req.user?.employeeId;

    if (!employeeId) {
      return res
        .status(400)
        .json({ error: "Authenticated user does not have an employeeId" });
    }

    const employee = await Employee.findOne({
      where: {
        employeeId,
        auditSoftDeleteIsDeleted: false,
      },
    });

    if (!employee) {
      return res.status(404).json({ error: "Employee not found" });
    }

    const documents = employee.documentsUploadedDocuments || [];
    const documentIndex = documents.findIndex(
      (doc) => doc.documentId === documentId,
    );

    if (documentIndex === -1) {
      return res.status(404).json({ error: "Document not found" });
    }

    const document = documents[documentIndex];

    // Check if user has permission to delete
    const canDelete = document.accessControl?.canDelete || [];
    if (!canDelete.includes(employeeId) && document.uploadedBy !== employeeId) {
      if (req.user?.role !== "Admin") {
        return res
          .status(403)
          .json({ error: "You don't have permission to delete this document" });
      }
    }

    // Delete file from filesystem
    const filePath = path.join(
      "/var/www/hrms-uploads/documents",
      document.fileName,
    );

    try {
      await fs.unlink(filePath);
    } catch (err) {
      console.warn("Could not delete file from filesystem:", err.message);
    }

    // Remove document from array
    const newDocuments = documents.filter(
      (doc) => doc.documentId !== documentId,
    );
    const newUsage = employee.documentsStorageUsage.used - document.fileSize;

    // Update employee
    await employee.update({
      documentsUploadedDocuments: newDocuments,
      documentsStorageUsage: {
        ...employee.documentsStorageUsage,
        used: newUsage > 0 ? newUsage : 0,
        lastUpdated: new Date(),
      },
    });

    return res.json({
      success: true,
      message: "Document deleted successfully",
      documentId,
      storageUsage: {
        used: newUsage > 0 ? newUsage : 0,
        limit: employee.documentsStorageUsage.limit,
        remaining:
          employee.documentsStorageUsage.limit - (newUsage > 0 ? newUsage : 0),
      },
    });
  } catch (err) {
    console.error("Error deleting document:", err);
    return res.status(500).json({ error: "Failed to delete document" });
  }
};

// Update document metadata
const updateDocument = async (req, res) => {
  try {
    const { documentId } = req.params;
    const employeeId = req.user?.employeeId;
    const updates = req.body;

    if (!employeeId) {
      return res
        .status(400)
        .json({ error: "Authenticated user does not have an employeeId" });
    }

    // Find employee
    const employee = await Employee.findOne({
      where: {
        employeeId,
        auditSoftDeleteIsDeleted: false,
      },
    });

    if (!employee) {
      return res.status(404).json({ error: "Employee not found" });
    }

    const documents = employee.documentsUploadedDocuments || [];
    const documentIndex = documents.findIndex(
      (doc) => doc.documentId === documentId,
    );

    if (documentIndex === -1) {
      return res.status(404).json({ error: "Document not found" });
    }

    // Check permission
    const document = documents[documentIndex];
    const canEdit = document.accessControl?.canEdit || [];
    if (!canEdit.includes(employeeId) && document.uploadedBy !== employeeId) {
      if (req.user?.role !== "Admin") {
        return res
          .status(403)
          .json({ error: "You don't have permission to edit this document" });
      }
    }

    // Validate subCategory if it's being updated
    if (updates.subCategory) {
      const category = updates.category || document.category;
      const validation = validateDocumentType(updates.subCategory, category);
      if (!validation.isValid) {
        return res.status(400).json({
          error: validation.error,
          field: "subCategory",
        });
      }
      // Auto-set category if not provided
      if (!updates.category) {
        updates.category = validation.docTypeInfo.category;
      }
    }

    // Update document fields
    const updatedDocument = { ...document };

    if (updates.category !== undefined)
      updatedDocument.category = updates.category;
    if (updates.subCategory !== undefined)
      updatedDocument.subCategory = updates.subCategory;
    if (updates.description !== undefined)
      updatedDocument.description = updates.description;
    if (updates.status !== undefined) updatedDocument.status = updates.status;
    if (updates.tags !== undefined) {
      updatedDocument.tags = updates.tags
        ? updates.tags
            .split(",")
            .map((tag) => tag.trim())
            .filter((tag) => tag)
        : [];
    }

    // Update documents array
    documents[documentIndex] = updatedDocument;

    // Save to database
    await employee.update({
      documentsUploadedDocuments: documents,
    });

    return res.json({
      success: true,
      message: "Document updated successfully",
      document: {
        ...updatedDocument,
        typeLabel:
          VALID_DOCUMENT_TYPES[updatedDocument.subCategory]?.label ||
          updatedDocument.subCategory,
      },
    });
  } catch (err) {
    console.error("Error updating document:", err);
    return res.status(500).json({ error: "Failed to update document" });
  }
};

// Get storage info
const getStorageInfo = async (req, res) => {
  try {
    const employeeId = req.user?.employeeId;

    if (!employeeId) {
      return res
        .status(400)
        .json({ error: "Authenticated user does not have an employeeId" });
    }

    const employee = await Employee.findOne({
      where: {
        employeeId,
        auditSoftDeleteIsDeleted: false,
      },
    });

    if (!employee) {
      return res.status(404).json({ error: "Employee not found" });
    }

    const storageUsage = employee.documentsStorageUsage || {
      used: 0,
      limit: 50 * 1024 * 1024,
    };

    const documents = employee.documentsUploadedDocuments || [];

    // Calculate usage by category and document type
    const categoryStats = {};
    const typeStats = {};

    documents.forEach((doc) => {
      const category = doc.category || "Other";
      const docType = doc.subCategory || "other";

      // Category stats
      if (!categoryStats[category]) {
        categoryStats[category] = {
          count: 0,
          size: 0,
          percentage: 0,
        };
      }
      categoryStats[category].count++;
      categoryStats[category].size += doc.fileSize;

      // Document type stats
      if (!typeStats[docType]) {
        typeStats[docType] = {
          count: 0,
          size: 0,
          label: VALID_DOCUMENT_TYPES[docType]?.label || docType,
          category: VALID_DOCUMENT_TYPES[docType]?.category || category,
        };
      }
      typeStats[docType].count++;
      typeStats[docType].size += doc.fileSize;
    });

    // Calculate percentages
    Object.keys(categoryStats).forEach((category) => {
      categoryStats[category].percentage =
        storageUsage.used > 0
          ? (categoryStats[category].size / storageUsage.used) * 100
          : 0;
    });

    Object.keys(typeStats).forEach((type) => {
      typeStats[type].percentage =
        storageUsage.used > 0
          ? (typeStats[type].size / storageUsage.used) * 100
          : 0;
    });

    return res.json({
      success: true,
      storageUsage,
      categoryStats,
      typeStats,
      totalDocuments: documents.length,
      usageInMB: {
        used: (storageUsage.used / (1024 * 1024)).toFixed(2),
        limit: (storageUsage.limit / (1024 * 1024)).toFixed(2),
        remaining: (
          (storageUsage.limit - storageUsage.used) /
          (1024 * 1024)
        ).toFixed(2),
        percentage: ((storageUsage.used / storageUsage.limit) * 100).toFixed(1),
      },
    });
  } catch (err) {
    console.error("Error getting storage info:", err);
    return res.status(500).json({ error: "Failed to get storage information" });
  }
};

module.exports = {
  getMyDocuments,
  getEmployeeDocuments,
  viewEmployeeDocument,
  uploadDocument,
  uploadMultipleDocuments,
  viewDocument,
  deleteDocument,
  updateDocument,
  getStorageInfo,
};
