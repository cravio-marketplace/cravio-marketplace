const router = require('express').Router();
const { login, signup } = require('../controllers/auth.controller');
const { sendOtp, verifyOtp, flagSignup } = require('../controllers/otp.controller');

router.post('/login', login);
router.post('/signup', signup);
router.post('/send-otp', sendOtp);
router.post('/verify-otp', verifyOtp);
router.post('/flag-signup', flagSignup);

module.exports = router;