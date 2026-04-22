const multer = require("multer");
const { FILES_DIR } = require("../paths");

const MIME_TYPES = {
  "image/jpg": "jpg",
  "image/jpeg": "jpg",
  "image/png": "png",
  "application/pdf": "pdf",
};

const storage = multer.diskStorage({
  destination: (req, file, callback) => {
    callback(null, FILES_DIR);
  },
  filename: (req, file, callback) => {
    // console.log('req.files', req.files);
    // console.log('file', file);
    const name = "error";
    const extension = MIME_TYPES[file.mimetype];
    callback(null, name + Date.now() + "." + extension);
  },
});

const fileFilter = (req, file, callback) => {
  if (MIME_TYPES[file.mimetype]) {
    callback(null, true);
  } else {
    callback(new Error("Format non supporté. Utilisez PDF, PNG ou JPG."), false);
  }
};

module.exports = multer({ storage, fileFilter }).array("files");
