const express = require('express');
const {
  startSignup,
  verifyOtp,
  registerAccount,
  login,
  listAccounts,
  switchAccount,
  changePassword,
  requestEmailChange,
  confirmEmailChange,
  requestPasswordReset,
  confirmPasswordReset,
  logout,
  rateLimitInfo,
} = require('../controllers/authController');

const router = express.Router();

router.post('/start', startSignup);
router.post('/verify-otp', verifyOtp);
router.post('/register', registerAccount);
router.post('/login', login);
router.post('/accounts', listAccounts);
router.post('/switch', switchAccount);
router.post('/change-password', changePassword);
router.post('/request-email-change', requestEmailChange);
router.post('/confirm-email-change', confirmEmailChange);
router.post('/request-password-reset', requestPasswordReset);
router.post('/confirm-password-reset', confirmPasswordReset);
router.post('/logout', logout);
router.get('/rate-limit', rateLimitInfo);

module.exports = router;
