const router = require('express').Router();
const { verifyAdmin } = require('../middleware/adminAuth');
const {
    resetVendorActivation,
    getVendorSettlementSummary,
    createVendorSettlement,
} = require('../controllers/admin.controller');

router.patch('/vendors/:vendorId/reset-activation', verifyAdmin, resetVendorActivation);
router.get('/vendors/:vendorId/settlements/summary', verifyAdmin, getVendorSettlementSummary);
router.post('/vendors/:vendorId/settlements', verifyAdmin, createVendorSettlement);

module.exports = router;
