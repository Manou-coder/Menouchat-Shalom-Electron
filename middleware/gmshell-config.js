const fs = require("fs");
const path = require("path");
const { DB_DIR, IMAGES_DIR, FILES_DIR } = require("../paths");

module.exports = (req, res, next) => {
  const nameOfFile = req.body.nameOfFile;
  const numberOfImage = req.body.numberOfImage;
  const uploadedPath = req.files[0].path;
  const outputJpg = path.join(IMAGES_DIR, `imageAffiche${numberOfImage}.jpg`);
  const finalPath = path.join(FILES_DIR, nameOfFile);

  console.log(`[upload] fichier reçu : ${nameOfFile} → slot ${numberOfImage}`);

  fs.copyFile(uploadedPath, outputJpg, (copyErr) => {
    if (copyErr) {
      console.error(`[upload] erreur copie vers ${outputJpg} :`, copyErr.message);
      return res.status(500).json({ error: copyErr.message });
    }
    console.log(`[upload] image sauvegardée → ${outputJpg}`);

    fs.rename(uploadedPath, finalPath, (renameErr) => {
      if (renameErr) {
        console.error(`[upload] erreur renommage vers ${finalPath} :`, renameErr.message);
        return res.status(500).json({ error: renameErr.message });
      }
      console.log(`[upload] fichier original déplacé → ${finalPath}`);

      try {
        const dbPath = path.join(DB_DIR, "images-display.txt");
        let objectImage = JSON.parse(fs.readFileSync(dbPath));
        objectImage.imageDisplay[numberOfImage - 1] = nameOfFile;
        fs.writeFileSync(dbPath, JSON.stringify(objectImage, null, 2));
        console.log(`[upload] DB mise à jour : slot ${numberOfImage} = ${nameOfFile}`);
      } catch (dbErr) {
        console.error("[upload] erreur mise à jour DB :", dbErr.message);
        return res.status(500).json({ error: dbErr.message });
      }

      next();
    });
  });
};
