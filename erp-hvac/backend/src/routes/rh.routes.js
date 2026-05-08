const router = require('express').Router();
const ctrl = require('../controllers/rh.controller');
const { requireRole } = require('../middleware/auth');

const admin = requireRole('administrateur');
const rh    = requireRole('administrateur', 'commercial');

router.get('/alertes-documents', rh, ctrl.alertesDocuments);

router.get('/employes',       rh,    ctrl.listEmployes);
router.get('/employes/:id',   rh,    ctrl.getEmploye);
router.post('/employes',      admin, ctrl.createEmploye);
router.put('/employes/:id',   admin, ctrl.updateEmploye);
router.delete('/employes/:id',admin, ctrl.deleteEmploye);

router.get('/conges',         rh,    ctrl.listConges);
router.post('/conges',        rh,    ctrl.createConge);
router.patch('/conges/:id/statut', admin, ctrl.updateCongeStatut);
router.delete('/conges/:id',  admin, ctrl.deleteConge);

router.get('/pointages',      rh,    ctrl.listPointages);
router.post('/pointages',     rh,    ctrl.createPointage);
router.delete('/pointages/:id', admin, ctrl.deletePointage);

module.exports = router;
