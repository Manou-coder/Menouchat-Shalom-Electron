const multer = require("multer");
const fs = require('fs');

exports.afficheHtml = (req, res, next) => {
  res.sendFile(process.cwd() + "/views/index.html");
};




exports.saveZmanChol = (req, res, next) => {
  let zmanChol;
  zmanChol = req.body;
  exports.zmanChol = zmanChol;
  
  zmanChol = JSON.stringify(zmanChol, null, 2);
  fs.writeFileSync('./horaires/zmanChol.txt', zmanChol);
  zmanChol = JSON.parse(zmanChol);
  fs.readFileSync('./horaires/zmanChol.txt', zmanChol)
  console.log(zmanChol);

  res.json({
    message: "Les changements ont bien été pris en compte",
    zmanChol,
  });
};

exports.saveZmanShbt = (req, res, next) => {
  let zmanShbt;
  zmanShbt = req.body;
  exports.zmanShbt = zmanShbt;

  zmanShbt = JSON.stringify(zmanShbt, null, 2);
  fs.writeFileSync('./horaires/zmanShbt.txt', zmanShbt);
  zmanShbt = JSON.parse(zmanShbt);
  fs.readFileSync('./horaires/zmanShbt.txt', zmanShbt)
  console.log(zmanShbt);

  res.json({
    message: "Les changements ont bien été pris en compte",
    zmanShbt,
  });
  // res.redirect('back').json({message: "Les changements ont bien été pris en compte", zmanShbt})
};

exports.savePdf = (req, res, next) => {
  // console.log(req.file);
  if (req.file === undefined) {
    return res
      .status(404)
      .json({ erreur: "Aucun document n'a été fourni. Veuillez réessayer." });
  }
  res.json({
    message: "Les changements ont bien été pris en compte",
    originalname: req.file.originalname,
    path: req.file.path,
  });
};
