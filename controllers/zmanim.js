const { zmanJerusalem } = require("../cities/zmanim");
const { eventsByDate } = require("../hebcal3");
const fs = require("fs");
const path = require("path");
const { DB_DIR } = require("../paths");

exports.envoyerZmanDuJour = (req, res, next) => {
  res.json(zmanJerusalem());
};

exports.envoyerInfoDuJour = (req, res, next) => {
  res.json(eventsByDate());
};

exports.sendZmanChol = (req, res, next) => {
  let zmanChol = fs.readFileSync(path.join(DB_DIR, "zmanChol.txt"));
  zmanChol = JSON.parse(zmanChol);
  res.json(zmanChol);
};

exports.sendZmanShbt = (req, res, next) => {
  let zmanShbt = fs.readFileSync(path.join(DB_DIR, "zmanShbt.txt"));
  zmanShbt = JSON.parse(zmanShbt);
  res.json(zmanShbt);
};

exports.sendReload = (req, res, next) => {
  let reloadDB = fs.readFileSync(path.join(DB_DIR, "reload.txt"));
  reloadDB = JSON.parse(reloadDB);
  res.json(reloadDB);
};

exports.sendCheckbox = (req, res, next) => {
  let checkbox = fs.readFileSync(path.join(DB_DIR, "checkbox.txt"));
  checkbox = JSON.parse(checkbox);
  res.json(checkbox);
};

exports.sendNameOfImages = (req, res, next) => {
  let nameOfImages = fs.readFileSync(path.join(DB_DIR, "images-display.txt"));
  nameOfImages = JSON.parse(nameOfImages);
  res.json(nameOfImages);
};
