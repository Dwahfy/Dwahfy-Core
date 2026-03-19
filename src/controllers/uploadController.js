const { requireAccountToken } = require('../utils/authToken');
const { upload } = require('../utils/upload');

const uploadAvatarHandler = [
  (req, res, next) => {
    const auth = requireAccountToken(req);
    if (auth.error) {
      return res.status(auth.error.status).json({ message: auth.error.message });
    }
    return next();
  },
  upload.single('avatar'),
  (req, res) => {
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }
    const baseUrl = process.env.APP_BASE_URL || 'http://localhost:3000';
    const url = `${baseUrl}/uploads/avatars/${req.file.filename}`;
    return res.status(201).json({ url });
  },
];

module.exports = { uploadAvatarHandler };
