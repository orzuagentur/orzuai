import { ChannelPicker } from "@/components/ChannelPicker";
import { ChannelStudioPage } from "@/components/ChannelStudioPage";
import { getActiveYoutubeChannel } from "@/lib/youtube-channels";
import { createClient } from "@/lib/supabase/server";

export default async function YoutubePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const active = await getActiveYoutubeChannel(user.id);

  if (!active) {
    return <ChannelPicker />;
  }

  return <ChannelStudioPage />;
}