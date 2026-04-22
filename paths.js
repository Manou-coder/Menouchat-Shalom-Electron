const fs = require("fs");
const path = require("path");

// Chemins "d'usine" (livrés avec le code, en lecture seule une fois packagé).
const BUNDLE_ROOT = __dirname;
const BUNDLE_DB = path.join(BUNDLE_ROOT, "db");
const BUNDLE_IMAGES = path.join(BUNDLE_ROOT, "images");
const BUNDLE_FILES = path.join(BUNDLE_ROOT, "files");

// En prod (Electron packagé), main.js pose MENOUCHAT_USER_DATA avant de charger le serveur.
// En dev (npm run dev), la variable n'existe pas → on retombe sur les dossiers du repo.
const userDataRoot = process.env.MENOUCHAT_USER_DATA;

const DB_DIR = userDataRoot ? path.join(userDataRoot, "db") : BUNDLE_DB;
const IMAGES_DIR = userDataRoot ? path.join(userDataRoot, "images") : BUNDLE_IMAGES;
const FILES_DIR = userDataRoot ? path.join(userDataRoot, "files") : BUNDLE_FILES;

// Copie récursive d'un dossier source vers une destination si la destination n'existe pas.
function seedIfMissing(src, dest) {
  if (fs.existsSync(dest)) return;
  fs.mkdirSync(dest, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const from = path.join(src, entry.name);
    const to = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      seedIfMissing(from, to);
    } else {
      fs.copyFileSync(from, to);
    }
  }
}

// À appeler une fois au démarrage de l'app packagée, pour amorcer userData
// avec les fichiers par défaut livrés dans le bundle.
function seedUserData() {
  if (!userDataRoot) return;
  seedIfMissing(BUNDLE_DB, DB_DIR);
  seedIfMissing(BUNDLE_IMAGES, IMAGES_DIR);
  seedIfMissing(BUNDLE_FILES, FILES_DIR);
}

module.exports = {
  DB_DIR,
  IMAGES_DIR,
  FILES_DIR,
  seedUserData,
};
