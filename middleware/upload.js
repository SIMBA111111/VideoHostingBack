// middleware/upload.js
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';

const baseDir = path.join(process.cwd(), 'public', 'videos');

if (!fs.existsSync(baseDir)) {
  fs.mkdirSync(baseDir, { recursive: true });
}

let currentVideoId = null;

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    // генерим videoId один раз на запрос (на первый файл)
    if (!currentVideoId) {
      currentVideoId = crypto.randomUUID();
      req.videoId = currentVideoId;
    }

    const videoDir = path.join(baseDir, currentVideoId);

    if (!fs.existsSync(videoDir)) {
      fs.mkdirSync(videoDir, { recursive: true });
    }

    let subDir = 'video';
    if (file.fieldname === 'thumbnail') {
      subDir = 'thumbnail';
    }

    const fullDir = path.join(videoDir, subDir);

    if (!fs.existsSync(fullDir)) {
      fs.mkdirSync(fullDir, { recursive: true });
    }

    cb(null, fullDir);
  },
  filename: (req, file, cb) => {
    cb(null, file.originalname);
  },
});

// сбрасываем videoId после каждого запроса
const upload = multer({ storage });

const uploadMiddleware = (req, res, next) => {
  currentVideoId = null;
  upload.fields([
    { name: 'video', maxCount: 1 },
    { name: 'thumbnail', maxCount: 1 },
  ])(req, res, next);
};

export { uploadMiddleware as upload };
