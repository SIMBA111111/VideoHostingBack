import express from 'express';
import {
    getVideos,
    getVideoById,
} from '../controllers/video-controller.js';

const router = express.Router();

router.get('/api/videos', getVideos);
router.get('/api/videos/:id', getVideoById);

export default router;