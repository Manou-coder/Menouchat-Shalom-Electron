const express = require("express");
const app = express();
const path = require("path");
const cors = require("cors");
const zmanRoutes = require("./routes/zmanim");
const adminRoutes = require("./routes/admin");
const { error } = require("console");

const fs = require("fs");

app.use(cors());

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use("/views", express.static(`${process.cwd()}/views`));

app.use("/public", express.static(`${process.cwd()}/public`));

app.use("/files", express.static(`${process.cwd()}/files`));

app.use("/images", express.static(`${process.cwd()}/images`));

app.use("/db", express.static(`${process.cwd()}/db`));

app.use("/admin", adminRoutes);

app.use("/api/zmanim", zmanRoutes);

app.get("/", (req, res, next) => {
    res.redirect("/admin");
});

app.get("/shoul", (req, res) => {
  res.sendFile(process.cwd() + "/views/index-frontend.html");
});

module.exports = app;
