const express = require("express");
const app = express();
const path = require("path");
const cors = require("cors");
const zmanRoutes = require('./routes/zmanim');
const adminRoutes = require('./routes/admin');

app.use(cors());

app.use(express.json());


app.use('/public', express.static(`${process.cwd()}/public`));

app.use('/admin', adminRoutes);

app.use("/api/zmanim", zmanRoutes);







module.exports = app;