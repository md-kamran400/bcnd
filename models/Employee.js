const { DataTypes } = require("sequelize");
const sequelize = require("../database").sequelize;

const Employee = sequelize.define(
  "Employee",
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    schemaVersion: {
      type: DataTypes.STRING,
      field: "schema_version",
      defaultValue: "1.0.0",
    },
    tenantId: {
      type: DataTypes.STRING,
      field: "tenant_id",
    },
    userId: {
      type: DataTypes.UUID,
      field: "user_id",
      unique: true,
      allowNull: true,
      references: {
        model: "users",
        key: "id",
      },
    },
    employeeId: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
      field: "employee_id",
    },
    employeeCode: {
      type: DataTypes.STRING,
      field: "employee_code",
      unique: true,
    },
    externalIds: {
      type: DataTypes.JSONB,
      field: "external_ids",
      defaultValue: [],
    },

    // Lifecycle
    lifecycleStatus: {
      type: DataTypes.STRING,
      field: "lifecycle_status",
    },
    lifecycleStatusReason: {
      type: DataTypes.STRING,
      field: "lifecycle_status_reason",
    },
    lifecycleStatusEffectiveFrom: {
      type: DataTypes.DATE,
      field: "lifecycle_status_effective_from",
    },
    rehireIsRehire: {
      type: DataTypes.BOOLEAN,
      field: "is_rehire",
    },
    rehirePreviousEmployeeCode: {
      type: DataTypes.STRING,
      field: "previous_employee_code",
    },
    rehirePreviousEmployeeId: {
      type: DataTypes.STRING,
      field: "previous_employee_id",
    },
    // Commented out as it doesn't exist in the database
    // employmentPeriods: {
    //   type: DataTypes.JSONB,
    //   field: "employment_periods",
    //   defaultValue: [],
    // },

    // Person
    personLegalNameFirstName: {
      type: DataTypes.STRING,
      field: "legal_first_name",
    },
    personLegalNameMiddleName: {
      type: DataTypes.STRING,
      field: "legal_middle_name",
    },
    personLegalNameLastName: {
      type: DataTypes.STRING,
      field: "legal_last_name",
    },
    personLegalNameFullName: {
      type: DataTypes.STRING,
      field: "legal_full_name",
    },
    personPreferredName: {
      type: DataTypes.STRING,
      field: "preferred_name",
    },
    personDateOfBirth: {
      type: DataTypes.DATE,
      field: "date_of_birth",
    },
    personGender: {
      type: DataTypes.STRING,
      field: "gender",
    },
    personMaritalStatus: {
      type: DataTypes.STRING,
      field: "marital_status",
    },
    personNationality: {
      type: DataTypes.STRING,
      field: "nationality",
    },
    personBloodGroup: {
      type: DataTypes.STRING,
      field: "blood_group",
    },
    personLanguagePreferencesPreferred: {
      type: DataTypes.STRING,
      field: "language_preferred",
    },
    personLanguagePreferencesKnown: {
      type: DataTypes.JSONB,
      field: "language_known",
      defaultValue: [],
    },
    personPhotoProfilePhotoUrl: {
      type: DataTypes.STRING,
      field: "profile_photo_url",
    },
    personPhotoLastUpdatedAt: {
      type: DataTypes.DATE,
      field: "profile_photo_updated_at",
    },
    personSensitiveDisclosures: {
      type: DataTypes.JSONB,
      field: "disability_disclosure_status",
      defaultValue: {},
    },

    // Contact
    contactWorkEmail: {
      type: DataTypes.STRING,
      field: "work_email",
      unique: true,
      validate: {
        isEmail: true,
      },
    },
    // contactPersonalEmail: {
    //   type: DataTypes.STRING,
    //   field: "personal_email",
    //   unique: true,
    //   validate: {
    //     isEmail: true,
    //   },
    // },
    contactPersonalEmail: {
  type: DataTypes.STRING,
  field: 'personal_email',
  validate: {
    isEmailOrEmpty(value) {
      if (value && value.length > 0) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(value)) {
          throw new Error('Validation isEmail on contactPersonalEmail failed');
        }
      }
    }
  }
},
    contactMobilePrimary: {
      type: DataTypes.STRING,
      field: "mobile_primary",
    },
    contactMobileAlternate: {
      type: DataTypes.STRING,
      field: "mobile_alternate",
    },
    contactVerification: {
      type: DataTypes.JSONB,
      field: "mobile_otp_verified",
      defaultValue: {},
    },
    contactVisibility: {
      type: DataTypes.JSONB,
      field: "show_mobile_to",
      defaultValue: {},
    },

    // Addresses (JSON array)
    addresses: {
      type: DataTypes.JSONB,
      defaultValue: [],
    },

    // Emergency Contacts (JSON array)
    emergencyContacts: {
      type: DataTypes.JSONB,
      field: "emergency_contacts",
      defaultValue: [],
    },

    // Employment
    employmentDateOfJoining: {
      type: DataTypes.DATEONLY,
      field: "date_of_joining",
    },
    employmentType: {
      type: DataTypes.STRING,
      field: "employment_type",
    },
    workerCategory: {
      type: DataTypes.STRING,
      field: "worker_category",
    },
    employmentProbation: {
      type: DataTypes.JSONB,
      field: "probation_applicable",
      defaultValue: {},
    },
    noticePeriodDays: {
      type: DataTypes.INTEGER,
      field: "notice_period_days",
    },
    employmentContract: {
      type: DataTypes.JSONB,
      field: "contract_start_date",
      defaultValue: {},
    },
    workArrangement: {
      type: DataTypes.JSONB,
      field: "work_arrangement_mode",
      defaultValue: {},
    },

    // Assignments (JSON array)
    assignments: {
      type: DataTypes.JSONB,
      defaultValue: [],
    },

    // India Statutory
    indiaStatutory: {
      type: DataTypes.JSONB,
      field: "pan_number",
      defaultValue: {},
    },

    // Payroll
    payroll: {
      type: DataTypes.JSONB,
      field: "pay_group_id",
      defaultValue: {},
    },

    // Benefits
    benefits: {
      type: DataTypes.JSONB,
      field: "group_mediclaim_enrolled",
      defaultValue: {},
    },

    // Documents
    documentsRequiredDocsStatus: {
      type: DataTypes.JSONB,
      field: "documents_required_docs_status",
      defaultValue: {},
    },
    documentsUploadedDocuments: {
      type: DataTypes.JSONB,
      field: "documents_uploaded_documents",
      defaultValue: [],
    },
    documentsStorageUsage: {
      type: DataTypes.JSONB,
      field: "documents_storage_usage",
      defaultValue: {
        used: 0,
        limit: 50 * 1024 * 1024,
        lastUpdated: new Date(),
      },
    },

    // IT Provisioning
    itProvisioning: {
      type: DataTypes.JSONB,
      field: "sso_subject",
      defaultValue: {},
    },

    // Access Control
    accessControl: {
      type: DataTypes.JSONB,
      field: "access_groups",
      defaultValue: {},
    },

    // Workflows
    workflows: {
      type: DataTypes.JSONB,
      defaultValue: {},
    },

    // Separation
    separation: {
      type: DataTypes.JSONB,
      field: "is_separated",
      defaultValue: {},
    },

    // Analytics Ready
    analyticsReady: {
      type: DataTypes.JSONB,
      field: "profile_completeness_score",
      defaultValue: {},
    },

    // Custom Fields
    customFields: {
      type: DataTypes.JSONB,
      field: "custom_fields",
      defaultValue: {},
    },

    // Additional fields from pgAdmin
    panVerifiedAt: {
      type: DataTypes.DATE,
      field: "pan_verified_at",
    },
    panVerificationStatus: {
      type: DataTypes.STRING,
      field: "pan_verification_status",
    },
    panNameAsPerPan: {
      type: DataTypes.STRING,
      field: "pan_name_as_per_pan",
    },
    aadhaarVerifiedAt: {
      type: DataTypes.DATE,
      field: "aadhaar_verified_at",
    },
    aadhaarMasked: {
      type: DataTypes.STRING,
      field: "aadhaar_masked",
    },
    aadhaarLast4: {
      type: DataTypes.STRING,
      field: "aadhaar_last4",
    },
    pfApplicable: {
      type: DataTypes.BOOLEAN,
      field: "pf_applicable",
    },
    pfUan: {
      type: DataTypes.STRING,
      field: "pf_uan",
    },
    pfMemberId: {
      type: DataTypes.STRING,
      field: "pf_member_id",
    },
    esicApplicable: {
      type: DataTypes.BOOLEAN,
      field: "esic_applicable",
    },
    esicNumber: {
      type: DataTypes.STRING,
      field: "esic_number",
    },
    mfaEnabled: {
      type: DataTypes.BOOLEAN,
      field: "mfa_enabled",
    },
    lastLoginAt: {
      type: DataTypes.DATE,
      field: "last_login_at",
    },
    lastWorkingDay: {
      type: DataTypes.DATEONLY,
      field: "last_working_day",
    },
    resignationSubmittedAt: {
      type: DataTypes.DATE,
      field: "resignation_submitted_at",
    },
    separationReason: {
      type: DataTypes.STRING,
      field: "separation_reason",
    },
    payCycle: {
      type: DataTypes.STRING,
      field: "pay_cycle",
    },
    currency: {
      type: DataTypes.STRING,
      field: "currency",
    },
    employeeCategoryTag: {
      type: DataTypes.STRING,
      field: "employee_category_tag",
    },
    taxRegime: {
      type: DataTypes.STRING,
      field: "tax_regime",
    },
    username: {
      type: DataTypes.STRING,
      field: "username",
    },

    // Audit
    auditRecordVersion: {
      type: DataTypes.INTEGER,
      field: "record_version",
      defaultValue: 1,
    },
    auditCreatedBy: {
      type: DataTypes.STRING,
      field: "created_by",
    },
    auditUpdatedBy: {
      type: DataTypes.STRING,
      field: "updated_by",
    },
    auditLastVerifiedAt: {
      type: DataTypes.DATE,
      field: "last_verified_at",
    },
    auditLastVerifiedBy: {
      type: DataTypes.STRING,
      field: "last_verified_by",
    },
    auditChangeLogRef: {
      type: DataTypes.STRING,
      field: "change_log_ref",
    },
    auditSoftDeleteIsDeleted: {
      type: DataTypes.BOOLEAN,
      field: "is_deleted",
      defaultValue: false,
    },
    auditSoftDeleteDeletedAt: {
      type: DataTypes.DATE,
      field: "deleted_at",
    },
    auditSoftDeleteDeletedBy: {
      type: DataTypes.STRING,
      field: "deleted_by",
    },
  },
  {
    tableName: "employees",
    timestamps: true,
    createdAt: "created_at",
    updatedAt: "updated_at",
    indexes: [
      {
        fields: ["employee_id"],
      },
      {
        fields: ["employee_code"],
      },
      {
        fields: ["tenant_id"],
      },
      {
        fields: ["work_email"],
      },
      {
        fields: ["personal_email"],
      },
      {
        fields: ["is_deleted"],
      },
    ],
  }
);

// Virtual fields for computed values
Employee.prototype.getStorageUsedInMB = function () {
  const used = this.documentsStorageUsage?.used || 0;
  return (used / (1024 * 1024)).toFixed(2);
};

Employee.prototype.getStorageLimitInMB = function () {
  const limit = this.documentsStorageUsage?.limit || 0;
  return (limit / (1024 * 1024)).toFixed(2);
};

Employee.prototype.getStoragePercentage = function () {
  const used = this.documentsStorageUsage?.used || 0;
  const limit = this.documentsStorageUsage?.limit || 1;
  return ((used / limit) * 100).toFixed(1);
};

// Check if document type exists
Employee.prototype.hasDocumentType = function (subCategory) {
  const documents = this.documentsUploadedDocuments || [];
  return documents.some(
    (doc) => doc.subCategory === subCategory && doc.status !== "Rejected"
  );
};

// Get documents by category
Employee.prototype.getDocumentsByCategory = function (category) {
  const documents = this.documentsUploadedDocuments || [];
  return documents.filter((doc) => doc.category === category);
};

// Get documents by type
Employee.prototype.getDocumentsByType = function (subCategory) {
  const documents = this.documentsUploadedDocuments || [];
  return documents.filter((doc) => doc.subCategory === subCategory);
};

// Hooks
Employee.beforeSave(async (employee, options) => {
  if (employee.changed("documentsUploadedDocuments")) {
    const documents = employee.documentsUploadedDocuments || [];
    const totalUsed = documents.reduce(
      (sum, doc) => sum + (doc.fileSize || 0),
      0
    );

    employee.documentsStorageUsage = {
      used: totalUsed,
      limit: employee.documentsStorageUsage?.limit || 50 * 1024 * 1024,
      lastUpdated: new Date(),
    };
  }
});

module.exports = Employee;