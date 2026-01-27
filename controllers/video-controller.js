import { videosData } from '../data/videosData.js';
import ffmpeg from "fluent-ffmpeg";
import path from "path";
import fs from 'fs'

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
    console.log('getVideoById');
    
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

// controllers/video-controller.js
export const createVideo = (req, res) => {
  const videoId = req.videoId;

  const title = req.body.title;
  const duration = Number(req.body.duration);
  const views = Number(req.body.views);
  const channel_id = req.body.channel_id;
  const channel_name = req.body.channel_name;
  const channel_avatarUrl = req.body.channel_avatarUrl;
  const fragments = JSON.parse(req.body.fragments || "[]");

  const videoUrl = `/videos/${videoId}/video/${req.files.video[0].filename}`;
  const thumbnailUrl = `/videos/${videoId}/thumbnail/${req.files.thumbnail[0].filename}`;

  // базовая директория, где лежат видео (public)
  const publicDir = path.join(process.cwd(), "public");

  // абсолютный путь к исходному файлу
  const absoluteVideoPath = path.join(publicDir, videoUrl.replace(/^\//, ""));

  const videoDir = path.dirname(absoluteVideoPath);

  // папка playlist рядом с video
  const playlistDir = path.join(path.dirname(videoDir), "playlist");

  // создаём playlist, если её нет
  if (!fs.existsSync(playlistDir)) {
    fs.mkdirSync(playlistDir, { recursive: true });
  }

  // выходной HLS‑плейлист
const hlsPlaylistPath = path.join(playlistDir, "360p.m3u8");
const hlsSegmentPath = path.join(playlistDir, "360p_%03d.ts");

  console.log('absoluteVideoPath = ', absoluteVideoPath);

ffmpeg(absoluteVideoPath)
  .videoFilters("scale=640:360")
  .videoCodec("libx264")
  .outputOptions([
    "-preset medium",
    "-crf 26",
    "-c:a aac",
    "-b:a 96k",
    "-hls_time 4",
    "-hls_list_size 0",
    "-f hls",
  ])
  .addOption("-hls_segment_filename", hlsSegmentPath)
  .output(hlsPlaylistPath)
  .on("end", () => {
    console.log("HLS 360p.m3u8 и сегменты созданы в:", playlistDir);
  })
  .on("error", (err) => {
    console.error("Ошибка при создании HLS:", err);
  })
  .run();


  res.status(201).json({
    id: videoId,
    title,
    duration,
    views,
    channel: {
      id: channel_id,
      name: channel_name,
      avatarUrl: channel_avatarUrl,
    },
    fragments,
    thumbnail: thumbnailUrl,
    videoPreview: videoUrl,
  });
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