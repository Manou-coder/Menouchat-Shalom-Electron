const express = require('express');
const router = express.Router();
const zmanCtrl = require('../controllers/zmanim');


router.get("/jerusalem", zmanCtrl.envoyerZmanDuJour);

router.get('/zman-chol', zmanCtrl.envoyerZmanChol);

router.get('/zman-shabat', zmanCtrl.envoyerZmanShbt);

router.get('/pdf', zmanCtrl.envoyerImg)


module.exports = router;