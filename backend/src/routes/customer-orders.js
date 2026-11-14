const router = require('express').Router();
const { verifyCustomer } = require('../middleware/customerAuth');
const ctrl = require('../controllers/customer-orders.controller');

router.get('/fee-preview', verifyCustomer, ctrl.feePreview);
router.post('/', verifyCustomer, ctrl.create);
router.get('/', verifyCustomer, ctrl.listMine);
router.get('/:orderId', verifyCustomer, ctrl.getMine);

module.exports = router;
