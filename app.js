const express = require("express");
const app = express();
const path = require("path");
const cors = require("cors");
const zmanRoutes = require('./routes/zmanim');
const adminRoutes = require('./routes/admin');
const { error } = require("console");


app.use(cors());

app.use(express.json());
app.use(express.urlencoded({extended: true}))



app.use('/public', express.static(`${process.cwd()}/public`));

app.use('/files', express.static(`${process.cwd()}/files`));

app.use('/admin', adminRoutes);

app.use("/api/zmanim", zmanRoutes);

app.get('/api/pdf', cors(), (req, res, next) => {
    res.json({urlImages: "http://localhost:3000/files/montre.png"});
})



module.exports = app;