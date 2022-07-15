const express = require('express');
const router = express.Router();
const adminCtrl = require('../controllers/admin');
const gm = require('../middleware/gm-config');
const gmshellConfig1 = require('../middleware/gmshell-config1');
const gmshellConfig2 = require('../middleware/gmshell-config2');
const gmshellConfig3 = require('../middleware/gmshell-config3');
const gmshellConfig4 = require('../middleware/gmshell-config4');
const multerConfig2 = require('../middleware/multer-config2');
const multerConfig3 = require('../middleware/multer-config3');
const multerConfig4 = require('../middleware/multer-config4');
const multerConfig1 = require('../middleware/multer-config1');
const fs = require("fs");
router.get("/", adminCtrl.afficheHtml);

router.post('/zman-chol', adminCtrl.saveZmanChol);

router.post('/zman-shabat', adminCtrl.saveZmanShbt);

router.post('/pdf1', multerConfig1, gmshellConfig1, adminCtrl.savePdf)

// router.post('/pdf1', (req, res, next) => {
//     console.log(req.file);
//     console.log(req.body);
//     res.json({coucou: 'coucou'})
// })

router.post('/pdf2', multerConfig2, gmshellConfig2, adminCtrl.savePdf)

router.post('/pdf3', multerConfig3, gmshellConfig3, adminCtrl.savePdf)

router.post('/pdf4', multerConfig4, gmshellConfig4, adminCtrl.savePdf)




module.exports = router;