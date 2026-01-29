import { videosData } from '../data/videosData.js';
import { pool } from '../utils/pg.ts';
import {getVideoDuration} from '../utils/getVideoDuration.ts'
import {createSrtSubtitleFile} from '../services/video/createSrtFile.ts'
import {convertSrtToVTTAndCreateM3U8} from '../services/video/convertSrtToVTT.ts'
import {createMasterM3U8File} from '../services/video/createMasterM3U8File.ts'

import ffmpeg from "fluent-ffmpeg";
import path from "path";
import fs from 'fs'
import { exec } from "child_process";

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

  const srtFilePath = await createSrtSubtitleFile(videoIdDir, absoluteVideoPath, req.files.video[0].filename) // создаем srt файл
  console.log('srtFilePath ============ ', srtFilePath);


  const playlistDir = path.join(videoIdDir, "playlist");
  if (!fs.existsSync(playlistDir)) {
    fs.mkdirSync(playlistDir, { recursive: true });
  }

  const hlsPlaylistPath = path.join(playlistDir, "video.m3u8");
  const playlistMasterPath = path.join(playlistDir, "master.m3u8");
  const hlsSegmentPath = path.join(playlistDir, "video_fragment_%03d.ts");

  // preview на уровне video, thumbnail, playlist
  const previewDir = path.join(videoIdDir, "preview");
  if (!fs.existsSync(previewDir)) {
    fs.mkdirSync(previewDir, { recursive: true });
  }

  const previewPath = path.join(previewDir, "preview.mp4");
  const previewUrl = `/videos/${videoId}/preview/preview.mp4`;


    const hls480Dir = path.join(playlistDir, "480");
  const hls720Dir = path.join(playlistDir, "720");
  const hls1080Dir = path.join(playlistDir, "1080");

  if (!fs.existsSync(hls480Dir)) fs.mkdirSync(hls480Dir, { recursive: true });
  if (!fs.existsSync(hls720Dir)) fs.mkdirSync(hls720Dir, { recursive: true });
  if (!fs.existsSync(hls1080Dir)) fs.mkdirSync(hls1080Dir, { recursive: true });





const cmd = `ffmpeg -i "${absoluteVideoPath}" \
  -map 0:v -map 0:a -c:a aac -b:a 128k -c:v libx264 -crf 23 -preset medium -vf "scale=-2:480" -hls_time 4 -hls_playlist_type vod -hls_segment_filename "${playlistDir}/480/output_480_%04d.ts" -f hls "${playlistDir}/480/output_480.m3u8" \
  -map 0:v -map 0:a -c:a aac -b:a 128k -c:v libx264 -crf 22 -preset medium -vf "scale=-2:720" -hls_time 4 -hls_playlist_type vod -hls_segment_filename "${playlistDir}/720/output_720_%04d.ts" -f hls "${playlistDir}/720/output_720.m3u8" \
  -map 0:v -map 0:a -c:a aac -b:a 192k -c:v libx264 -crf 20 -preset medium -vf "scale=-2:1080" -hls_time 4 -hls_playlist_type vod -hls_segment_filename "${playlistDir}/1080/output_1080_%04d.ts" -f hls "${playlistDir}/1080/output_1080.m3u8" \
  -master_pl_name "${playlistDir}/master.m3u8"`;

exec(cmd, (error, stdout, stderr) => {
  if (error) {
    console.error("Ошибка ffmpeg:", error);
    console.error("stderr:", stderr);
    return;
  }
  console.log("stdout:", stdout);
  console.log("HLS 480/720/1080 и master.m3u8 успешно созданы в:", playlistDir);
});



    const subtitles = await convertSrtToVTTAndCreateM3U8(srtFilePath, playlistDir) // создаем vtt файл и m3u8 файл субтитров
    console.log('subtitles +++++++ ', subtitles);
    

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


  await createMasterM3U8File(playlistDir)

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
        // hlsPlaylistPath.replace(/^.*?\\videos\\/, "/videos/"),
        playlistMasterPath.replace(/^.*?\\videos\\/, "/videos/"),
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