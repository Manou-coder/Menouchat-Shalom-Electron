const fs = require("fs");

exports.afficheHtml = (req, res, next) => {
  res.sendFile(process.cwd() + "/views/index.html");
};

exports.saveZmanChol = (req, res, next) => {
  let zmanChol = req.body;
  zmanChol = JSON.stringify(zmanChol, null, 2);
  fs.writeFileSync("./db/zmanChol.txt", zmanChol);
  res.json({
    message: "Les changements ont bien été pris en compte",
    zmanChol,
  });
};

exports.saveZmanShbt = (req, res, next) => {
  let zmanShbt = req.body;
  zmanShbt = JSON.stringify(zmanShbt, null, 2);
  fs.writeFileSync("./db/zmanShbt.txt", zmanShbt);
  res.json({
    message: "Les changements ont bien été pris en compte",
    zmanShbt,
  });
};

exports.savePdf = (req, res, next) => {
  console.log(req.body);
  console.log(req.files);
  res.json({ message: "Successfully uploaded files" });
};

exports.saveCheckbox = (req, res, next) => {
  let checkbox = req.body;
  console.log(checkbox);
  checkbox = JSON.stringify(checkbox, null, 2);
  fs.writeFileSync("./db/checkbox.txt", checkbox);
  res.json({ message: "Successfully uploaded files", body: req.body });
};

exports.saveReload = (req, res, next) => {
  let reloadDB = fs.readFileSync('./db/reload.txt');
  reloadDB = JSON.parse(reloadDB);
  console.log('reloadDB', reloadDB);
  let checkReload = reloadDB.reload;
  // console.log(checkReload);
  let inverse = {reload: !checkReload}
  console.log('inverse', inverse);
  inverse = JSON.stringify(inverse, null, 2);
  fs.writeFileSync('./db/reload.txt', inverse)
  res.json({ message: "Successfully reload", inverse });
};