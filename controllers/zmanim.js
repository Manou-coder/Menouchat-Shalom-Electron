const { zmanJerusalem } = require("../cities/zmanim");
const zmanVille = require("../cities/zmanim");
const zmanShbt = require("./admin");
const zmanAdmin = require("./admin");
const { eventsByDate } = require("../hebcal3");
const fs = require("fs");

exports.envoyerZmanDuJour = (req, res, next) => {
  res.json(zmanJerusalem());
};

exports.envoyerInfoDuJour = (req, res, next) => {
  res.json(eventsByDate());
};

exports.sendZmanChol = (req, res, next) => {
  let zmanChol = fs.readFileSync("./db/zmanChol.txt");
  zmanChol = JSON.parse(zmanChol);
  res.json(zmanChol);
};

exports.sendZmanShbt = (req, res, next) => {
  let zmanShbt = fs.readFileSync("./db/zmanShbt.txt");
  zmanShbt = JSON.parse(zmanShbt);
  res.json(zmanShbt);
};

exports.sendReload = (req, res, next) => {
  let reloadDB = fs.readFileSync("./db/reload.txt");
  reloadDB = JSON.parse(reloadDB);
  res.json(reloadDB);
};

exports.sendCheckbox = (req, res, next) => {
  let checkbox = fs.readFileSync("./db/checkbox.txt");
  checkbox = JSON.parse(checkbox);
  res.json(checkbox);
};

exports.sendNameOfImages = (req, res, next) => {
  let nameOfImages = fs.readFileSync("./db/display-images.txt");
  nameOfImages = JSON.parse(nameOfImages);
  res.json(nameOfImages);
};
