const express = require('express');
const router = express.Router();
const zmanCtrl = require('../controllers/zmanim');


router.get("/jerusalem", zmanCtrl.envoyerZman);



module.exports = router;