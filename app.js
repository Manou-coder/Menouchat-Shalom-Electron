const express = require("express");
const app = express();
const path = require("path");
const cors = require("cors");
const zmanRoutes = require("./routes/zmanim");
const adminRoutes = require("./routes/admin");
const { DB_DIR, IMAGES_DIR, FILES_DIR } = require("./paths");

const fs = require("fs");

const ROOT = __dirname;

app.use(cors());

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use("/views", express.static(path.join(ROOT, "views")));
app.use("/public", express.static(path.join(ROOT, "public")));
app.use("/files", express.static(FILES_DIR));
app.use("/images", express.static(IMAGES_DIR));
app.use("/db", express.static(DB_DIR));

app.use("/admin", adminRoutes);
app.use("/api/zmanim", zmanRoutes);

app.get("/", (req, res, next) => {
    res.redirect("/admin");
});

app.get("/shoul", (req, res) => {
  res.sendFile(path.join(ROOT, "views", "index-frontend.html"));
});

module.exports = { app, ROOT };
