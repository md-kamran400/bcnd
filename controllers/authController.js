// controllers/authController.js
const crypto = require("crypto");
const { v4: uuidv4 } = require("uuid");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const validator = require("validator");
const { Op } = require("sequelize");
const User = require("../models/User");
const RefreshToken = require("../models/RefreshToken");
const { sendMail } = require("../utils/email");
const { createAccessToken, createRefreshToken } = require("../middleware/auth");

const MAX_FAILED_ATTEMPTS = 500;
const LOCK_TIME_MINUTES = 15;
const OTP_TTL_MINUTES = 10;
const OTP_MAX_ATTEMPTS = 50;
const TOKEN_EXP_MINUTES = {
  SETUP: 60,
  RESET: 20,
};

const sha256 = (data) => crypto.createHash("sha256").update(data).digest("hex");
const generateOtp = (digits = 6) => {
  const max = 10 ** digits - 1;
  const min = 10 ** (digits - 1);
  return String(Math.floor(Math.random() * (max - min + 1)) + min);
};
const generateRandomToken = (size = 32) => {
  return crypto.randomBytes(size).toString("hex");
};

// Register
exports.register = async (req, res) => {
  try {
    const { name, email, employeeId, password, role = "Employee" } = req.body;

    if (!name || !email || !employeeId || !password) {
      return res.status(400).json({ error: "Missing fields" });
    }
    if (!validator.isEmail(email)) {
      return res.status(400).json({ error: "Invalid email" });
    }
    if (password.length < 8) {
      return res.status(400).json({ error: "Password too short" });
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 10);

    const user = await User.create({
      name,
      email: email.toLowerCase(),
      employeeId,
      passwordHash,
      role,
    });

    return res.status(201).json({ message: "User registered successfully" });
  } catch (err) {
    if (err.name === "SequelizeUniqueConstraintError") {
      return res
        .status(400)
        .json({ error: "Email or EmployeeId already exists" });
    }
    console.error(err);
    return res.status(500).json({ error: "Server error" });
  }
};

// Login - Send OTP
// In authController.js
exports.loginSendOtp = async (req, res) => {
  try {
    const { email, password } = req.body;
    console.log("=================================");
    console.log("Login attempt for email:", email);
    console.log("Password provided:", password ? "Yes" : "No");

    if (!email || !password) {
      return res.status(400).json({ error: "Missing fields" });
    }

    const user = await User.findOne({
      where: { email: email.toLowerCase().trim() },
    });

    console.log("User found in database:", user ? "Yes" : "No");

    if (!user) {
      console.log("No user found with email:", email);
      return res.status(400).json({ error: "Invalid credentials" });
    }

    console.log("User ID:", user.id);
    console.log("User role:", user.role);
    console.log(
      "Password hash stored:",
      user.passwordHash ? user.passwordHash.substring(0, 30) + "..." : "None",
    );
    console.log("Account locked:", user.isLocked() ? "Yes" : "No");

    if (user.isLocked()) {
      console.log("Account is locked until:", user.lockUntil);
      return res.status(423).json({ error: "Account locked. Try later." });
    }

    console.log("Attempting password comparison...");
    const ok = await user.comparePassword(password);
    console.log("Password comparison result:", ok ? "SUCCESS" : "FAILED");

    if (!ok) {
      user.failedLoginAttempts = (user.failedLoginAttempts || 0) + 1;
      console.log("Failed login attempts:", user.failedLoginAttempts);

      if (user.failedLoginAttempts >= MAX_FAILED_ATTEMPTS) {
        user.lockUntil = new Date(Date.now() + LOCK_TIME_MINUTES * 60 * 1000);
        console.log("Account locked until:", user.lockUntil);
      }
      await user.save();
      return res.status(400).json({ error: "Invalid credentials" });
    }

    // Reset counters on success
    user.failedLoginAttempts = 0;
    user.lockUntil = null;
    await user.save();

    const accessToken = createAccessToken(user);

    return res.json({
      accessToken,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        employeeId: user.employeeId,
        role: user.role,
        department: user.department,
      },
    });
  } catch (err) {
    console.error("Login error:", err);
    return res.status(500).json({ error: "Server error" });
  }
};

// Verify OTP
exports.verifyOtp = async (req, res) => {
  try {
    const { email, otp } = req.body;
    if (!email || !otp) {
      return res.status(400).json({ error: "Missing fields" });
    }

    const user = await User.findOne({ where: { email: email.toLowerCase() } });
    if (!user || !user.otpCodeHash) {
      return res.status(400).json({ error: "Invalid OTP or session" });
    }

    if (new Date() > user.otpExpiresAt) {
      user.otpCodeHash = null;
      user.otpExpiresAt = null;
      user.otpAttempts = 0;
      await user.save();
      return res.status(400).json({ error: "OTP expired" });
    }

    if (user.otpAttempts >= OTP_MAX_ATTEMPTS) {
      user.otpCodeHash = null;
      user.otpExpiresAt = null;
      user.otpAttempts = 0;
      await user.save();
      return res.status(400).json({ error: "OTP attempts exceeded" });
    }

    const otpHash = sha256(otp);
    if (otpHash !== user.otpCodeHash) {
      user.otpAttempts += 1;
      await user.save();
      return res.status(400).json({ error: "Invalid OTP" });
    }

    // Clear OTP
    user.otpCodeHash = null;
    user.otpExpiresAt = null;
    user.otpAttempts = 0;
    await user.save();

    // TEMPORARY: Skip refresh token creation since table doesn't exist
    // Just return access token without refresh token
    const accessToken = createAccessToken(user);

    return res.json({
      accessToken,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        employeeId: user.employeeId,
        role: user.role,
        department: user.department,
      },
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Server error" });
  }
};

// Refresh token
exports.refresh = async (req, res) => {
  try {
    const token = req.cookies.refreshToken;
    if (!token) return res.status(401).json({ error: "Missing refresh token" });

    let payload;
    try {
      payload = jwt.verify(token, process.env.JWT_REFRESH_SECRET);
    } catch (err) {
      return res.status(401).json({ error: "Invalid refresh token" });
    }

    const stored = await RefreshToken.findOne({
      where: { tokenId: payload.tokenId },
    });
    if (!stored || stored.revoked) {
      if (stored && stored.revoked) {
        await RefreshToken.update(
          { revoked: true },
          { where: { userId: stored.userId } },
        );
      }
      return res.status(401).json({ error: "Refresh token revoked" });
    }

    if (stored.expiresAt < new Date()) {
      stored.revoked = true;
      await stored.save();
      return res.status(401).json({ error: "Refresh token expired" });
    }

    const newTokenId = uuidv4();
    const newRefresh = await RefreshToken.create({
      tokenId: newTokenId,
      userId: stored.userId,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      ip: req.ip,
      userAgent: req.get("User-Agent"),
    });

    stored.revoked = true;
    stored.replacedBy = newTokenId;
    await stored.save();

    const user = await User.findByPk(stored.userId);
    const accessToken = createAccessToken(user);
    const refreshJwt = createRefreshToken(newTokenId, user);

    res.cookie("refreshToken", refreshJwt, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "Strict",
      maxAge: 7 * 24 * 60 * 60 * 1000,
      path: "/api/auth/refresh",
    });

    return res.json({
      accessToken,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        employeeId: user.employeeId,
        role: user.role,
      },
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Server error" });
  }
};

// Logout
exports.logout = async (req, res) => {
  try {
    const token = req.cookies.refreshToken;
    if (token) {
      try {
        const payload = jwt.verify(token, process.env.JWT_REFRESH_SECRET);
        await RefreshToken.update(
          { revoked: true },
          { where: { tokenId: payload.tokenId } },
        );
      } catch (e) {
        // ignore
      }
    }
    res.clearCookie("refreshToken", { path: "/api/auth/refresh" });
    return res.json({ message: "Logged out" });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Server error" });
  }
};

// Get current user
exports.me = async (req, res) => {
  try {
    const auth = req.headers["authorization"];
    if (!auth) return res.status(401).json({ error: "Missing token" });
    const token = auth.split(" ")[1];
    const payload = jwt.verify(token, process.env.JWT_ACCESS_SECRET);
    const user = await User.findByPk(payload.sub, {
      attributes: {
        exclude: [
          "passwordHash",
          "otpCodeHash",
          "otpExpiresAt",
          "otpAttempts",
          "setupTokenHash",
          "setupTokenExpiresAt",
          "resetTokenHash",
          "resetTokenExpiresAt",
        ],
      },
    });
    if (!user) return res.status(401).json({ error: "Invalid token" });
    return res.json({ user });
  } catch (err) {
    return res.status(401).json({ error: "Invalid or expired token" });
  }
};

// Admin create user with setup
// authController.js - Update the adminCreateUserWithSetup function
// Admin create user with setup
exports.adminCreateUserWithSetup = async (req, res) => {
  try {
    const { name, email, employeeId, role = "Employee", department } = req.body;
    if (!name || !email || !employeeId) {
      return res.status(400).json({ error: "Missing fields" });
    }
    if (!validator.isEmail(email)) {
      return res.status(400).json({ error: "Invalid email" });
    }

    let allowedRoles = ["Admin", "Employee", "Manager", "Incharge", "Executive"];
    if (!allowedRoles.includes(role)) {
      return res.status(400).json({
        error: "Invalid role",
        allowedRoles,
      });
    }

    // Check if user already exists
    const existingUser = await User.findOne({
      where: {
        [Op.or]: [{ email: email.toLowerCase() }, { employeeId: employeeId }],
      },
    });

    if (existingUser) {
      return res
        .status(400)
        .json({ error: "User with this email or employeeId already exists" });
    }

    // Check if employee already exists
    const Employee = require("../models/Employee");
    let existingEmployee = await Employee.findOne({
      where: { employeeId: employeeId },
    });

    // If employee doesn't exist, create one
    if (!existingEmployee) {
      console.log(`Creating employee record for ${employeeId}...`);

      // Parse name into first and last name
      const nameParts = name.trim().split(" ");
      const firstName = nameParts[0] || "";
      const lastName = nameParts.slice(1).join(" ") || "";

      // Create employee data structure matching your Employee model
      const employeeData = {
        employeeId: employeeId,
        employeeCode: employeeId, // Using employeeId as employeeCode
        tenantId: req.body.tenantId || "default",

        // Person fields
        personLegalNameFirstName: firstName,
        personLegalNameLastName: lastName,
        personLegalNameFullName: name,
        personPreferredName: firstName,

        // Contact fields
        contactWorkEmail: email.toLowerCase(),

        // Employment fields
        employmentDateOfJoining: new Date(),
        employmentType: "full-time",
        workerCategory: "permanent",

        // Lifecycle
        lifecycleStatus: "active",

        // Assignments
        assignments: department
          ? [
              {
                assignmentId: `ASSIGN_${Date.now()}`,
                isPrimary: true,
                effectiveFrom: new Date(),
                organization: {
                  departmentName: department,
                  designationName: role,
                  locationName: "Head Office",
                },
              },
            ]
          : [],

        // Documents array
        documentsUploadedDocuments: [],

        // Audit fields
        auditCreatedBy: req.user?.employeeId || "SYSTEM_USER_CREATION",
        auditUpdatedBy: req.user?.employeeId || "SYSTEM_USER_CREATION",
        auditRecordVersion: 1,
        auditSoftDeleteIsDeleted: false,
      };

      try {
        existingEmployee = await Employee.create(employeeData);
        console.log(`Employee record created successfully for ${employeeId}`);
      } catch (empError) {
        console.error("Error creating employee record:", empError);

        // If employee creation fails, don't proceed with user creation
        return res.status(500).json({
          error: "Failed to create employee record",
          details: empError.message,
        });
      }
    } else {
      console.log(`Employee record already exists for ${employeeId}`);
    }

    // Create user
    const tempPassword = crypto.randomBytes(16).toString("hex");
    const passwordHash = await bcrypt.hash(tempPassword, 10);

    const user = await User.create({
      name,
      email: email.toLowerCase(),
      employeeId,
      passwordHash,
      role,
      department,
    });

    // Generate setup token
    const rawToken = generateRandomToken(32);
    user.setupTokenHash = sha256(rawToken);
    user.setupTokenExpiresAt = new Date(
      Date.now() + TOKEN_EXP_MINUTES.SETUP * 60 * 1000,
    );
    user.setupTokenUsed = false;
    await user.save();

    // Link user to employee (update employee with user_id)
    if (existingEmployee) {
      await existingEmployee.update({
        userId: user.id,
        auditUpdatedBy: req.user?.employeeId || "SYSTEM_USER_CREATION",
      });
      console.log(`Linked user ${user.id} to employee ${employeeId}`);
    }

    // Send setup email
    const frontendBase = (
      process.env.FRONTEND_URL || "http://localhost:5173"
    ).replace(/\/$/, "");
    const setupUrl = `${frontendBase}/setup-password?uid=${user.id}&token=${rawToken}`;

    const subject = `Set your password for ${process.env.APP_NAME || "Our App"}`;
    const text = `
Dear ${user.name},

Thank you for joining ${process.env.APP_NAME || "Our Application"}. We have created an account for you with the following details:

Username: ${user.employeeId}
Role: ${user.role}
Department: ${department || "Not specified"}

To complete your registration, please follow these steps:

1. Click on the following link to set your password:
  ${setupUrl}

2. Enter the following temporary password when prompted:
  ${tempPassword}

3. Choose a new password that meets our security requirements.

Important notes:
- This link will expire in ${TOKEN_EXP_MINUTES.SETUP} minutes.
- If you did not request this account, please contact IT Support immediately.

Best regards,
The ${process.env.APP_NAME || "Application"} Team
`;

    await sendMail({ to: user.email, subject, text });

    return res.status(201).json({
      message: "User created and setup email sent.",
      employeeCreated: !existingEmployee, // true if we created a new employee
      userId: user.id,
      employeeId: employeeId,
    });
  } catch (err) {
    if (err.name === "SequelizeUniqueConstraintError") {
      return res
        .status(400)
        .json({ error: "Email or EmployeeId already exists" });
    }
    console.error("Error in adminCreateUserWithSetup:", err);
    return res
      .status(500)
      .json({ error: "Server error", details: err.message });
  }
};

// Verify setup token
exports.verifySetupToken = async (req, res) => {
  try {
    const { uid, token } = req.query;
    if (!uid || !token) {
      return res.status(400).json({ error: "Missing params" });
    }

    const user = await User.findByPk(uid);
    if (!user || !user.setupTokenHash) {
      return res.status(400).json({ error: "Invalid token" });
    }

    if (user.setupTokenUsed) {
      return res.status(400).json({ error: "Token already used" });
    }
    if (new Date() > user.setupTokenExpiresAt) {
      return res.status(400).json({ error: "Token expired" });
    }

    if (sha256(token) !== user.setupTokenHash) {
      return res.status(400).json({ error: "Invalid token" });
    }

    return res.json({
      message: "Token valid",
      email: user.email,
      name: user.name,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Server error" });
  }
};

// Setup password
exports.setupPassword = async (req, res) => {
  try {
    const { uid, token, password } = req.body;

    if (!uid || !token || !password) {
      return res.status(400).json({ error: "Missing fields" });
    }
    if (password.length < 8) {
      return res.status(400).json({ error: "Password too short" });
    }

    const user = await User.findByPk(uid);
    if (!user || !user.setupTokenHash) {
      return res.status(400).json({ error: "Invalid token" });
    }

    if (user.setupTokenUsed) {
      return res.status(400).json({ error: "Token already used" });
    }
    if (new Date() > user.setupTokenExpiresAt) {
      return res.status(400).json({ error: "Token expired" });
    }

    if (sha256(token) !== user.setupTokenHash) {
      return res.status(400).json({ error: "Invalid token" });
    }

    user.passwordHash = await bcrypt.hash(password, 10);
    user.setupTokenHash = null;
    user.setupTokenExpiresAt = null;
    user.setupTokenUsed = true;

    await RefreshToken.update(
      { revoked: true },
      { where: { userId: user.id } },
    );

    await user.save();

    return res.json({ message: "Password set successfully. Please login." });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Server error" });
  }
};

// Forgot password
exports.forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: "Missing email" });

    const user = await User.findOne({ where: { email: email.toLowerCase() } });
    if (!user) {
      return res.json({
        message: "If that email exists, a reset link has been sent.",
      });
    }

    const rawToken = generateRandomToken(32);
    user.resetTokenHash = sha256(rawToken);
    user.resetTokenExpiresAt = new Date(
      Date.now() + TOKEN_EXP_MINUTES.RESET * 60 * 1000,
    );
    user.resetTokenUsed = false;
    await user.save();

    const resetUrl = `${process.env.FRONTEND_URL || "http://localhost:5173"}/reset-password?uid=${user.id}&token=${rawToken}`;

    const subject = `Password reset for ${process.env.APP_NAME || "Our App"}`;
    const text = `Hi ${user.name},\n\nWe received a request to reset your password. Use this link to set a new password. This link expires in ${TOKEN_EXP_MINUTES.RESET} minutes and can be used only once.\n\n${resetUrl}\n\nIf you didn't request this, ignore this email or contact support.`;

    try {
      await sendMail({ to: user.email, subject, text });
    } catch (mailErr) {
      console.error("Mail error:", mailErr);
    }

    return res.json({
      message: "If that email exists, a reset link has been sent.",
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Server error" });
  }
};

// Verify reset token
exports.verifyResetToken = async (req, res) => {
  try {
    const { uid, token } = req.query;
    if (!uid || !token) {
      return res.status(400).json({ error: "Missing params" });
    }

    const user = await User.findByPk(uid);
    if (!user || !user.resetTokenHash) {
      return res.status(400).json({ error: "Invalid token" });
    }
    if (user.resetTokenUsed) {
      return res.status(400).json({ error: "Token already used" });
    }
    if (new Date() > user.resetTokenExpiresAt) {
      return res.status(400).json({ error: "Token expired" });
    }

    if (sha256(token) !== user.resetTokenHash) {
      return res.status(400).json({ error: "Invalid token" });
    }

    return res.json({ message: "Token valid" });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Server error" });
  }
};

// Reset password
exports.resetPassword = async (req, res) => {
  try {
    const { uid, token, newPassword } = req.body;
    if (!uid || !token || !newPassword) {
      return res.status(400).json({ error: "Missing fields" });
    }
    if (newPassword.length < 8) {
      return res.status(400).json({ error: "Password too short" });
    }

    const user = await User.findByPk(uid);
    if (!user || !user.resetTokenHash) {
      return res.status(400).json({ error: "Invalid token" });
    }
    if (user.resetTokenUsed) {
      return res.status(400).json({ error: "Token already used" });
    }
    if (new Date() > user.resetTokenExpiresAt) {
      return res.status(400).json({ error: "Token expired" });
    }

    if (sha256(token) !== user.resetTokenHash) {
      return res.status(400).json({ error: "Invalid token" });
    }

    user.passwordHash = await bcrypt.hash(newPassword, 10);
    user.resetTokenHash = null;
    user.resetTokenExpiresAt = null;
    user.resetTokenUsed = true;

    await RefreshToken.update(
      { revoked: true },
      { where: { userId: user.id } },
    );

    await user.save();

    try {
      await sendMail({
        to: user.email,
        subject: `${process.env.APP_NAME || "Our App"} - Password changed`,
        text: `Your password was changed. If this wasn't you, contact support immediately.`,
      });
    } catch (mailErr) {
      console.error("Mail notify error:", mailErr);
    }

    return res.json({ message: "Password reset successfully." });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Server error" });
  }
};

// Admin get all users
// In authController.js
exports.getAllUsers = async (req, res) => {
  try {
    console.log("Fetching all users...");

    const users = await User.findAll({
      attributes: {
        exclude: [
          "passwordHash",
          "otpCodeHash",
          "otpExpiresAt",
          "otpAttempts",
          "setupTokenHash",
          "setupTokenExpiresAt",
          "resetTokenHash",
          "resetTokenExpiresAt",
          "resetOtpCodeHash",
          "resetOtpExpiresAt",
        ],
      },
      raw: false, // Set to false to get Sequelize model instances
    });

    console.log(`Found ${users.length} users`);

    if (users.length === 0) {
      console.log("No users found in database");
    } else {
      console.log("First user:", users[0].toJSON());
    }

    return res.json({ users });
  } catch (err) {
    console.error("Error in getAllUsers:", err);
    return res
      .status(500)
      .json({ error: "Server error", details: err.message });
  }
};

// Admin get user by ID
exports.getUserById = async (req, res) => {
  try {
    const { userId } = req.params;
    const user = await User.findByPk(userId, {
      attributes: {
        exclude: [
          "passwordHash",
          "otpCodeHash",
          "otpExpiresAt",
          "otpAttempts",
          "setupTokenHash",
          "setupTokenExpiresAt",
          "resetTokenHash",
          "resetTokenExpiresAt",
        ],
      },
    });

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    return res.json({ user });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Server error" });
  }
};

// Admin update user
exports.updateUser = async (req, res) => {
  try {
    const { userId } = req.params;
    const { name, email, employeeId, role, password } = req.body;

    const user = await User.findByPk(userId);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    if (name) user.name = name;
    if (email) {
      if (!validator.isEmail(email)) {
        return res.status(400).json({ error: "Invalid email" });
      }
      user.email = email.toLowerCase();
    }
    if (employeeId) user.employeeId = employeeId;
    if (role) {
      if (!["Admin", "Employee", "Manager", "Incharge", "Executive"].includes(role)) {
        return res.status(400).json({ error: "Invalid role" });
      }
      user.role = role;
    }
    if (password) {
      if (password.length < 8) {
        return res.status(400).json({ error: "Password too short" });
      }
      user.passwordHash = await bcrypt.hash(password, 10);
    }

    await user.save();

    const userResponse = user.toJSON();
    delete userResponse.passwordHash;
    delete userResponse.otpCodeHash;
    delete userResponse.otpExpiresAt;

    return res.json({
      message: "User updated successfully",
      user: userResponse,
    });
  } catch (err) {
    if (err.name === "SequelizeUniqueConstraintError") {
      return res
        .status(400)
        .json({ error: "Email or EmployeeId already exists" });
    }
    console.error(err);
    return res.status(500).json({ error: "Server error" });
  }
};

// Admin delete user
exports.deleteUser = async (req, res) => {
  try {
    const { userId } = req.params;

    if (req.user.id === userId) {
      return res.status(400).json({ error: "Cannot delete your own account" });
    }

    const user = await User.findByPk(userId);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    await RefreshToken.destroy({ where: { userId } });
    await user.destroy();

    return res.json({ message: "User deleted successfully" });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Server error" });
  }
};

// Admin register (for creating admin users)
exports.adminRegister = async (req, res) => {
  try {
    const { name, email, employeeId, password } = req.body;
    if (!name || !email || !employeeId || !password) {
      return res.status(400).json({ error: "Missing fields" });
    }
    if (!validator.isEmail(email)) {
      return res.status(400).json({ error: "Invalid email" });
    }
    if (password.length < 8) {
      return res.status(400).json({ error: "Password too short" });
    }

    // Check if user already exists
    const existingUser = await User.findOne({
      where: {
        [Op.or]: [{ email: email.toLowerCase() }, { employeeId: employeeId }],
      },
    });

    if (existingUser) {
      return res
        .status(400)
        .json({ error: "Email or EmployeeId already exists" });
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 10);

    const user = await User.create({
      name,
      email: email.toLowerCase(),
      employeeId,
      passwordHash,
      role: "Admin",
    });

    const userResponse = user.toJSON();
    delete userResponse.passwordHash;
    delete userResponse.otpCodeHash;
    delete userResponse.otpExpiresAt;

    return res.status(201).json({
      message: "Admin user registered successfully",
      user: userResponse,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Server error" });
  }
};

// Send reset OTP
exports.sendResetOtp = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: "Missing email" });

    const user = await User.findOne({ where: { email: email.toLowerCase() } });
    if (!user) {
      return res.json({
        message: "If that email exists, an OTP has been sent.",
      });
    }

    const otp = generateOtp(6);
    user.resetOtpCodeHash = sha256(otp);
    user.resetOtpExpiresAt = new Date(Date.now() + OTP_TTL_MINUTES * 60 * 1000);
    user.resetOtpAttempts = 0;
    await user.save();

    const subject = `Your password reset verification code`;
    const text = `Your verification code is ${otp}. It expires in 10 minutes. If you didn't request this, ignore this email.`;

    try {
      await sendMail({ to: user.email, subject, text });
    } catch (mailErr) {
      console.error("Mail error:", mailErr);
    }

    return res.json({ message: "Verification code sent to email." });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Server error" });
  }
};

// Verify reset OTP
exports.verifyResetOtp = async (req, res) => {
  try {
    const { email, otp } = req.body;
    if (!email || !otp) {
      return res.status(400).json({ error: "Missing fields" });
    }

    const user = await User.findOne({ where: { email: email.toLowerCase() } });
    if (!user || !user.resetOtpCodeHash) {
      return res.status(400).json({ error: "Invalid OTP or session" });
    }

    if (new Date() > user.resetOtpExpiresAt) {
      user.resetOtpCodeHash = null;
      user.resetOtpExpiresAt = null;
      user.resetOtpAttempts = 0;
      await user.save();
      return res.status(400).json({ error: "OTP expired" });
    }

    if (user.resetOtpAttempts >= OTP_MAX_ATTEMPTS) {
      user.resetOtpCodeHash = null;
      user.resetOtpExpiresAt = null;
      user.resetOtpAttempts = 0;
      await user.save();
      return res.status(400).json({ error: "OTP attempts exceeded" });
    }

    const otpHash = sha256(otp);
    if (otpHash !== user.resetOtpCodeHash) {
      user.resetOtpAttempts += 1;
      await user.save();
      return res.status(400).json({ error: "Invalid OTP" });
    }

    user.resetVerified = true;
    user.resetOtpCodeHash = null;
    user.resetOtpExpiresAt = null;
    user.resetOtpAttempts = 0;
    await user.save();

    return res.json({ message: "OTP verified. You may reset password now." });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Server error" });
  }
};

exports.createUserForEmployee = async (employee, options = {}) => {
  const { Op } = require("sequelize");
  const validator = require("validator");
  const crypto = require("crypto");
  const bcrypt = require("bcryptjs");

  // Check if user already exists
  const existingUser = await User.findOne({
    where: { employeeId: employee.employeeId },
  });

  if (existingUser) {
    return { userExists: true };
  }

  // Get email from employee
  const email = (
    employee.contactWorkEmail ||
    employee.contactPersonalEmail ||
    ""
  )
    .toString()
    .trim()
    .toLowerCase();

  if (!email || !validator.isEmail(email)) {
    const err = new Error(
      "Valid work or personal email is required to create user account",
    );
    err.code = "EMAIL_REQUIRED";
    throw err;
  }

  // Build name from employee data
  const name =
    employee.personLegalNameFullName ||
    [
      employee.personLegalNameFirstName,
      employee.personLegalNameMiddleName,
      employee.personLegalNameLastName,
    ]
      .filter(Boolean)
      .join(" ")
      .trim() ||
    "Employee";

  // Determine department from assignments if available
  let department = options.department;
  if (!department && employee.assignments && employee.assignments.length > 0) {
    department = employee.assignments[0]?.organization?.departmentName;
  }

  // Determine role
  let allowedRoles = ["Admin", "Employee", "Manager", "Incharge", "Executive"];
  try {
    const RoleModel = require("../models/Settings/Roles_model");
    const rolesFromDB = await RoleModel.findAll({
      attributes: ["name"],
    });
    if (rolesFromDB && rolesFromDB.length > 0) {
      allowedRoles = rolesFromDB.map((r) => r.name);
    }
  } catch (roleErr) {
    console.error("Error fetching roles in createUserForEmployee:", roleErr);
  }

  const role = allowedRoles.includes(options.role) ? options.role : "Employee";

  // Generate temporary password and setup token
  const tempPassword = crypto.randomBytes(16).toString("hex");
  const passwordHash = await bcrypt.hash(tempPassword, 10);

  const rawToken = crypto.randomBytes(32).toString("hex");
  const sha256 = (data) =>
    crypto.createHash("sha256").update(data).digest("hex");
  const TOKEN_EXP_MINUTES = {
    SETUP: 60,
  };

  // Create user
  const user = await User.create({
    name,
    email,
    employeeId: employee.employeeId,
    passwordHash,
    role,
    ...(department && { department }),
    setupTokenHash: sha256(rawToken),
    setupTokenExpiresAt: new Date(
      Date.now() + TOKEN_EXP_MINUTES.SETUP * 60 * 1000,
    ),
    setupTokenUsed: false,
  });

  // Update employee with user ID
  await employee.update({
    userId: user.id,
  });

  // Send setup email
  const frontendUrl = (
    process.env.FRONTEND_URL || "http://localhost:5173"
  ).replace(/\/$/, "");
  const setupUrl = `${frontendUrl}/setup-password?uid=${user.id}&token=${rawToken}`;
  const appName = process.env.APP_NAME || "Our Application";

  const subject = `Set your password for ${appName}`;
  const text = `
Dear ${user.name},

Thank you for joining ${appName}. We have created an account for you with the following details:

Username: ${user.employeeId}
Role: ${user.role}
Department: ${department || "Not specified"}

To complete your registration, please follow these steps:

1. Click on the following link to set your password:
   ${setupUrl}

Important notes:
- This link will expire in ${TOKEN_EXP_MINUTES.SETUP} minutes.
- You must use this link to set your password.
- If you did not request this account, please contact IT Support immediately.

If you encounter any issues, please reach out to your HR representative or IT Support team.

Best regards,
The ${appName} Team
`;

  let emailSent = true;
  let mailError = null;

  try {
    const { sendMail } = require("../utils/email");
    await sendMail({ to: user.email, subject, text });
  } catch (mailErr) {
    console.error("Setup email failed for user", user.email, mailErr);
    emailSent = false;
    mailError = mailErr.message || String(mailErr);
  }

  return {
    userExists: false,
    user,
    emailSent,
    mailError,
  };
};
