const router=require('express').Router();const {verifyAdmin,requireSuperAdmin}=require('../middleware/adminAuth');const ctrl=require('../controllers/admin.controller');
router.get('/dashboard',verifyAdmin,ctrl.getDashboard);router.get('/profile',verifyAdmin,ctrl.getAdminProfile);router.get('/audit-logs',verifyAdmin,ctrl.listAuditLogs);
router.patch('/vendors/:vendorId/reset-activation',verifyAdmin,requireSuperAdmin,ctrl.resetVendorActivation);
router.get('/vendors/:vendorId/settlements/summary',verifyAdmin,ctrl.getVendorSettlementSummary);
router.post('/vendors/:vendorId/settlements',verifyAdmin,requireSuperAdmin,ctrl.createVendorSettlement);
module.exports=router;