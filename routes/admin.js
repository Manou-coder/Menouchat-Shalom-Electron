const express = require("express");
const router = express.Router();
const adminCtrl = require("../controllers/admin");
const multerConfig = require("../middleware/multer-config");
const gmshellConfig = require("../middleware/gmshell-config");

const fs = require("fs");

router.get("/", adminCtrl.afficheHtml);

router.post("/zman-chol", adminCtrl.saveZmanChol);

router.post("/zman-shabat", adminCtrl.saveZmanShbt);

router.post("/upload_pdf", multerConfig, gmshellConfig, adminCtrl.savePdf);

router.post("/checkbox", adminCtrl.saveCheckbox);

router.post("/reload", adminCtrl.saveReload);

module.exports = router;
