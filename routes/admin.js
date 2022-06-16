const express = require('express');
const router = express.Router();
const adminCtrl = require('../controllers/admin');
const multer = require('../middleware/multer-config');
const gm = require('../middleware/gm-config');

router.get("/", adminCtrl.afficheHtml);

router.post('/zman-chol', adminCtrl.saveZmanChol);

router.post('/zman-shabat', adminCtrl.saveZmanShbt);

router.post('/pdf', multer, gm, adminCtrl.savePdf)




module.exports = router;