const router = require('express').Router();
const ctrl = require('../controllers/vehicules.controller');
const { requireRole } = require('../middleware/auth');

const mgr   = requireRole('administrateur', 'commercial');
const admin = requireRole('administrateur');

router.get('/alertes',                   mgr,   ctrl.alertes);
router.get('/',                          mgr,   ctrl.listVehicules);
router.get('/:id',                       mgr,   ctrl.getVehicule);
router.post('/',                         admin, ctrl.createVehicule);
router.put('/:id',                       admin, ctrl.updateVehicule);
router.delete('/:id',                    admin, ctrl.deleteVehicule);

router.post('/:vehiculeId/entretiens',   mgr,   ctrl.createEntretien);
router.delete('/entretiens/:id',         admin, ctrl.deleteEntretien);

router.post('/:vehiculeId/pleins',       mgr,   ctrl.createPlein);
router.delete('/pleins/:id',             admin, ctrl.deleteePlein);

module.exports = router;
