const express = require('express');
const router = express.Router();
const zmanCtrl = require('../controllers/zmanim');


router.get("/jerusalem", zmanCtrl.envoyerZmanDuJour);

router.get('/zman-chol', zmanCtrl.envoyerZmanChol);

router.get('/zman-shabat', zmanCtrl.envoyerZmanShbt);

router.get("/info", zmanCtrl.envoyerInfoDuJour);

router.get('/pdf1', zmanCtrl.envoyerImg1)

router.get('/pdf2', zmanCtrl.envoyerImg2)

router.get('/pdf3', zmanCtrl.envoyerImg3)

router.get('/pdf4', zmanCtrl.envoyerImg4)


module.exports = router;