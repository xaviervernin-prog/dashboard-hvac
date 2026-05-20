const router = require('express').Router();

router.use('/auth', require('./auth.routes'));
router.use('/clients', require('./clients.routes'));
router.use('/articles', require('./articles.routes'));
router.use('/devis', require('./devis.routes'));
router.use('/interventions', require('./interventions.routes'));
router.use('/factures', require('./factures.routes'));
router.use('/dashboard', require('./dashboard.routes'));
router.use('/rh', require('./rh.routes'));
router.use('/vehicules', require('./vehicules.routes'));

module.exports = router;
