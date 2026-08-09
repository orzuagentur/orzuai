import { Suspense } from "react";
import { getTranslations } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import { getActiveYoutubeChannel } from "@/lib/youtube-channels";
import { TrainingStudio } from "@/components/TrainingStudio";
import type { AiTraining, PublishSchedule } from "@/lib/types";

export default async function ChannelTrainingPage() {
  const tCommon = await getTranslations("common");
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return (
      <div className="panel rise p-6">
        <p className="text-sm text-[color:var(--muted)]">{tCommon("loading")}</p>
      </div>
    );
  }

  const active = await getActiveYoutubeChannel(user.id);
  const channelId = active?.channel_id;

  const trainingQuery = channelId
    ? supabase
        .from("ai_training")
        .select("*")
        .eq("user_id", user.id)
        .eq("youtube_channel_id", channelId)
        .maybeSingle()
    : supabase
        .from("ai_training")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();

  const scheduleQuery = channelId
    ? supabase
        .from("publish_schedules")
        .select("*")
        .eq("user_id", user.id)
        .eq("youtube_channel_id", channelId)
        .maybeSingle()
    : supabase
        .from("publish_schedules")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();

  const [{ data: profile }, { data: training }, { data: schedule }] =
    await Promise.all([
      supabase
        .from("profiles")
        .select("youtube_channel_title")
        .eq("id", user.id)
        .maybeSingle(),
      trainingQuery,
      scheduleQuery,
    ]);

  return (
    <Suspense
      fallback={
        <p className="text-sm text-[color:var(--muted)]">{tCommon("loading")}</p>
      }
    >
      <TrainingStudio
        initial={training as AiTraining | null}
        schedule={schedule as PublishSchedule | null}
        channelTitle={profile?.youtube_channel_title ?? active?.title ?? null}
      />
    </Suspense>
  );
}
