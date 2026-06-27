// // auth.js
// const jwt = require("jsonwebtoken");
// const User = require("../models/User");
// const RefreshToken = require("../models/RefreshToken");

// const createAccessToken = (user) => {
//   const payload = {
//     sub: user._id.toString(),
//     role: user.role,
//     email: user.email,
//     employeeId: user.employeeId,
//   };
//   return jwt.sign(payload, process.env.JWT_ACCESS_SECRET, {
//     expiresIn: process.env.ACCESS_TOKEN_EXP || "15m",
//   });
// };

// const createRefreshToken = (tokenId, user) => {
//   return jwt.sign(
//     {
//       tokenId,
//       userId: user._id.toString(),
//       role: user.role,
//     },
//     process.env.JWT_REFRESH_SECRET,
//     {
//       expiresIn: process.env.REFRESH_TOKEN_EXP || "7d",
//     },
//   );
// };

// // MAIN AUTHENTICATION MIDDLEWARE - Keep original logic
// const authenticateToken = async (req, res, next) => {
//   try {
//     const authHeader = req.headers["authorization"];
//     if (!authHeader) return res.status(401).json({ error: "Missing token" });
//     const token = authHeader.split(" ")[1];
//     const decoded = jwt.verify(token, process.env.JWT_ACCESS_SECRET);

//     // Keep original logic - attach decoded JWT payload
//     req.user = {
//       ...decoded,
//     };

//     // OPTIONAL: Also attach user ID for convenience
//     req.userId = decoded.sub;

//     next();
//   } catch (err) {
//     return res.status(401).json({ error: "Invalid or expired token" });
//   }
// };

// // Alias for backward compatibility
// const authenticate = authenticateToken;

// // NEW: Helper middleware that attaches full User document when needed
// const attachUserDocument = async (req, res, next) => {
//   try {
//     if (!req.user || !req.user.sub) {
//       return next(); // No user to attach
//     }

//     // Fetch and attach full user document
//     const userDoc = await User.findById(req.user.sub).select(
//       "-passwordHash -otp",
//     );
//     if (userDoc) {
//       req.userDoc = userDoc; // Attach as separate property
//       req.user.employeeId = userDoc.employeeId; // Update employeeId if missing
//     }

//     next();
//   } catch (err) {
//     console.error("Error attaching user document:", err);
//     next(); // Continue even if this fails
//   }
// };

// // Combined middleware for acknowledgment routes
// const authenticateWithUserDoc = [authenticateToken, attachUserDocument];

// // Admin middleware with original logic
// const requireAdmin = async (req, res, next) => {
//   try {
//     const authHeader = req.headers["authorization"];
//     if (!authHeader) return res.status(401).json({ error: "Missing token" });
//     const token = authHeader.split(" ")[1];
//     const decoded = jwt.verify(token, process.env.JWT_ACCESS_SECRET);

//     if (decoded.role !== "Admin") {
//       return res.status(403).json({ error: "Admin access required" });
//     }

//     const user = await User.findById(decoded.sub).select("-passwordHash -otp");
//     if (!user || user.role !== "Admin") {
//       return res.status(403).json({ error: "Admin access required" });
//     }

//     req.user = user; // Attach user doc for admin routes (if needed)
//     next();
//   } catch (err) {
//     return res.status(401).json({ error: "Invalid or expired token" });
//   }
// };

// // Employee middleware with original logic
// const requireEmployee = async (req, res, next) => {
//   try {
//     const authHeader = req.headers["authorization"];
//     if (!authHeader) return res.status(401).json({ error: "Missing token" });
//     const token = authHeader.split(" ")[1];
//     const decoded = jwt.verify(token, process.env.JWT_ACCESS_SECRET);

//     if (!["Employee", "Admin", "Manager"].includes(decoded.role)) {
//       return res
//         .status(403)
//         .json({ error: "Employee or Admin access required" });
//     }

//     const user = await User.findById(decoded.sub).select("-passwordHash -otp");
//     if (!user || !["Employee", "Admin", "Manager"].includes(user.role)) {
//       return res
//         .status(403)
//         .json({ error: "Employee or Admin access required" });
//     }

//     req.user = user;
//     next();
//   } catch (err) {
//     return res.status(401).json({ error: "Invalid or expired token" });
//   }
// };

// // Admin or Manager middleware
// const requireAdminOrManager = async (req, res, next) => {
//   try {
//     const authHeader = req.headers["authorization"];
//     if (!authHeader) return res.status(401).json({ error: "Missing token" });
//     const token = authHeader.split(" ")[1];
//     const decoded = jwt.verify(token, process.env.JWT_ACCESS_SECRET);

//     if (!["Admin", "Manager"].includes(decoded.role)) {
//       return res
//         .status(403)
//         .json({ error: "Admin or Manager access required" });
//     }

//     const user = await User.findById(decoded.sub).select("-passwordHash -otp");
//     if (!user || !["Admin", "Manager"].includes(user.role)) {
//       return res
//         .status(403)
//         .json({ error: "Admin or Manager access required" });
//     }

//     req.user = user;
//     next();
//   } catch (err) {
//     return res.status(401).json({ error: "Invalid or expired token" });
//   }
// };

// // Role-based authorization middleware
// const authorize = (roles = []) => {
//   return (req, res, next) => {
//     if (!req.user) {
//       return res.status(401).json({ error: "Authentication required" });
//     }

//     const userRole = req.user.role?.toLowerCase();
//     const normalizedRoles = roles.map((role) => role.toLowerCase());

//     if (normalizedRoles.length === 0) {
//       return next();
//     }

//     if (normalizedRoles.includes(userRole)) {
//       return next();
//     }

//     if (userRole === "employee") {
//       if (userRole === "Employee") {
//         const employeeId = req.params.employeeId || req.body.employeeId;
//         if (employeeId && employeeId === req.user.employeeId) {
//           return next();
//         }
//       }

//       return res.status(403).json({ error: "Insufficient permissions" });
//     }
//   };
// };

// // auth.js - Add this new middleware
// const requireProfileAccess = async (req, res, next) => {
//   try {
//     const authHeader = req.headers["authorization"];
//     if (!authHeader) return res.status(401).json({ error: "Missing token" });
//     const token = authHeader.split(" ")[1];
//     const decoded = jwt.verify(token, process.env.JWT_ACCESS_SECRET);

//     // Allow access for Employee, Admin, and Manager roles
//     if (!["Employee", "Admin", "Manager"].includes(decoded.role)) {
//       return res
//         .status(403)
//         .json({ error: "Insufficient permissions to access profile" });
//     }

//     const user = await User.findById(decoded.sub).select("-passwordHash -otp");
//     if (!user || !["Employee", "Admin", "Manager"].includes(user.role)) {
//       return res
//         .status(403)
//         .json({ error: "Insufficient permissions to access profile" });
//     }

//     req.user = user;
//     next();
//   } catch (err) {
//     return res.status(401).json({ error: "Invalid or expired token" });
//   }
// };

// // Role check helpers
// const isAdmin = (user) => user?.role?.toLowerCase() === "admin";
// const isEmployee = (user) => user?.role?.toLowerCase() === "employee";
// const isManager = (user) => user?.role?.toLowerCase() === "manager";

// module.exports = {
//   createAccessToken,
//   createRefreshToken,
//   authenticateToken,
//   authenticate,
//   attachUserDocument, // NEW: For routes that need user document
//   authenticateWithUserDoc, // NEW: Combined middleware
//   requireAdmin,
//   requireEmployee,
//   requireAdminOrManager,
//   authorize,
//   isAdmin,
//   isEmployee,
//   isManager,
//   requireProfileAccess,
// };



const jwt = require("jsonwebtoken");
const { Op } = require('sequelize');
const User = require("../models/User");
const RefreshToken = require("../models/RefreshToken");

// Create Access Token
const createAccessToken = (user) => {
  const payload = {
    sub: user.id,
    role: user.role,
    email: user.email,
    employeeId: user.employeeId,
  };
  return jwt.sign(payload, process.env.JWT_ACCESS_SECRET, {
    expiresIn: process.env.ACCESS_TOKEN_EXP || "15m",
  });
};

// Create Refresh Token
const createRefreshToken = (tokenId, user) => {
  return jwt.sign(
    {
      tokenId,
      userId: user.id,
      role: user.role,
    },
    process.env.JWT_REFRESH_SECRET,
    {
      expiresIn: process.env.REFRESH_TOKEN_EXP || "7d",
    },
  );
};

// MAIN AUTHENTICATION MIDDLEWARE
const authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers["authorization"];
    if (!authHeader) return res.status(401).json({ error: "Missing token" });
    const token = authHeader.split(" ")[1];
    const decoded = jwt.verify(token, process.env.JWT_ACCESS_SECRET);

    // Attach decoded JWT payload
    req.user = {
      ...decoded,
    };

    // Attach user ID for convenience
    req.userId = decoded.sub;

    next();
  } catch (err) {
    return res.status(401).json({ error: "Invalid or expired token" });
  }
};

// Alias for backward compatibility
const authenticate = authenticateToken;

// Helper middleware that attaches full User document when needed
const attachUserDocument = async (req, res, next) => {
  try {
    if (!req.user || !req.user.sub) {
      return next(); // No user to attach
    }

    // Fetch and attach full user document
    const userDoc = await User.findByPk(req.user.sub, {
      attributes: { exclude: ['passwordHash', 'otp'] }
    });
    
    if (userDoc) {
      req.userDoc = userDoc; // Attach as separate property
      req.user.employeeId = userDoc.employeeId; // Update employeeId if missing
    }

    next();
  } catch (err) {
    console.error("Error attaching user document:", err);
    next(); // Continue even if this fails
  }
};

// Combined middleware for routes that need full user document
const authenticateWithUserDoc = [authenticateToken, attachUserDocument];

// Admin middleware
const requireAdmin = async (req, res, next) => {
  try {
    const authHeader = req.headers["authorization"];
    if (!authHeader) return res.status(401).json({ error: "Missing token" });
    const token = authHeader.split(" ")[1];
    const decoded = jwt.verify(token, process.env.JWT_ACCESS_SECRET);

    if (decoded.role !== "Admin") {
      return res.status(403).json({ error: "Admin access required" });
    }

    const user = await User.findByPk(decoded.sub, {
      attributes: { exclude: ['passwordHash', 'otp'] }
    });
    
    if (!user || user.role !== "Admin") {
      return res.status(403).json({ error: "Admin access required" });
    }

    req.user = user; // Attach user doc for admin routes
    next();
  } catch (err) {
    return res.status(401).json({ error: "Invalid or expired token" });
  }
};

// Employee middleware (allows Employee, Admin, Manager)
const requireEmployee = async (req, res, next) => {
  try {
    const authHeader = req.headers["authorization"];
    if (!authHeader) return res.status(401).json({ error: "Missing token" });
    const token = authHeader.split(" ")[1];
    const decoded = jwt.verify(token, process.env.JWT_ACCESS_SECRET);

    if (!["Employee", "Admin", "Manager"].includes(decoded.role)) {
      return res
        .status(403)
        .json({ error: "Employee, Admin, or Manager access required" });
    }

    const user = await User.findByPk(decoded.sub, {
      attributes: { exclude: ['passwordHash', 'otp'] }
    });
    
    if (!user || !["Employee", "Admin", "Manager"].includes(user.role)) {
      return res
        .status(403)
        .json({ error: "Employee, Admin, or Manager access required" });
    }

    req.user = user;
    next();
  } catch (err) {
    return res.status(401).json({ error: "Invalid or expired token" });
  }
};

// Admin or Manager middleware
const requireAdminOrManager = async (req, res, next) => {
  try {
    const authHeader = req.headers["authorization"];
    if (!authHeader) return res.status(401).json({ error: "Missing token" });
    const token = authHeader.split(" ")[1];
    const decoded = jwt.verify(token, process.env.JWT_ACCESS_SECRET);

    if (!["Admin", "Manager"].includes(decoded.role)) {
      return res
        .status(403)
        .json({ error: "Admin or Manager access required" });
    }

    const user = await User.findByPk(decoded.sub, {
      attributes: { exclude: ['passwordHash', 'otp'] }
    });
    
    if (!user || !["Admin", "Manager"].includes(user.role)) {
      return res
        .status(403)
        .json({ error: "Admin or Manager access required" });
    }

    req.user = user;
    next();
  } catch (err) {
    return res.status(401).json({ error: "Invalid or expired token" });
  }
};

// Profile access middleware (allows Employee, Admin, Manager to access profiles)
const requireProfileAccess = async (req, res, next) => {
  try {
    const authHeader = req.headers["authorization"];
    if (!authHeader) return res.status(401).json({ error: "Missing token" });
    const token = authHeader.split(" ")[1];
    const decoded = jwt.verify(token, process.env.JWT_ACCESS_SECRET);

    // Allow access for Employee, Admin, and Manager roles
    if (!["Employee", "Admin", "Manager"].includes(decoded.role)) {
      return res
        .status(403)
        .json({ error: "Insufficient permissions to access profile" });
    }

    const user = await User.findByPk(decoded.sub, {
      attributes: { exclude: ['passwordHash', 'otp'] }
    });
    
    if (!user || !["Employee", "Admin", "Manager"].includes(user.role)) {
      return res
        .status(403)
        .json({ error: "Insufficient permissions to access profile" });
    }

    req.user = user;
    next();
  } catch (err) {
    return res.status(401).json({ error: "Invalid or expired token" });
  }
};

// Role-based authorization middleware factory
const authorize = (roles = []) => {
  return async (req, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: "Authentication required" });
      }

      // If req.user has the full document, use that, otherwise fetch it
      let user = req.user;
      if (!user.id && user.sub) {
        user = await User.findByPk(user.sub, {
          attributes: { exclude: ['passwordHash', 'otp'] }
        });
        if (!user) {
          return res.status(401).json({ error: "User not found" });
        }
      }

      const userRole = user.role?.toLowerCase();
      const normalizedRoles = roles.map((role) => role.toLowerCase());

      // If no specific roles required, allow access
      if (normalizedRoles.length === 0) {
        req.user = user;
        return next();
      }

      // Check if user role matches required roles
      if (normalizedRoles.includes(userRole)) {
        req.user = user;
        return next();
      }

      // Special case for employees accessing their own data
      if (userRole === "employee") {
        const employeeId = req.params.employeeId || req.body.employeeId;
        if (employeeId && employeeId === user.employeeId) {
          req.user = user;
          return next();
        }
      }

      return res.status(403).json({ error: "Insufficient permissions" });
    } catch (err) {
      console.error("Authorization error:", err);
      return res.status(500).json({ error: "Authorization failed" });
    }
  };
};

// Role check helpers
const isAdmin = (user) => user?.role?.toLowerCase() === "admin";
const isEmployee = (user) => user?.role?.toLowerCase() === "employee";
const isManager = (user) => user?.role?.toLowerCase() === "manager";

// Refresh token middleware
const refreshToken = async (req, res, next) => {
  try {
    const { refreshToken } = req.body;
    
    if (!refreshToken) {
      return res.status(400).json({ error: "Refresh token required" });
    }

    // Verify the refresh token
    const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
    
    // Check if token exists in database
    const tokenRecord = await RefreshToken.findOne({
      where: {
        tokenId: decoded.tokenId,
        userId: decoded.userId,
        isRevoked: false,
        expiresAt: { [Op.gt]: new Date() }
      }
    });

    if (!tokenRecord) {
      return res.status(401).json({ error: "Invalid refresh token" });
    }

    // Get user
    const user = await User.findByPk(decoded.userId, {
      attributes: { exclude: ['passwordHash', 'otp'] }
    });

    if (!user) {
      return res.status(401).json({ error: "User not found" });
    }

    // Generate new tokens
    const newAccessToken = createAccessToken(user);
    const newTokenId = `rt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const newRefreshToken = createRefreshToken(newTokenId, user);

    // Revoke old refresh token
    await tokenRecord.update({ isRevoked: true });

    // Save new refresh token
    await RefreshToken.create({
      tokenId: newTokenId,
      userId: user.id,
      token: newRefreshToken,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
      createdAt: new Date(),
      isRevoked: false
    });

    req.tokens = {
      accessToken: newAccessToken,
      refreshToken: newRefreshToken
    };
    
    next();
  } catch (err) {
    if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
      return res.status(401).json({ error: "Invalid or expired refresh token" });
    }
    console.error("Refresh token error:", err);
    return res.status(500).json({ error: "Token refresh failed" });
  }
};

// Logout middleware (revoke refresh token)
const logout = async (req, res, next) => {
  try {
    const { refreshToken } = req.body;
    
    if (!refreshToken) {
      return res.status(400).json({ error: "Refresh token required" });
    }

    // Decode without verification to get tokenId
    const decoded = jwt.decode(refreshToken);
    
    if (decoded && decoded.tokenId) {
      // Revoke the token
      await RefreshToken.update(
        { isRevoked: true },
        { 
          where: { 
            tokenId: decoded.tokenId,
            userId: decoded.userId
          } 
        }
      );
    }

    next();
  } catch (err) {
    console.error("Logout error:", err);
    // Continue even if token revocation fails
    next();
  }
};

module.exports = {
  createAccessToken,
  createRefreshToken,
  authenticateToken,
  authenticate,
  attachUserDocument,
  authenticateWithUserDoc,
  requireAdmin,
  requireEmployee,
  requireAdminOrManager,
  requireProfileAccess,
  authorize,
  isAdmin,
  isEmployee,
  isManager,
  refreshToken,
  logout,
};