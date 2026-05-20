const router = require('express').Router();
const { verify, requireRole } = require('../middleware/auth');
const ctrl = require('../controllers/factures.controller');

router.use(verify);

router.get('/', ctrl.list);
router.post('/', requireRole('administrateur', 'commercial', 'comptable'), ctrl.create);
router.get('/:id', ctrl.get);
router.put('/:id', requireRole('administrateur', 'comptable'), ctrl.update);
router.delete('/:id', requireRole('administrateur'), ctrl.remove);
router.post('/:id/paiement', requireRole('administrateur', 'comptable'), ctrl.addPaiement);
router.get('/:id/pdf', ctrl.pdf);
router.post('/:id/relancer', requireRole('administrateur', 'commercial', 'comptable'), ctrl.relancer);

module.exports = router;
