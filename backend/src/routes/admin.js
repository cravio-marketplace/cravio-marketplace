const router = require('express').Router();
const { verifyAdmin } = require('../middleware/adminAuth');
const {
    resetVendorActivation,
    createVendorSettlement,
} = require('../controllers/admin.controller');

router.patch('/vendors/:vendorId/reset-activation', verifyAdmin, resetVendorActivation);
router.post('/vendors/:vendorId/settlements', verifyAdmin, createVendorSettlement);

module.exports = router;
