const express = require('express');
const router = express.Router();
const adminCtrl = require('../controllers/admin');


router.get("/", adminCtrl.afficheHtml);



module.exports = router;