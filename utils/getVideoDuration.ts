import { exec } from "child_process";
import util from "util";
const execAsync = util.promisify(exec);

export async function getVideoDuration(filePath: string) {
  const { stdout } = await execAsync(
    `ffprobe -v error -show_entries format=duration -of default=nw=1:nokey=1 "${filePath}"`
  );
  return parseFloat(stdout.trim());
}
