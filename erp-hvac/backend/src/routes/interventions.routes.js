const router = require('express').Router();
const { verify, requireRole } = require('../middleware/auth');
const ctrl = require('../controllers/interventions.controller');

router.use(verify);

router.get('/', ctrl.list);
router.post('/', requireRole('administrateur', 'commercial'), ctrl.create);
router.get('/:id', ctrl.get);
router.put('/:id', requireRole('administrateur', 'commercial', 'technicien'), ctrl.update);
router.delete('/:id', requireRole('administrateur'), ctrl.remove);
router.post('/:id/cloturer', requireRole('administrateur', 'commercial', 'technicien'), ctrl.cloturer);
router.put('/:id/rapport', ctrl.rapport);
router.get('/:id/pdf', ctrl.pdf);

module.exports = router;
