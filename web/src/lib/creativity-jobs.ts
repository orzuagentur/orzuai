import type { VideoJob } from "@/lib/types";

export function isCreativityJob(job: VideoJob): boolean {
  const src = String(job.metadata?.source || "").toLowerCase();
  const pipe = String(job.metadata?.pipeline || "").toLowerCase();
  if (src === "reedit" || pipe === "reedit") {
    return String(job.metadata?.library || "creativity") !== "clipping";
  }
  if (src === "creativity" || pipe === "creativity") return true;
  if (!job.youtube_video_id && job.metadata?.publish === false) {
    if (src === "ai_clipping" || pipe === "ai_clipping") return false;
    return true;
  }
  return false;
}
