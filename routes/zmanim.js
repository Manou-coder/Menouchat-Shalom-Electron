const express = require("express");
const router = express.Router();
const zmanCtrl = require("../controllers/zmanim");

router.get("/jerusalem", zmanCtrl.envoyerZmanDuJour);

router.get("/info", zmanCtrl.envoyerInfoDuJour);

router.get("/zman-chol", zmanCtrl.sendZmanChol);

router.get("/zman-shabat", zmanCtrl.sendZmanShbt);

router.get("/get-reload", zmanCtrl.sendReload);

router.get("/checkbox", zmanCtrl.sendCheckbox);

router.get("/images-display", zmanCtrl.sendNameOfImages);

module.exports = router;
