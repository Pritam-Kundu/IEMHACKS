const multer = require('multer');
const path = require('path');

// Configure storage for lesson videos
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, path.join(__dirname, '..', 'public', 'uploads', 'videos'));
    },
    filename: (req, file, cb) => {
        // Generate unique filename: timestamp-originalname
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const ext = path.extname(file.originalname);
        cb(null, uniqueSuffix + ext);
    }
});

// File filter: only allow video files
const fileFilter = (req, file, cb) => {
    const allowedTypes = ['video/mp4', 'video/webm', 'video/ogg', 'video/quicktime'];
    if (allowedTypes.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new Error('Only video files (MP4, WebM, OGG) are allowed.'), false);
    }
};

const uploadVideo = multer({
    storage,
    fileFilter,
    limits: {
        fileSize: 500 * 1024 * 1024 // 500MB max
    }
});

module.exports = { uploadVideo };
