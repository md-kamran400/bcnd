const path = require("path");
const { Op } = require("sequelize");
const Employee = require("../models/Employee");
const authController = require("./authController");
const sequelize = require("../database").sequelize;


// Helper function to transform flattened employee data to nested structure
const transformEmployeeToNested = (employee) => {
  if (!employee) return null;
  
  // Get the employee data as plain object
  const emp = employee.get ? employee.get({ plain: true }) : employee;
  
  return {
    ...emp,
    // Transform person fields
    person: {
      legalName: {
        firstName: emp.personLegalNameFirstName,
        middleName: emp.personLegalNameMiddleName,
        lastName: emp.personLegalNameLastName,
        fullName: emp.personLegalNameFullName,
      },
      preferredName: emp.personPreferredName,
      dateOfBirth: emp.personDateOfBirth,
      gender: emp.personGender,
      maritalStatus: emp.personMaritalStatus,
      nationality: emp.personNationality,
      bloodGroup: emp.personBloodGroup,
      languagePreferences: {
        preferred: emp.personLanguagePreferencesPreferred,
        known: emp.personLanguagePreferencesKnown || [],
      },
      photo: {
        profilePhotoUrl: emp.personPhotoProfilePhotoUrl,
        lastUpdatedAt: emp.personPhotoLastUpdatedAt,
      },
      sensitiveDisclosures: emp.personSensitiveDisclosures || {},
    },
    // Transform contact fields
    contact: {
      workEmail: emp.contactWorkEmail,
      personalEmail: emp.contactPersonalEmail,
      mobilePrimary: emp.contactMobilePrimary,
      mobileAlternate: emp.contactMobileAlternate,
      verification: emp.contactVerification || {},
      visibility: emp.contactVisibility || {},
    },
    // These are already JSON fields
    addresses: emp.addresses || [],
    emergencyContacts: emp.emergencyContacts || [],
    // Transform employment fields
    employment: {
      dateOfJoining: emp.employmentDateOfJoining,
      employmentType: emp.employmentType,
      workerCategory: emp.workerCategory,
      probation: emp.employmentProbation || {},
      noticePeriodDays: emp.noticePeriodDays,
      contract: emp.employmentContract || {},
      workArrangement: emp.workArrangement || {},
    },
    // Assignments is already JSON
    assignments: emp.assignments || [],
    // India Statutory
    indiaStatutory: emp.indiaStatutory || {},
    // Payroll
    payroll: emp.payroll || {},
    // Benefits
    benefits: emp.benefits || {},
    // Documents
    documents: {
      requiredDocsStatus: emp.documentsRequiredDocsStatus || {},
      uploadedDocuments: emp.documentsUploadedDocuments || [],
      storageUsage: emp.documentsStorageUsage || {
        used: 0,
        limit: 50 * 1024 * 1024,
      },
    },
    // IT Provisioning
    itProvisioning: emp.itProvisioning || {},
    // Access Control
    accessControl: emp.accessControl || {},
    // Workflows
    workflows: emp.workflows || {},
    // Separation
    separation: emp.separation || {},
    // Analytics Ready
    analyticsReady: emp.analyticsReady || {},
    // Custom Fields
    customFields: emp.customFields || {},
    // Keep original flattened fields for backward compatibility
    // but nested structure will be used by frontend
  };
};


// Returns the employee profile for the currently authenticated user
// GET /api/employees/me
const getMyProfile = async (req, res) => {
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
        auditSoftDeleteIsDeleted: false
      }
    });

    if (!employee) {
      return res
        .status(404)
        .json({ error: "Employee profile not found for this user" });
    }

    // Transform to nested structure for frontend
    const transformedEmployee = transformEmployeeToNested(employee);

    return res.json({ employee: transformedEmployee });

  } catch (err) {
    console.error("Error fetching employee profile:", err);
    return res.status(500).json({ error: "Failed to fetch employee profile" });
  }
};


// Admin: list all employees
// GET /api/employees (list all)
const listEmployees = async (req, res) => {
  try {
    const employees = await Employee.findAll({
      where: {
        auditSoftDeleteIsDeleted: false,
      },
      order: [["created_at", "DESC"]],
    });

    // Transform each employee to nested structure
    const transformedEmployees = employees.map(emp => transformEmployeeToNested(emp));

    return res.json({ employees: transformedEmployees });
  } catch (err) {
    console.error("Error listing employees:", err);
    return res.status(500).json({ error: "Failed to list employees" });
  }
};


// Admin can view any; Employee can only view their own
// GET /api/employees/:employeeId
const getEmployeeByEmployeeId = async (req, res) => {
  try {
    const { employeeId } = req.params;

    if (!employeeId) {
      return res.status(400).json({ error: "employeeId is required" });
    }

    // If not admin, ensure user is accessing their own profile
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

    // Transform to nested structure for frontend
    const transformedEmployee = transformEmployeeToNested(employee);

    return res.json({ employee: transformedEmployee });
  } catch (err) {
    console.error("Error fetching employee by employeeId:", err);
    return res.status(500).json({ error: "Failed to fetch employee" });
  }
};

const createEmployeeWithUser = async (req, res) => {
  const transaction = await sequelize.transaction();

  try {
    const payload = { ...req.body };

    // SOLUTION 3: Clean up empty strings in contact fields
    if (payload.contact) {
      // Convert empty strings to null for email fields to avoid validation errors
      if (payload.contact.personalEmail === '') {
        payload.contact.personalEmail = null;
      }
      if (payload.contact.workEmail === '') {
        payload.contact.workEmail = null;
      }
      // Also clean up other contact fields if needed
      if (payload.contact.mobilePrimary === '') {
        payload.contact.mobilePrimary = null;
      }
      if (payload.contact.mobileAlternate === '') {
        payload.contact.mobileAlternate = null;
      }
    }

    // Also clean up person fields if they're empty strings
    if (payload.person) {
      if (payload.person.legalName) {
        if (payload.person.legalName.firstName === '') {
          payload.person.legalName.firstName = null;
        }
        if (payload.person.legalName.middleName === '') {
          payload.person.legalName.middleName = null;
        }
        if (payload.person.legalName.lastName === '') {
          payload.person.legalName.lastName = null;
        }
        if (payload.person.legalName.fullName === '') {
          payload.person.legalName.fullName = null;
        }
      }
      
      if (payload.person.preferredName === '') {
        payload.person.preferredName = null;
      }
      if (payload.person.dateOfBirth === '') {
        payload.person.dateOfBirth = null;
      }
    }

    // Clean up employment fields
    if (payload.employment) {
      if (payload.employment.dateOfJoining === '') {
        payload.employment.dateOfJoining = null;
      }
      if (payload.employment.employmentType === '') {
        payload.employment.employmentType = null;
      }
      if (payload.employment.workerCategory === '') {
        payload.employment.workerCategory = null;
      }
    }

    if (!payload.employeeId) {
      await transaction.rollback();
      return res.status(400).json({ error: "employeeId is required" });
    }
    if (!payload.employeeCode) {
      payload.employeeCode = payload.employeeId;
    }

    const email = (
      payload.contact?.workEmail ||
      payload.contact?.personalEmail ||
      ""
    )
      .toString()
      .trim();
    if (!email) {
      await transaction.rollback();
      return res.status(400).json({
        error:
          "Work email or personal email is required to create linked user account and send setup link",
        field: "contact.workEmail",
      });
    }

    // Check if employeeId already exists
    const existingById = await Employee.findOne({
      where: { employeeId: payload.employeeId },
    });
    if (existingById) {
      await transaction.rollback();
      return res.status(400).json({
        error: "Employee ID already exists",
        field: "employeeId",
        value: payload.employeeId,
      });
    }

    // Check if employeeCode already exists
    const existingByCode = await Employee.findOne({
      where: { employeeCode: payload.employeeCode },
    });
    if (existingByCode) {
      await transaction.rollback();
      return res.status(400).json({
        error: "Employee Code already exists",
        field: "employeeCode",
        value: payload.employeeCode,
      });
    }

    // Prepare employee data with flattened structure for Sequelize
    const employeeData = {
      employeeId: payload.employeeId,
      employeeCode: payload.employeeCode,
      tenantId: payload.tenantId,

      // Person fields
      personLegalNameFirstName: payload.person?.legalName?.firstName,
      personLegalNameMiddleName: payload.person?.legalName?.middleName,
      personLegalNameLastName: payload.person?.legalName?.lastName,
      personLegalNameFullName: payload.person?.legalName?.fullName,
      personPreferredName: payload.person?.preferredName,
      personDateOfBirth: payload.person?.dateOfBirth,
      personGender: payload.person?.gender,
      personMaritalStatus: payload.person?.maritalStatus,
      personNationality: payload.person?.nationality,
      personBloodGroup: payload.person?.bloodGroup,

      // Contact fields
      contactWorkEmail: payload.contact?.workEmail,
      contactPersonalEmail: payload.contact?.personalEmail,
      contactMobilePrimary: payload.contact?.mobilePrimary,
      contactMobileAlternate: payload.contact?.mobileAlternate,

      // Employment fields
      employmentDateOfJoining: payload.employment?.dateOfJoining,
      employmentType: payload.employment?.employmentType,
      workerCategory: payload.employment?.workerCategory,

      // JSON fields
      externalIds: payload.externalIds || [],
      addresses: payload.addresses || [],
      emergencyContacts: payload.emergencyContacts || [],
      assignments: payload.assignments || [],
      documentsUploadedDocuments: [],

      // Audit fields
      auditCreatedBy: req.user?.employeeId || "SYSTEM",
      auditUpdatedBy: req.user?.employeeId || "SYSTEM",
      auditRecordVersion: 1,
    };

    // Create employee
    const employee = await Employee.create(employeeData, { transaction });

    // Get roles for user creation
    let userOptions = {};
    try {
      const RoleModel = require("../models/Settings/Roles_model");
      const rolesFromDB = await RoleModel.findAll({
        attributes: ["name"],
        transaction,
      });
      const allowedRoles =
        rolesFromDB && rolesFromDB.length > 0
          ? rolesFromDB.map((r) => r.name)
          : ["Admin", "Employee", "Manager"];

      if (payload.role && allowedRoles.includes(payload.role)) {
        userOptions.role = payload.role;
      }
    } catch (roleErr) {
      console.error("Error fetching roles:", roleErr);
      if (
        payload.role &&
        ["Admin", "Employee", "Manager"].includes(payload.role)
      ) {
        userOptions.role = payload.role;
      }
    }

    if (payload.department) userOptions.department = payload.department;

    // Create user for employee
    let userCreated = false;
    let emailSent = true;
    let mailError = null;

    try {
      const result = await authController.createUserForEmployee(
        employee,
        userOptions,
      );
      userCreated = !result.userExists;
      emailSent = result.emailSent !== false;
      mailError = result.mailError || null;
    } catch (err) {
      if (err.code === "EMAIL_REQUIRED") {
        await transaction.rollback();
        return res.status(400).json({ error: err.message });
      }
      console.error("Error creating user for employee:", err);
      await transaction.rollback();
      return res.status(500).json({
        error: "Employee created but failed to create user or send setup email",
        details: err.message,
      });
    }

    await transaction.commit();

    const message = !userCreated
      ? "Employee created. User account already exists for this employee ID."
      : emailSent
        ? "Employee created and setup email sent to the given email. User has been added to User Management."
        : "Employee and user created. Setup email could not be sent. Use Forgot Password on the login page to send a new link.";

    if (!emailSent && mailError) {
      console.error("Setup email failed:", mailError);
    }

    return res.status(201).json({
      success: true,
      message,
      employee,
      userCreated,
      emailSent: userCreated ? emailSent : undefined,
      ...(mailError && !emailSent ? { mailError } : {}),
    });
  } catch (err) {
    await transaction.rollback();
    console.error("Error creating employee with user:", err);

    // Handle unique constraint errors
    if (err.name === "SequelizeUniqueConstraintError") {
      const field = err.errors[0]?.path || "unknown";
      return res.status(400).json({
        error: "Duplicate key error",
        message: err.errors[0]?.message || "Duplicate value",
        field,
      });
    }

    // Handle validation errors
    if (err.name === "SequelizeValidationError") {
      const errors = err.errors.map((e) => ({
        field: e.path,
        message: e.message,
      }));
      return res.status(400).json({ error: "Validation failed", errors });
    }

    return res.status(500).json({
      error: "Failed to create employee",
      details: process.env.NODE_ENV === "development" ? err.message : undefined,
    });
  }
};

// POST /api/employees
// Admin: create new employee document (no user creation)
const createEmployee = async (req, res) => {
  try {
    const payload = { ...req.body };

    // Validate required fields
    if (!payload.employeeId || !payload.employeeCode) {
      return res
        .status(400)
        .json({ error: "employeeId and employeeCode are required" });
    }

    // Check if employeeId already exists
    const existingById = await Employee.findOne({
      where: { employeeId: payload.employeeId },
    });
    if (existingById) {
      return res.status(400).json({
        error: "Employee ID already exists",
        field: "employeeId",
        value: payload.employeeId,
      });
    }

    // Check if employeeCode already exists
    const existingByCode = await Employee.findOne({
      where: { employeeCode: payload.employeeCode },
    });
    if (existingByCode) {
      return res.status(400).json({
        error: "Employee Code already exists",
        field: "employeeCode",
        value: payload.employeeCode,
      });
    }

    // Prepare employee data with flattened structure
    const employeeData = {
      employeeId: payload.employeeId,
      employeeCode: payload.employeeCode,
      tenantId: payload.tenantId,

      // Person fields
      personLegalNameFirstName: payload.person?.legalName?.firstName,
      personLegalNameMiddleName: payload.person?.legalName?.middleName,
      personLegalNameLastName: payload.person?.legalName?.lastName,
      personLegalNameFullName: payload.person?.legalName?.fullName,
      personPreferredName: payload.person?.preferredName,
      personDateOfBirth: payload.person?.dateOfBirth,
      personGender: payload.person?.gender,
      personMaritalStatus: payload.person?.maritalStatus,
      personNationality: payload.person?.nationality,
      personBloodGroup: payload.person?.bloodGroup,

      // Contact fields
      contactWorkEmail: payload.contact?.workEmail,
      contactPersonalEmail: payload.contact?.personalEmail,
      contactMobilePrimary: payload.contact?.mobilePrimary,
      contactMobileAlternate: payload.contact?.mobileAlternate,

      // Employment fields
      employmentDateOfJoining: payload.employment?.dateOfJoining,
      employmentType: payload.employment?.employmentType,
      workerCategory: payload.employment?.workerCategory,

      // JSON fields
      externalIds: payload.externalIds || [],
      addresses: payload.addresses || [],
      emergencyContacts: payload.emergencyContacts || [],
      assignments: payload.assignments || [],
      documentsUploadedDocuments: [],

      // Audit fields
      auditCreatedBy: req.user?.employeeId || "SYSTEM",
      auditUpdatedBy: req.user?.employeeId || "SYSTEM",
      auditRecordVersion: 1,
    };

    // Create and save the employee
    const employee = await Employee.create(employeeData);

    return res.status(201).json({
      success: true,
      message: "Employee created successfully",
      employee,
    });
  } catch (err) {
    console.error("Error creating employee:", err);

    // Handle unique constraint errors
    if (err.name === "SequelizeUniqueConstraintError") {
      const field = err.errors[0]?.path || "unknown";
      return res.status(400).json({
        error: "Duplicate key error",
        message: err.errors[0]?.message || "Duplicate value",
        field,
      });
    }

    // Handle validation errors
    if (err.name === "SequelizeValidationError") {
      const errors = err.errors.map((e) => ({
        field: e.path,
        message: e.message,
      }));
      return res.status(400).json({
        error: "Validation failed",
        errors,
      });
    }

    return res.status(500).json({
      error: "Failed to create employee",
      details: process.env.NODE_ENV === "development" ? err.message : undefined,
    });
  }
};

// PUT /api/employees/:employeeId
// Admin: update any; Employee: only their own
const updateEmployee = async (req, res) => {
  try {
    const { employeeId } = req.params;
    const updates = req.body;

    if (!employeeId) {
      return res.status(400).json({ error: "employeeId is required" });
    }

    // If not admin, ensure user is updating their own profile
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

    // Prepare update data (flatten nested objects)
    const updateData = {};

    // Map nested updates to flattened fields
    if (updates.person) {
      if (updates.person.legalName) {
        updateData.personLegalNameFirstName =
          updates.person.legalName.firstName;
        updateData.personLegalNameMiddleName =
          updates.person.legalName.middleName;
        updateData.personLegalNameLastName = updates.person.legalName.lastName;
        updateData.personLegalNameFullName = updates.person.legalName.fullName;
      }
      if (updates.person.preferredName !== undefined)
        updateData.personPreferredName = updates.person.preferredName;
      if (updates.person.dateOfBirth !== undefined)
        updateData.personDateOfBirth = updates.person.dateOfBirth;
      if (updates.person.gender !== undefined)
        updateData.personGender = updates.person.gender;
      if (updates.person.maritalStatus !== undefined)
        updateData.personMaritalStatus = updates.person.maritalStatus;
      if (updates.person.nationality !== undefined)
        updateData.personNationality = updates.person.nationality;
      if (updates.person.bloodGroup !== undefined)
        updateData.personBloodGroup = updates.person.bloodGroup;
    }

    if (updates.contact) {
      if (updates.contact.personalEmail !== undefined)
        updateData.contactPersonalEmail = updates.contact.personalEmail;
      if (updates.contact.mobilePrimary !== undefined)
        updateData.contactMobilePrimary = updates.contact.mobilePrimary;
      if (updates.contact.mobileAlternate !== undefined)
        updateData.contactMobileAlternate = updates.contact.mobileAlternate;
    }

    if (updates.employment) {
      if (updates.employment.dateOfJoining !== undefined)
        updateData.employmentDateOfJoining = updates.employment.dateOfJoining;
      if (updates.employment.employmentType !== undefined)
        updateData.employmentType = updates.employment.employmentType;
      if (updates.employment.workerCategory !== undefined)
        updateData.workerCategory = updates.employment.workerCategory;
    }

    // Handle JSON array updates
    if (updates.addresses) updateData.addresses = updates.addresses;
    if (updates.emergencyContacts)
      updateData.emergencyContacts = updates.emergencyContacts;
    if (updates.assignments) updateData.assignments = updates.assignments;

    // Update audit fields
    updateData.auditUpdatedBy = req.user?.employeeId || "SYSTEM";
    updateData.auditRecordVersion = employee.auditRecordVersion + 1;

    await employee.update(updateData);

    return res.json({ employee });
  } catch (err) {
    console.error("Error updating employee:", err);
    return res.status(500).json({ error: "Failed to update employee" });
  }
};

// DELETE /api/employees/:employeeId
// Admin only (soft delete)
const deleteEmployee = async (req, res) => {
  try {
    const { employeeId } = req.params;

    if (!employeeId) {
      return res.status(400).json({ error: "employeeId is required" });
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

    // Soft delete
    await employee.update({
      auditSoftDeleteIsDeleted: true,
      auditSoftDeleteDeletedAt: new Date(),
      auditSoftDeleteDeletedBy: req.user?.employeeId || "SYSTEM",
    });

    return res.json({ message: "Employee deleted successfully" });
  } catch (err) {
    console.error("Error deleting employee:", err);
    return res.status(500).json({ error: "Failed to delete employee" });
  }
};

// PATCH /api/employees/me
// Employee updates limited personal fields on their own profile
const updateMyProfile = async (req, res) => {
  try {
    const employeeId = req.user?.employeeId;

    if (!employeeId) {
      return res
        .status(400)
        .json({ error: "Authenticated user does not have an employeeId" });
    }

    const body = req.body || {};
    const updateData = {};

    // Handle nested person object
    if (body.person) {
      if (body.person.legalName) {
        if (body.person.legalName.firstName !== undefined)
          updateData.personLegalNameFirstName = body.person.legalName.firstName;
        if (body.person.legalName.middleName !== undefined)
          updateData.personLegalNameMiddleName = body.person.legalName.middleName;
        if (body.person.legalName.lastName !== undefined)
          updateData.personLegalNameLastName = body.person.legalName.lastName;
        if (body.person.legalName.fullName !== undefined)
          updateData.personLegalNameFullName = body.person.legalName.fullName;
      }
      if (body.person.preferredName !== undefined)
        updateData.personPreferredName = body.person.preferredName;
      if (body.person.dateOfBirth !== undefined)
        updateData.personDateOfBirth = body.person.dateOfBirth;
      if (body.person.gender !== undefined)
        updateData.personGender = body.person.gender;
      if (body.person.maritalStatus !== undefined)
        updateData.personMaritalStatus = body.person.maritalStatus;
      if (body.person.nationality !== undefined)
        updateData.personNationality = body.person.nationality;
      if (body.person.bloodGroup !== undefined)
        updateData.personBloodGroup = body.person.bloodGroup;
    }

    // Handle nested contact object
    if (body.contact) {
      if (body.contact.personalEmail !== undefined)
        updateData.contactPersonalEmail = body.contact.personalEmail;
      if (body.contact.mobilePrimary !== undefined)
        updateData.contactMobilePrimary = body.contact.mobilePrimary;
      if (body.contact.mobileAlternate !== undefined)
        updateData.contactMobileAlternate = body.contact.mobileAlternate;
    }

    // Handle addresses (JSON array)
    if (body.addresses !== undefined) {
      updateData.addresses = body.addresses;
    }

    // Handle emergency contacts (JSON array)
    if (body.emergencyContacts !== undefined) {
      updateData.emergencyContacts = body.emergencyContacts;
    }

    // Handle nested employment object
    if (body.employment) {
      if (body.employment.dateOfJoining !== undefined)
        updateData.employmentDateOfJoining = body.employment.dateOfJoining;
      if (body.employment.employmentType !== undefined)
        updateData.employmentType = body.employment.employmentType;
      if (body.employment.workerCategory !== undefined)
        updateData.workerCategory = body.employment.workerCategory;
      if (body.employment.probation !== undefined)
        updateData.employmentProbation = body.employment.probation;
      if (body.employment.noticePeriodDays !== undefined)
        updateData.noticePeriodDays = body.employment.noticePeriodDays;
      if (body.employment.contract !== undefined)
        updateData.employmentContract = body.employment.contract;
      if (body.employment.workArrangement !== undefined)
        updateData.workArrangement = body.employment.workArrangement;
    }

    // Handle assignments (JSON array)
    if (body.assignments !== undefined) {
      updateData.assignments = body.assignments;
    }

    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({ error: "No updatable fields provided" });
    }

    // Update audit fields
    updateData.auditUpdatedBy = req.user?.employeeId || "SELF";
    updateData.auditRecordVersion = sequelize.literal('"record_version" + 1');

    const employee = await Employee.findOne({
      where: {
        employeeId,
        auditSoftDeleteIsDeleted: false,
      },
    });

    if (!employee) {
      return res
        .status(404)
        .json({ error: "Employee profile not found for this user" });
    }

    await employee.update(updateData);

    // Fetch the updated employee and transform it
    const updatedEmployee = await Employee.findOne({
      where: {
        employeeId,
        auditSoftDeleteIsDeleted: false,
      },
    });

    const transformedEmployee = transformEmployeeToNested(updatedEmployee);

    return res.json({
      success: true,
      message: "Profile updated successfully",
      employee: transformedEmployee,
    });
  } catch (err) {
    console.error("Error updating own employee profile:", err);

    if (err.name === "SequelizeUniqueConstraintError") {
      const field = err.errors[0]?.path || "unknown";
      return res.status(400).json({
        error: "Duplicate value error",
        message: `The ${field} already exists in the system`,
        field,
      });
    }

    if (err.name === "SequelizeValidationError") {
      const errors = err.errors.map((e) => ({
        field: e.path,
        message: e.message,
      }));
      return res.status(400).json({
        error: "Validation failed",
        errors,
      });
    }

    return res.status(500).json({
      error: "Failed to update employee profile",
      details: process.env.NODE_ENV === "development" ? err.message : undefined,
    });
  }
};

// POST /api/employees/me/photo
// Employee profile photo upload
const uploadProfilePhoto = async (req, res) => {
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

    const relativePath = `/uploads/hrms-uploads/profile/${req.file.filename}`;

    const employee = await Employee.findOne({
      where: {
        employeeId,
        auditSoftDeleteIsDeleted: false,
      },
    });

    if (!employee) {
      return res
        .status(404)
        .json({ error: "Employee profile not found for this user" });
    }

    await employee.update({
      personPhotoProfilePhotoUrl: relativePath,
      personPhotoLastUpdatedAt: new Date(),
    });

    return res.json({
      employee,
      profilePhotoUrl: relativePath,
    });
  } catch (err) {
    console.error("Error uploading profile photo:", err);
    return res.status(500).json({ error: "Failed to upload profile photo" });
  }
};

// DELETE /api/employees/me/photo
// Remove profile photo for current employee
const deleteProfilePhoto = async (req, res) => {
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
      return res
        .status(404)
        .json({ error: "Employee profile not found for this user" });
    }

    await employee.update({
      personPhotoProfilePhotoUrl: null,
      personPhotoLastUpdatedAt: new Date(),
    });

    return res.json({
      success: true,
      message: "Profile photo removed successfully",
      employee,
    });
  } catch (err) {
    console.error("Error deleting profile photo:", err);
    return res.status(500).json({ error: "Failed to delete profile photo" });
  }
};

// PUT /api/employees/me/photo
// Update profile photo for current employee (replace existing)
const updateProfilePhoto = async (req, res) => {
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

    const relativePath = `/uploads/hrms-uploads/profile/${req.file.filename}`;

    const employee = await Employee.findOne({
      where: {
        employeeId,
        auditSoftDeleteIsDeleted: false,
      },
    });

    if (!employee) {
      return res
        .status(404)
        .json({ error: "Employee profile not found for this user" });
    }

    await employee.update({
      personPhotoProfilePhotoUrl: relativePath,
      personPhotoLastUpdatedAt: new Date(),
    });

    return res.json({
      success: true,
      message: "Profile photo updated successfully",
      employee,
      profilePhotoUrl: relativePath,
    });
  } catch (err) {
    console.error("Error updating profile photo:", err);
    return res.status(500).json({ error: "Failed to update profile photo" });
  }
};

module.exports = {
  getMyProfile,
  listEmployees,
  getEmployeeByEmployeeId,
  createEmployee,
  createEmployeeWithUser,
  updateEmployee,
  deleteEmployee,
  updateMyProfile,
  uploadProfilePhoto,
  deleteProfilePhoto,
  updateProfilePhoto,
};
