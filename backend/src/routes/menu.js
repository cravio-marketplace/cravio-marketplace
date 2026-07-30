const router = require('express').Router();
const { verifyVendor } = require('../middleware/auth');
const ctrl = require('../controllers/menu.controller');

router.get('/', verifyVendor, ctrl.list);
router.post('/', verifyVendor, ctrl.create);
router.get('/:itemId', verifyVendor, ctrl.getOne);
router.put('/:itemId', verifyVendor, ctrl.update);
router.delete('/:itemId', verifyVendor, ctrl.remove);
router.patch('/:itemId/availability', verifyVendor, ctrl.toggleAvailability);
router.post('/:itemId/restock', verifyVendor, ctrl.restock);
router.get('/:itemId/stock-history', verifyVendor, ctrl.stockHistory);

module.exports = router;
