// routes/videos.js
import express from 'express'
import { getVideos, getVideoById, createVideo } from '../controllers/video-controller.js';
import { upload } from '../middleware/upload.js';

const router = express.Router();

router.get('/videos', getVideos);
router.get('/videos/:id', getVideoById);
router.post('/videos/create', upload, createVideo);

export default router;
