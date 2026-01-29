import { exec } from "child_process";
import path from "path";
import fs from "fs/promises";

export const convertSrtToVTTAndCreateM3U8 = async (
  srtFilePath: string,
  playlistDir: string
): Promise<{}> => {
  const srtBasename = path.basename(srtFilePath, ".srt"); // например, "sound1440p1"
  const vttFilename = `${srtBasename}.vtt`;
  const vttPath = path.join(playlistDir, vttFilename);

  // 1. Конвертим SRT → VTT через ffmpeg
  const cmd = `ffmpeg -i "${srtFilePath}" "${vttPath}"`;

  await new Promise<void>((resolve, reject) => {
    exec(cmd, (error, stdout, stderr) => {
      if (error) {
        console.error("ffmpeg error (SRT → VTT):", error);
        console.error("stderr:", stderr);
        return reject(error);
      }
      console.log("ffmpeg stdout:", stdout);
      resolve();
    });
  });

  // 2. Генерим subs.m3u8
  const m3u8Content = `#EXTM3U
#EXT-X-VERSION:3
#EXT-X-TARGETDURATION:4
#EXT-X-MEDIA-SEQUENCE:0
#EXT-X-PLAYLIST-TYPE:VOD
#EXTINF:4,
${vttFilename}
#EXT-X-ENDLIST
`;

  const m3u8Path = path.join(playlistDir, "subs.m3u8");
  await fs.writeFile(m3u8Path, m3u8Content, "utf8");

  console.log("Субтитры сохранены в:", vttPath);
  console.log("M3U8 плейлист создан:", m3u8Path);

  return {'m3u8Path': m3u8Path, 'vttPath': vttPath};
};
