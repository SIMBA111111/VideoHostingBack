import { exec } from "child_process";
import path from "path";
import fs from 'fs'

export const createSrtSubtitleFile = async (videoIdDir: string, absoluteVideoPath: string, mp4VideoFilename: string): Promise<string> => {
    const whisperExePath = "C:\\Faster-Whisper-XXL_r245.4_windows\\Faster-Whisper-XXL\\faster-whisper-xxl.exe"; // путь к .exe
    const outputDir = path.join(videoIdDir, "subtitles"); // папка рядом с playlist/video/thumbnail

    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    const cmd = `"${whisperExePath}" "${absoluteVideoPath}" --language Russian --model medium --output_dir "${outputDir}"`;

    await new Promise<void>((resolve, reject) => {
      exec(cmd, (error, stdout, stderr) => {
        if (error) {
          console.error("faster-whisper error:", error);
          console.error("stderr:", stderr);
          return reject(error);

        }
        console.log("faster-whisper stdout:", stdout);
        console.log("Субтитры сохранены в:", outputDir);
        resolve()
      });
    })
    return outputDir.toString() + '\\' + mp4VideoFilename.replace(".mp4", ".srt")
}