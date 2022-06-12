const express = require("express");
const app = express();
const path = require("path");
const cors = require("cors");
const zmanRoutes = require('./routes/zmanim');

app.use(cors());

app.use(express.json());

app.get('/', function(req, res) {
    res.sendFile(process.cwd() + '/views/index.html');
  });

app.use("/api/zmanim", zmanRoutes);







module.exports = app;