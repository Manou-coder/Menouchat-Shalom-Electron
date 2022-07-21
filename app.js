const express = require("express");
const app = express();
const path = require("path");
const cors = require("cors");
const zmanRoutes = require('./routes/zmanim');
const adminRoutes = require('./routes/admin');
const { error } = require("console");

const fs = require('fs');




app.use(cors());

app.use(express.json());
app.use(express.urlencoded({extended: true}))

app.use('/views', express.static(`${process.cwd()}/views`));

app.use('/public', express.static(`${process.cwd()}/public`));

app.use('/files', express.static(`${process.cwd()}/files`));

app.use('/horaires', express.static(`${process.cwd()}/horaires`));

app.use('/images', express.static(`${process.cwd()}/images`));

app.use('/admin', adminRoutes);

app.use("/api/zmanim", zmanRoutes);

app.get('/', (req, res, next) => {
    res.redirect('/admin')
})

app.get("/shoul", (req, res, next) => {
    res.sendFile(process.cwd() + "/views/index-frontend.html");
  });

const hebcal = require('./hebcal3.js');
const zmanJerusalem = require('./cities/zmanim')
// const zmanimShabat = require('./cities/zmanim-chabat')

// console.log(zmanJerusalem.zmanShabatJerusalem);
// console.log(hebcal);

let IMG;

app.post('/admin/displayImg', (req, res, next) => {
    console.log(req.body);
    IMG = req.body;
    res.json(req.body)
})

app.get('/admin/getdisplayImg', (req, res, next) => {
    // console.log(req.body);
    res.json(IMG)
})


// fs.readFile('./horaire.json', (err, data) => {
//     if (err) console.log(err);
//     data = JSON.parse(data)
//     data.message = 'coucou';
//     console.log(data);
// })




module.exports = app;