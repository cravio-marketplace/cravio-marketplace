const router = require('express').Router();
const { verifyVendor } = require('../middleware/auth');
const { list, create } = require('../controllers/support.controller');

router.get('/tickets', verifyVendor, list);
router.post('/tickets', verifyVendor, create);

module.exports = router;
