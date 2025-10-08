require('dotenv').config();

const cloudinary = require("cloudinary").v2;
const multer = require("multer");

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: { fileSize: 700 * 1024 }, // 700KB
  fileFilter: (req, file, cb) => {
    const allowed = [
      "image/jpeg",
      "image/jpg",
      "image/png",
      "image/gif",
      "image/webp",
    ];
    if (allowed.includes(file.mimetype)) cb(null, true);
    else cb(new Error("Invalid file type"));
  },
});


// helper to stream buffer to cloudinary
const streamUpload = (buffer, options = {}) =>
  new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      options,
      (error, result) => {
        if (result) resolve(result);
        else reject(error);
      }
    );
    stream.end(buffer);
  });



  // helper to parse incoming fields (strings or arrays)
  const parseToArray = (val) => {
    if (!val) return [];
    if (Array.isArray(val)) return val.map((v) => v.trim());
    if (typeof val === "string") {
      // if it was sent as multiple form fields with same name, multer may present it as string or array;
      // try splitting by comma if comma present, otherwise return single item array
      return val.includes(",")
        ? val.split(",").map((s) => s.trim())
        : [val.trim()];
    }
    return [];
  };

module.exports = { cloudinary, upload,streamUpload, parseToArray }