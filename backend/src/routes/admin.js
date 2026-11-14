const router = require('express').Router();
const { verifyAdmin } = require('../middleware/adminAuth');
const { resetVendorActivation } = require('../controllers/admin.controller');

router.patch('/vendors/:vendorId/reset-activation', verifyAdmin, resetVendorActivation);

module.exports = router;
