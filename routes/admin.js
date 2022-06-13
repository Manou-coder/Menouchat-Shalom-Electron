const express = require('express');
const router = express.Router();
const adminCtrl = require('../controllers/admin');


router.get("/", adminCtrl.afficheHtml);

router.post('/zman-chol', adminCtrl.saveZmanChol);

router.post('/zman-shabat', adminCtrl.saveZmanShbt);


module.exports = router;