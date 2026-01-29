import { exec } from "child_process";
import path from "path";
import fs from 'fs'

export const createMasterM3U8File = (playlistDir: string): Promise<void> => {
  const masterM3U8Content = `#EXTM3U
#EXT-X-VERSION:3
#EXT-X-MEDIA:TYPE=SUBTITLES,GROUP-ID="subs",NAME="Russian",DEFAULT=YES,AUTOSELECT=YES,LANGUAGE="ru",URI="subs.m3u8"
#EXT-X-STREAM-INF:PROGRAM-ID=1,BANDWIDTH=1000000,SUBTITLES="subs"
video.m3u8`;

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
