const zmanJerusalem = require('../cities/zmanim');
const zmanVille = require('../cities/zmanim');

exports.envoyerZman = (req, res, next) => {
    res.json(zmanJerusalem);
};