const router = require('express').Router();
const { verifyVendor } = require('../middleware/auth');
const {
    getMe,
    updateProfile,
    updateStatus,
    togglePause,
    toggleSms,
    changePassword,
    dashboard,
} = require('../controllers/vendor.controller');

router.get('/me', verifyVendor, getMe);
router.put('/profile', verifyVendor, updateProfile);
router.patch('/status', verifyVendor, updateStatus);
router.patch('/toggle-pause', verifyVendor, togglePause);
router.patch('/toggle-sms', verifyVendor, toggleSms);
router.post('/change-password', verifyVendor, changePassword);
router.get('/dashboard', verifyVendor, dashboard);

module.exports = router;
