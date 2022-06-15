const express = require("express");
const app = express();
const path = require("path");
const cors = require("cors");
const zmanRoutes = require('./routes/zmanim');
const adminRoutes = require('./routes/admin');
const { error } = require("console");

const fs = require('fs');

// const gm = require('gm');

const gm = require('gm').subClass({imageMagick: false});



app.use(cors());

app.use(express.json());
app.use(express.urlencoded({extended: true}))


app.use('/public', express.static(`${process.cwd()}/public`));

app.use('/files', express.static(`${process.cwd()}/files`));

app.use('/admin', adminRoutes);

app.use("/api/zmanim", zmanRoutes);

app.get('/api/pdf', cors(), (req, res, next) => {
    res.json({urlImages: "files/test.pdf"});
})


gm("files/montre.png").identify(function(err, value) {
    console.log(value);

    if(err) {
        console.log(err);
    }
});

gm("files/montre.pdf")
    .write('files/bravo.png', function(err) {
        if(err) console.log(err);
        console.log("Jpg to png!")
    });





module.exports = app;