const fs = require("fs");
const path = require("path");
const { DB_DIR, IMAGES_DIR, FILES_DIR } = require("../paths");

module.exports = (req, res, next) => {
  const nameOfFile = req.body.nameOfFile;
  const numberOfImage = req.body.numberOfImage;
  const uploadedPath = req.files[0].path;
  const outputJpg = path.join(IMAGES_DIR, `imageAffiche${numberOfImage}.jpg`);
  const finalPath = path.join(FILES_DIR, nameOfFile);

  fs.copyFile(uploadedPath, outputJpg, (copyErr) => {
    if (copyErr) return res.status(500).json({ error: copyErr.message });

    fs.rename(uploadedPath, finalPath, (renameErr) => {
      if (renameErr) return res.status(500).json({ error: renameErr.message });

      const dbPath = path.join(DB_DIR, "images-display.txt");
      let objectImage = JSON.parse(fs.readFileSync(dbPath));
      objectImage.imageDisplay[numberOfImage - 1] = nameOfFile;
      fs.writeFileSync(dbPath, JSON.stringify(objectImage, null, 2));

      next();
    });
  });
};
