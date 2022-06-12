const zmanJerusalem = require('../villes/zmanim');
const zmanVille = require('../villes/zmanim');

exports.envoyerZman = (req, res, next) => {
    res.json(zmanJerusalem);
};