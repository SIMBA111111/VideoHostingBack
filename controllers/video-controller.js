import { videosData } from '../data/videosData.js';
import { pool } from '../utils/pg.ts';
import {getVideoDuration} from '../utils/getVideoDuration.ts'
import ffmpeg from "fluent-ffmpeg";
import path from "path";
import fs from 'fs'

export const getVideos = async (req, res) => {
    try {
        const { page = 1, limit = 20 } = req.query;
        const startIndex = (page - 1) * limit;
        const endIndex = page * limit;
        
        const response = await pool.query('select * from videos')
        const videos = response.rows
        const result = {
            videos: videos.slice(startIndex, endIndex),
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

export const getVideoById = async (req, res) => {
    console.log('getVideoById');
    
    try {
        const videoId = req.params.id;
        const response = await pool.query('select * from videos where id=$1', [videoId])        
        const video = response.rows[0]

        console.log(video);
        
        
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
export const createVideo = async (req, res) => {
  const videoId = req.videoId;

  const title = req.body.title;
  const views = Number(req.body.views);
  const channel_id = req.body.channel_id;
  const channel_name = req.body.channel_name;
  const channel_avatarUrl = req.body.channel_avatarUrl;
  const fragments = JSON.parse(req.body.fragments || "[]");


const videoUrl = `/videos/${videoId}/video/${req.files.video[0].filename}`;
const thumbnailUrl = `/videos/${videoId}/thumbnail/${req.files.thumbnail[0].filename}`;


const publicDir = path.join(process.cwd(), "public");
const videoIdDir = path.join(publicDir, "videos", videoId); // /public/videos/:videoId

const absoluteVideoPath = path.join(publicDir, videoUrl.replace(/^\//, ""));
const videoDir = path.dirname(absoluteVideoPath); // /public/videos/:videoId/video

  let duration;
  try {
    duration = await getVideoDuration(absoluteVideoPath);
  } catch (err) {
    console.error("Failed to get video duration:", err);
    return res.status(500).json({ error: "Cannot read video duration" });
  }
  console.log('duration = ', duration);
  

const playlistDir = path.join(videoIdDir, "playlist");
if (!fs.existsSync(playlistDir)) {
  fs.mkdirSync(playlistDir, { recursive: true });
}

const hlsPlaylistPath = path.join(playlistDir, "360p.m3u8");
const hlsSegmentPath = path.join(playlistDir, "360p_%03d.ts");

// preview на уровне video, thumbnail, playlist
const previewDir = path.join(videoIdDir, "preview");
if (!fs.existsSync(previewDir)) {
  fs.mkdirSync(previewDir, { recursive: true });
}

const previewPath = path.join(previewDir, "preview.mp4");
const previewUrl = `/videos/${videoId}/preview/preview.mp4`;


  // 1. Сначала делаем HLS (как у тебя)
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

  // 2. Создаём короткий 10‑секундный mp4‑превью из 5 рандомных кусков по 2 секунды
   console.log(previewUrl);
   

  // Получаем длительность исходного видео (в секундах)
  ffmpeg.ffprobe(absoluteVideoPath, (err, metadata) => {
    if (err) {
      console.error("Ошибка ffprobe:", err);
      return;
    }

    const totalDuration = metadata.format.duration; // в секундах
    if (!totalDuration || totalDuration < 2) {
      console.warn("Видео слишком короткое для превью");
      return;
    }

    const cuts = [];
    const clipDuration = 2; // по 2 секунды

    // 5 рандомных кусков по 2 секунды
    for (let i = 0; i < 5; i++) {
      const maxStart = totalDuration - clipDuration;
      const start = Math.random() * maxStart;
      cuts.push(`[${start},${start + clipDuration}]`);
    }

    // Собираем команду с trim + concat
    const complexFilter = cuts
      .map((cut, i) => {
        const [start, end] = cut.match(/\[(\d+\.?\d*),(\d+\.?\d*)\]/).slice(1, 3);
        return `[0:v]trim=start=${start}:end=${end},setpts=PTS-STARTPTS[v${i}];[0:a]atrim=start=${start}:end=${end},asetpts=PTS-STARTPTS[a${i}];`;
      })
      .join("");

    const concatVideo = cuts.map((_, i) => `[v${i}]`).join("");
    const concatAudio = cuts.map((_, i) => `[a${i}]`).join("");

    ffmpeg(absoluteVideoPath)
      .complexFilter(
        `${complexFilter}${concatVideo}concat=n=5:v=1:a=0[v];${concatAudio}concat=n=5:v=0:a=1[a]`,
        ["v", "a"]
      )
      .videoCodec("libx264")
      .audioCodec("aac")
      .outputOptions([
        "-preset fast",
        "-crf 23",
        "-t 10", // обрезаем до 10 секунд (на случай, если чуть больше)
      ])
      .output(previewPath)
      .on("end", () => {
        console.log("Preview mp4 создан:", previewPath);
      })
      .on("error", (err) => {
        console.error("Ошибка при создании preview:", err);
      })
      .run();
  });

  try {
    // 1. Добавляем видео и получаем его id
    const videoRes = await pool.query(
      `
      INSERT INTO videos (
        title,
        duration,
        views,
        channel_id,
        thumbnailurl,
        videourl,
        playlisturl,
        video_preview_url
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING id
      `,
      [
        title,
        duration,
        views,
        channel_id,
        thumbnailUrl,
        videoUrl,
        hlsPlaylistPath.replace(/^.*?\\videos\\/, "/videos/"),
        previewPath.replace(/^.*?\\videos\\/, "/videos/")
      ]
    );

    const insertedVideoId = videoRes.rows[0].id;

    // 2. Добавляем фрагменты для этого videoId
    if (fragments.length > 0) {
      const fragmentValues = fragments
        .map((f, i) => `($${i * 3 + 10}, $${i * 3 + 11}, $${i * 3 + 12})`)
        .join(", ");

      const fragmentParams = fragments.flatMap((f) => [
        insertedVideoId,
        f.start,
        f.end,
        f.title,
      ]);

      await pool.query(
        `
        INSERT INTO fragments (video_id, start, end, title)
        VALUES ${fragmentValues}
        `,
        fragmentParams
      );
    }

    // 3. Возвращаем объект IVideo
    res.status(201).json({
      id: insertedVideoId,
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
  } catch (err) {
    console.error("Ошибка при добавлении видео/фрагментов:", err);
    res.status(500).json({ error: "Internal server error" });
  }
};

// export const searchVideos = (req, res) => {
//     try {
//         const query = req.params.query.toLowerCase();
//         const results = videosData.filter(video => 
//             video.title.toLowerCase().includes(query) ||
//             video.channel.name.toLowerCase().includes(query)
//         );
        
//         res.json({
//             query,
//             results,
//             count: results.length
//         });
//     } catch (error) {
//         console.error('Error searching videos:', error);
//         res.status(500).json({ error: 'Internal server error' });
//     }
// };

// export const getPopularVideos = (req, res) => {
//     try {
//         const popularVideos = [...videosData]
//             .sort((a, b) => b.views - a.views)
//             .slice(0, 20);
        
//         res.json({
//             title: 'Popular Videos',
//             videos: popularVideos
//         });
//     } catch (error) {
//         console.error('Error fetching popular videos:', error);
//         res.status(500).json({ error: 'Internal server error' });
//     }
// };