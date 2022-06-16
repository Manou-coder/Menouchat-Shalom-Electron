const fs = require('fs');
const gm = require('gm').subClass({imageMagick: false});

module.exports = (req, res, next) => {  
    console.log(req.file)
    if(req.file === undefined)
     {return console.log("error il n'y a pas de pdf à transformer"), next()}

    gm(`${req.file.path}[0]`)
    .write('images/imageAffiche.png', function(err) {
        if(err) console.log(err);
        console.log("Jpg to png!")
    });

    console.log("coucou");
    next()
}