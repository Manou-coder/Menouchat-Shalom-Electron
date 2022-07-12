const {zmanJerusalem} = require('../cities/zmanim');
const zmanVille = require('../cities/zmanim');
const zmanShbt = require('./admin');
const zmanAdmin = require('./admin');
const {eventsByDate} = require('../hebcal3');

exports.envoyerZmanDuJour = (req, res, next) => {
    res.json(zmanJerusalem());
};

exports.envoyerZmanChol = (req, res, next) => {
    if (zmanAdmin.zmanChol === undefined) {
        res.json({error: "Les zmanim ne sont pas definis. Veuillez vous rendre dans la page de modification pour les définir."});
    } else {
    res.json(zmanAdmin.zmanChol);
    }
};

exports.envoyerZmanShbt = (req, res, next) => {
    if (zmanAdmin.zmanShbt === undefined) {
        res.json({error: "Les zmanim ne sont pas definis. Veuillez vous rendre dans la page de modification pour les définir."});
    } else {
        res.json(zmanAdmin.zmanShbt);
    }
};

exports.envoyerInfoDuJour = (req, res, next) => {
    res.json(eventsByDate());
};

exports.envoyerImg1 = (req, res, next) => {
    res.json({urlImage: "images/imageAffiche1.jpg"});
};

exports.envoyerImg2 = (req, res, next) => {
    res.json({urlImage: "images/imageAffiche2.jpg"});
};

exports.envoyerImg3 = (req, res, next) => {
    res.json({urlImage: "images/imageAffiche3.jpg"});
};

exports.envoyerImg4 = (req, res, next) => {
    res.json({urlImage: "images/imageAffiche4.jpg"});
};