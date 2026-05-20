const router = require('express').Router();
const { verify, requireRole } = require('../middleware/auth');
const ctrl = require('../controllers/clients.controller');

router.use(verify);

router.get('/', ctrl.list);
router.post('/', requireRole('administrateur', 'commercial'), ctrl.create);
router.get('/:id', ctrl.get);
router.put('/:id', requireRole('administrateur', 'commercial'), ctrl.update);
router.delete('/:id', requireRole('administrateur'), ctrl.remove);

router.get('/:id/chantiers', ctrl.listChantiers);
router.post('/:id/chantiers', requireRole('administrateur', 'commercial'), ctrl.createChantier);
router.put('/:id/chantiers/:chantierId', requireRole('administrateur', 'commercial'), ctrl.updateChantier);
router.delete('/:id/chantiers/:chantierId', requireRole('administrateur'), ctrl.deleteChantier);

module.exports = router;
