const router = require('express').Router();
const { verifyVendor } = require('../middleware/auth');
const ctrl = require('../controllers/keywords.controller');

router.get('/', verifyVendor, ctrl.list);
router.post('/', verifyVendor, ctrl.create);
router.delete('/:id', verifyVendor, ctrl.remove);

module.exports = router;
