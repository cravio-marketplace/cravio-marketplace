const router = require('express').Router();
const { verifyVendor } = require('../middleware/auth');
const ctrl = require('../controllers/orders.controller');

router.get('/export.csv', verifyVendor, ctrl.exportCsv);
router.get('/', verifyVendor, ctrl.list);
router.get('/:orderId', verifyVendor, ctrl.getOne);
router.post('/:orderId/accept', verifyVendor, ctrl.accept);
router.post('/:orderId/ready', verifyVendor, ctrl.ready);
router.post('/:orderId/complete', verifyVendor, ctrl.complete);

module.exports = router;
