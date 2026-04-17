const fs = require("fs");
const path = require("path");
const { createCanvas, loadImage } = require("canvas");

const ROOT = path.join(__dirname, "..");

async function convertToJpg(inputPath, outputPath, mimetype) {
  if (mimetype === "application/pdf") {
    const { getDocument } = await import("pdfjs-dist/legacy/build/pdf.mjs");

    const data = new Uint8Array(fs.readFileSync(inputPath));
    const pdf = await getDocument({ data }).promise;
    const page = await pdf.getPage(1);

    const scale = 150 / 72; // équivalent -density 150
    const viewport = page.getViewport({ scale });
    const canvas = createCanvas(viewport.width, viewport.height);
    const context = canvas.getContext("2d");

    await page.render({
      canvasContext: context,
      viewport,
      canvasFactory: {
        create(w, h) {
          const c = createCanvas(w, h);
          return { canvas: c, context: c.getContext("2d") };
        },
        reset(obj, w, h) {
          obj.canvas.width = w;
          obj.canvas.height = h;
        },
        destroy() {},
      },
    }).promise;

    fs.writeFileSync(outputPath, canvas.toBuffer("image/jpeg", { quality: 1 }));
  } else {
    // PNG ou JPG : chargement direct puis export en JPEG
    const img = await loadImage(inputPath);
    const canvas = createCanvas(img.width, img.height);
    const ctx = canvas.getContext("2d");
    ctx.drawImage(img, 0, 0);
    fs.writeFileSync(outputPath, canvas.toBuffer("image/jpeg", { quality: 1 }));
  }
}

module.exports = (req, res, next) => {
  const nameOfFile = req.body.nameOfFile;
  const numberOfImage = req.body.numberOfImage;
  const oldPath = req.files[0].path;
  const mimetype = req.files[0].mimetype;
  const newPath = path.join(ROOT, "files", nameOfFile);
  const outputJpg = path.join(ROOT, "images", `imageAffiche${numberOfImage}.jpg`);

  convertToJpg(oldPath, outputJpg, mimetype)
    .then(() => {
      console.log(`fichier converti → ${outputJpg}`);
      fs.rename(oldPath, newPath, (err) => {
        if (err) throw err;
        console.log("fichier renommé dans './files'");

        const dbPath = path.join(ROOT, "db", "images-display.txt");
        let objectImage = fs.readFileSync(dbPath);
        objectImage = JSON.parse(objectImage);
        objectImage.imageDisplay[numberOfImage - 1] = nameOfFile;
        objectImage = JSON.stringify(objectImage, null, 2);
        fs.writeFileSync(dbPath, objectImage);
      });
      next();
    })
    .catch((error) => {
      console.log(`erreur conversion : ${error.message}`);
      res.status(500).json({ error: error.message });
    });
};
