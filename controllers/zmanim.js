const zmanJerusalem = require('../cities/zmanim');
const zmanVille = require('../cities/zmanim');
const zmanShbt = require('../controllers/admin');
const zmanAdmin = require('../controllers/admin');

exports.envoyerZmanDuJour = (req, res, next) => {
    res.json(zmanJerusalem);
};

exports.envoyerZmanChol = (req, res, next) => {
    if (zmanAdmin.zmanChol === undefined) res.json({error: "Les zmanim ne sont pas definis. Veuillez vous rendre dans la page de modification pour les définir."});
    res.json(zmanAdmin.zmanChol);
};

exports.envoyerZmanShbt = (req, res, next) => {
    if (zmanAdmin.zmanShbt === undefined) res.json({error: "Les zmanim ne sont pas definis. Veuillez vous rendre dans la page de modification pour les définir."});
    res.json(zmanAdmin.zmanShbt);
};

