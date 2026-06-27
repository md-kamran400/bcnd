// routes/auth.js
const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { authenticateToken, requireAdmin } = require('../middleware/auth');

// Public routes
router.post('/register', authController.register);
router.post('/login', authController.loginSendOtp);
router.post('/verify-otp', authController.verifyOtp);
router.post('/refresh', authController.refresh);
router.post('/logout', authController.logout);
router.get('/me', authenticateToken, authController.me);
router.post('/forgot-password', authController.forgotPassword);
router.post('/reset-password', authController.resetPassword);
router.get('/verify-reset-token', authController.verifyResetToken);

// Setup password routes
router.get('/verify-setup-token', authController.verifySetupToken);
router.post('/setup-password', authController.setupPassword);

// Admin routes
router.post('/admin/register', requireAdmin, authController.adminRegister);
router.get('/admin/users', authController.getAllUsers);
router.get('/admin/users/:userId', requireAdmin, authController.getUserById);
router.patch('/admin/users/:userId', requireAdmin, authController.updateUser);
router.delete('/admin/users/:userId', requireAdmin, authController.deleteUser);
// router.post('/admin/create-user', requireAdmin, authController.adminCreateUserWithSetup);

router.post('/admin/create-user',  authController.adminCreateUserWithSetup);

module.exports = router;