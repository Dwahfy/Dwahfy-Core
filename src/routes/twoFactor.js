const express = require('express');
const {
  setup,
  confirm,
  disable,
  verify,
  recoverEmail,
  recoverEmailVerify,
  recoverBackup,
  disableViaEmail,
  confirmDisable,
} = require('../controllers/twoFactorController');

const router = express.Router();

router.post('/2fa/setup', setup);
router.post('/2fa/confirm', confirm);
router.post('/2fa/disable', disable);
router.post('/2fa/verify', verify);
router.post('/2fa/recover/email', recoverEmail);
router.post('/2fa/recover/email/verify', recoverEmailVerify);
router.post('/2fa/recover/backup', recoverBackup);
router.post('/2fa/disable-via-email', disableViaEmail);
router.post('/2fa/confirm-disable', confirmDisable);

module.exports = router;
