import path from "path";
import fs from 'fs'

export const createMasterM3U8File = (playlistDir: string): Promise<void> => {
  const masterM3U8Content = `#EXTM3U
#EXT-X-VERSION:3

#EXT-X-STREAM-INF:BANDWIDTH=1500000,RESOLUTION=854x480,CODECS="avc1.64001f,mp4a.40.2"
480/output_480.m3u8

#EXT-X-STREAM-INF:BANDWIDTH=3000000,RESOLUTION=1280x720,CODECS="avc1.64001f,mp4a.40.2"
720/output_720.m3u8

#EXT-X-STREAM-INF:BANDWIDTH=6000000,RESOLUTION=1920x1080,CODECS="avc1.64001f,mp4a.40.2"
1080/output_1080.m3u8

#EXT-X-MEDIA:TYPE=SUBTITLES,GROUP-ID="subs",NAME="Russian",DEFAULT=YES,AUTOSELECT=YES,URI="subs.m3u8"`;

  const masterM3U8Path = path.join(playlistDir, "master.m3u8");

  return new Promise((resolve, reject) => {
    fs.writeFile(masterM3U8Path, masterM3U8Content, "utf8", (err) => {
      if (err) {
        reject(err);
      } else {
        resolve();
      }
    });
  });
};
