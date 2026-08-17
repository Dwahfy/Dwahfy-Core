const multer = require('multer');
const path = require('path');
const crypto = require('crypto');
const fs = require('fs');

const UPLOADS_ROOT = process.env.UPLOADS_DIR || path.join(__dirname, '../../uploads');

function makeStorage(subdir) {
  const dir = path.join(UPLOADS_ROOT, subdir);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  return multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, dir),
    filename: (_req, file, cb) => {
      const ext = path.extname(file.originalname).toLowerCase();
      const unique = crypto.randomBytes(16).toString('hex');
      cb(null, `${unique}${ext}`);
    },
  });
}

const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];

const fileFilter = (_req, file, cb) => {
  if (ALLOWED_MIME_TYPES.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Only JPEG, PNG, GIF, and WebP images are allowed'), false);
  }
};

const upload = multer({ storage: makeStorage('avatars'), fileFilter, limits: { fileSize: 5 * 1024 * 1024 } });
const badgeUpload = multer({ storage: makeStorage('badges'), fileFilter, limits: { fileSize: 5 * 1024 * 1024 } });
const bannerUpload = multer({ storage: makeStorage('banners'), fileFilter, limits: { fileSize: 10 * 1024 * 1024 } });

module.exports = { upload, badgeUpload, bannerUpload };
