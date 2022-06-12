exports.afficheHtml = (req, res, next) => {
    res.sendFile(process.cwd() + '/views/index.html');
};