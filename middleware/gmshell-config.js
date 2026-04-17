const fs = require("fs");
const path = require("path");
const { createCanvas } = require("canvas");

// pdfjs-dist est un module ESM — on l'importe dynamiquement
async function convertPdfToJpg(pdfPath, outputPath) {
  const { getDocument } = await import("pdfjs-dist/legacy/build/pdf.mjs");

  const data = new Uint8Array(fs.readFileSync(pdfPath));
  const loadingTask = getDocument({ data });
  const pdf = await loadingTask.promise;

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

  const buffer = canvas.toBuffer("image/jpeg", { quality: 1 });
  fs.writeFileSync(outputPath, buffer);
}

module.exports = (req, res, next) => {
  const nameOfFile = req.body.nameOfFile;
  const numberOfImage = req.body.numberOfImage;
  const oldPath = req.files[0].path;
  const newPath = path.join("files", nameOfFile);
  const outputJpg = path.join("images", `imageAffiche${numberOfImage}.jpg`);

  convertPdfToJpg(oldPath, outputJpg)
    .then(() => {
      console.log(`PDF converti → ${outputJpg}`);
      fs.rename(oldPath, newPath, (err) => {
        if (err) throw err;
        console.log("fichier renommé dans './files'");

        let objectImage = fs.readFileSync("./db/images-display.txt");
        objectImage = JSON.parse(objectImage);
        objectImage.imageDisplay[numberOfImage - 1] = nameOfFile;
        objectImage = JSON.stringify(objectImage, null, 2);
        fs.writeFileSync("./db/images-display.txt", objectImage);
      });
      next();
    })
    .catch((error) => {
      console.log(`erreur conversion PDF : ${error.message}`);
      res.status(500).json({ error: error.message });
    });
};
