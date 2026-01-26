import { videosData } from '../data/videosData.js';

export const getVideos = (req, res) => {
    try {
        const { page = 1, limit = 20 } = req.query;
        const startIndex = (page - 1) * limit;
        const endIndex = page * limit;
        
        const result = {
            videos: videosData.slice(startIndex, endIndex),
            total: videosData.length,
            page: parseInt(page),
            totalPages: Math.ceil(videosData.length / limit)
        };
        
        res.json(result);
    } catch (error) {
        console.error('Error fetching videos:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

export const getVideoById = (req, res) => {
    try {
        const videoId = req.params.id;
        const video = videosData.find(v => v.id === videoId);
        
        if (!video) {
            return res.status(404).json({ error: 'Video not found' });
        }
        
        res.json(video);
    } catch (error) {
        console.error('Error fetching video:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

export const searchVideos = (req, res) => {
    try {
        const query = req.params.query.toLowerCase();
        const results = videosData.filter(video => 
            video.title.toLowerCase().includes(query) ||
            video.channel.name.toLowerCase().includes(query)
        );
        
        res.json({
            query,
            results,
            count: results.length
        });
    } catch (error) {
        console.error('Error searching videos:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

export const getPopularVideos = (req, res) => {
    try {
        const popularVideos = [...videosData]
            .sort((a, b) => b.views - a.views)
            .slice(0, 20);
        
        res.json({
            title: 'Popular Videos',
            videos: popularVideos
        });
    } catch (error) {
        console.error('Error fetching popular videos:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};