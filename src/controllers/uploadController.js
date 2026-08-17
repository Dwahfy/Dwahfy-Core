const { requireAccountToken } = require('../utils/authToken');
const { upload, bannerUpload } = require('../utils/upload');

function authMiddleware(req, res, next) {
  const auth = requireAccountToken(req);
  if (auth.error) return res.status(auth.error.status).json({ message: auth.error.message });
  return next();
}

const uploadAvatarHandler = [
  authMiddleware,
  upload.single('avatar'),
  (req, res) => {
    if (!req.file) return res.status(400).json({ message: 'No file uploaded' });
    const baseUrl = process.env.APP_BASE_URL || 'http://localhost:8000';
    return res.status(201).json({ url: `${baseUrl}/uploads/avatars/${req.file.filename}` });
  },
];

const uploadBannerHandler = [
  authMiddleware,
  bannerUpload.single('banner'),
  (req, res) => {
    if (!req.file) return res.status(400).json({ message: 'No file uploaded' });
    const baseUrl = process.env.APP_BASE_URL || 'http://localhost:8000';
    return res.status(201).json({ url: `${baseUrl}/uploads/banners/${req.file.filename}` });
  },
];

module.exports = { uploadAvatarHandler, uploadBannerHandler };
