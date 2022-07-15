const { exec } = require("child_process");
const fs = require("fs");

const gm = require("gm").subClass({ imageMagick: false });

module.exports = (req, res, next) => {
  if (req.file === undefined) {
    return console.log("error il n'y a pas de pdf à transformer"), next();
  } else {
    let dossier = req.file.path;
    console.log(dossier + "couco");
    exec(
      `gm.exe convert -density 150 ${dossier}[0] -quality 100 "images/imageAffiche2.jpg"`,
      (error, stdout, stderr) => {
        if (error) {
          console.log(`error: ${error.message}`);
          return;
        }
        if (stderr) {
          console.log(`stderr: ${stderr}`);
          return;
        }
        console.log(`stdout: ${stdout}`);
      }
    );
    console.log("bjnkb");
  }
  next();
};
