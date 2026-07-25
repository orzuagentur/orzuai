/** Curated picks for AI Training dropdowns (value stored in DB). */

export type Preset = { value: string; label: string };

export const NICHE_PRESETS: Preset[] = [
  { value: "motivation", label: "Motivation & discipline" },
  { value: "fitness", label: "Fitness & gym" },
  { value: "business", label: "Business & money" },
  { value: "mindset", label: "Mindset & psychology" },
  { value: "lifestyle", label: "Lifestyle & success" },
  { value: "tech", label: "Tech & AI" },
  { value: "stoicism", label: "Stoicism" },
  { value: "relationships", label: "Relationships" },
  { value: "health", label: "Health & habits" },
  { value: "travel", label: "Travel & adventure" },
];

export const CONTENT_TYPE_PRESETS: Preset[] = [
  { value: "motivational_quotes", label: "Motivational quotes" },
  { value: "story_lesson", label: "Story with a lesson" },
  { value: "tips_list", label: "Quick tips list" },
  { value: "harsh_truth", label: "Harsh truth monologue" },
  { value: "day_in_life", label: "Day-in-the-life narration" },
  { value: "myth_vs_fact", label: "Myth vs fact" },
  { value: "challenge", label: "30-day challenge hook" },
  { value: "before_after", label: "Before / after mindset" },
  { value: "qa_hot_takes", label: "Hot takes / Q&A" },
  { value: "cinematic_essay", label: "Cinematic mini essay" },
];

export const TONE_PRESETS: Preset[] = [
  { value: "powerful", label: "Powerful" },
  { value: "calm_authority", label: "Calm authority" },
  { value: "urgent", label: "Urgent & intense" },
  { value: "friendly", label: "Friendly mentor" },
  { value: "raw", label: "Raw & unfiltered" },
  { value: "inspirational", label: "Inspirational" },
  { value: "dark_gritty", label: "Dark & gritty" },
  { value: "playful", label: "Playful" },
  { value: "luxury", label: "Luxury / premium" },
  { value: "coach", label: "Coach energy" },
];

export const LANGUAGE_PRESETS: Preset[] = [
  { value: "en", label: "English" },
  { value: "ru", label: "Russian" },
  { value: "de", label: "German" },
  { value: "uz", label: "Uzbek" },
  { value: "tr", label: "Turkish" },
  { value: "es", label: "Spanish" },
  { value: "fr", label: "French" },
  { value: "ar", label: "Arabic" },
  { value: "pt", label: "Portuguese" },
  { value: "it", label: "Italian" },
];

export const AUDIENCE_PRESETS: Preset[] = [
  { value: "ambitious young men 18-35", label: "Ambitious men 18–35" },
  { value: "entrepreneurs and founders", label: "Entrepreneurs & founders" },
  { value: "students building habits", label: "Students building habits" },
  { value: "gym beginners", label: "Gym beginners" },
  { value: "busy professionals", label: "Busy professionals" },
  { value: "creators and freelancers", label: "Creators & freelancers" },
  { value: "women building confidence", label: "Women building confidence" },
  { value: "parents seeking balance", label: "Parents seeking balance" },
  { value: "immigrants chasing success", label: "Immigrants chasing success" },
  { value: "general self-improvement", label: "General self-improvement" },
];

export const HOOK_PRESETS: Preset[] = [
  { value: "bold opening challenge", label: "Bold opening challenge" },
  { value: "shock claim in first line", label: "Shock claim first line" },
  { value: "direct question to viewer", label: "Direct question" },
  { value: "contrarian take", label: "Contrarian take" },
  { value: "story cold open", label: "Story cold open" },
  { value: "countdown urgency", label: "Countdown urgency" },
  { value: "pain point callout", label: "Pain point callout" },
  { value: "secret reveal tease", label: "Secret reveal tease" },
  { value: "before you scroll stop", label: "Before you scroll — stop" },
  { value: "one rule that changed everything", label: "One rule that changed everything" },
];

export const CTA_PRESETS: Preset[] = [
  { value: "Follow for daily fire", label: "Follow for daily fire" },
  { value: "Subscribe if this hit hard", label: "Subscribe if this hit hard" },
  { value: "Save this for later", label: "Save this for later" },
  { value: "Comment your goal below", label: "Comment your goal" },
  { value: "Share with someone who needs this", label: "Share with someone" },
  { value: "Like if you felt that", label: "Like if you felt that" },
  { value: "Turn on notifications", label: "Turn on notifications" },
  { value: "Watch the next Short now", label: "Watch the next Short" },
  { value: "Start today — no excuses", label: "Start today — no excuses" },
  { value: "Drop a fire emoji if ready", label: "Drop 🔥 if ready" },
];

export const PEXELS_PRESETS: Preset[] = [
  { value: "cinematic man walking city night", label: "Man walking city night" },
  { value: "athlete training gym grit", label: "Athlete gym grit" },
  { value: "sunrise mountain hike silhouette", label: "Sunrise mountain hike" },
  { value: "luxury car night drive", label: "Luxury car night drive" },
  { value: "ocean waves drone cinematic", label: "Ocean waves drone" },
  { value: "neon street rain walking", label: "Neon street rain" },
  { value: "coffee shop laptop hustle", label: "Coffee shop hustle" },
  { value: "boxing training intensity", label: "Boxing training" },
  { value: "desert road driving freedom", label: "Desert road freedom" },
  { value: "storm clouds timelapse epic", label: "Storm clouds epic" },
];

export const MUSIC_MOOD_PRESETS: Preset[] = [
  { value: "motivational epic", label: "Motivational epic" },
  { value: "cinematic motivational", label: "Cinematic motivational" },
  { value: "dark intense", label: "Dark intense" },
  { value: "upbeat energetic", label: "Upbeat energetic" },
  { value: "trap motivational", label: "Trap motivational" },
  { value: "orchestral epic", label: "Orchestral epic" },
  { value: "calm focus", label: "Calm focus" },
  { value: "luxury ambient", label: "Luxury ambient" },
  { value: "workout pump", label: "Workout pump" },
  { value: "emotional piano epic", label: "Emotional piano epic" },
];

/** ElevenLabs voices — label shown, value = voice_id stored */
export const VOICE_PRESETS: Preset[] = [
  { value: "21m00Tcm4TlvDq8ikWAM", label: "Rachel — calm clear (female)" },
  { value: "29vD33N1CtxCmqQRPOHJ", label: "Drew — news / deep (male)" },
  { value: "2EiwWnXFnvU8HOES8P3k", label: "Clyde — war veteran (male)" },
  { value: "5Q0t7uMcjvnagumLfvZi", label: "Paul — grounded (male)" },
  { value: "AZnzlk1XvdvUeBnXmlld", label: "Domi — strong female" },
  { value: "CYw3kZ02Hs0563khs1Fj", label: "Dave — conversational (male)" },
  { value: "D38z5RcWu1voky8WS1ja", label: "Fin — Irish soft (male)" },
  { value: "EXAVITQu4vr4xnSDxMaL", label: "Sarah — soft soft (female)" },
  { value: "ErXwobaYiN019PkySvjV", label: "Antoni — well-rounded (male)" },
  { value: "VR6AewLTigWG4xSOukaG", label: "Arnold — crisp narrator (male)" },
];

export const SUBTITLE_PRESETS: Preset[] = [
  { value: "karaoke_gold", label: "Karaoke gold" },
  { value: "minimal_white", label: "Minimal white" },
  { value: "yellow_pop", label: "Yellow pop" },
  { value: "outline_heavy", label: "Heavy outline" },
  { value: "word_by_word", label: "Word by word" },
  { value: "center_caption", label: "Center caption" },
  { value: "bottom_bar", label: "Bottom bar" },
  { value: "neon_glow", label: "Neon glow" },
  { value: "cinematic_lower", label: "Cinematic lower third" },
  { value: "no_subtitles", label: "No burned subtitles" },
];

export const DURATION_PRESETS: Preset[] = [
  { value: "20", label: "20 seconds" },
  { value: "30", label: "30 seconds" },
  { value: "45", label: "45 seconds" },
  { value: "59", label: "59 seconds (max Short)" },
  { value: "90", label: "1.5 minutes" },
  { value: "120", label: "2 minutes" },
  { value: "180", label: "3 minutes" },
  { value: "300", label: "5 minutes" },
  { value: "480", label: "8 minutes" },
  { value: "600", label: "10 minutes" },
];

/** Durations shown for Shorts (vertical ≤60s). */
export const SHORT_DURATION_PRESETS: Preset[] = [
  { value: "20", label: "20 seconds" },
  { value: "30", label: "30 seconds" },
  { value: "45", label: "45 seconds" },
  { value: "59", label: "59 seconds (max Short)" },
];

/** Durations for long / simple YouTube videos (16:9). */
export const LONG_DURATION_PRESETS: Preset[] = [
  { value: "90", label: "1.5 minutes" },
  { value: "120", label: "2 minutes" },
  { value: "180", label: "3 minutes" },
  { value: "300", label: "5 minutes" },
  { value: "480", label: "8 minutes" },
  { value: "600", label: "10 minutes" },
];

export const VIDEO_FORMAT_PRESETS: Preset[] = [
  { value: "shorts", label: "Shorts (9:16)" },
  { value: "video", label: "Regular (16:9)" },
];

export function isShortFormat(format: string): boolean {
  return format === "shorts" || format === "shorts_mixer";
}

export function durationPresetsForFormat(format: string): Preset[] {
  return isShortFormat(format) ? SHORT_DURATION_PRESETS : LONG_DURATION_PRESETS;
}

export function defaultDurationForFormat(format: string): number {
  return isShortFormat(format) ? 45 : 180;
}

export const VIDEO_STYLE_PRESETS: Preset[] = [
  { value: "cinematic_mixer", label: "Cinematic mixer" },
  { value: "fast_cuts", label: "Fast cuts" },
  { value: "slow_zoom", label: "Slow zoom story" },
  { value: "karaoke_focus", label: "Karaoke focus" },
  { value: "punch_hook", label: "Punch hook open" },
  { value: "smooth_glide", label: "Smooth glide" },
  { value: "gritty_handheld", label: "Gritty handheld feel" },
  { value: "luxury_slow", label: "Luxury slow" },
  { value: "hype_edit", label: "Hype edit" },
  { value: "clean_minimal", label: "Clean minimal" },
  { value: "boom_viral", label: "Boom viral" },
  { value: "documentary_cut", label: "Documentary cut" },
  { value: "street_reel", label: "Street reel" },
  { value: "soft_story", label: "Soft story" },
  { value: "techno_flash", label: "Techno flash" },
];

/** Applied to Look & montage when Edit style changes */
export const VIDEO_STYLE_LOOK: Record<
  string,
  {
    visual_effect: string;
    preferred_transition: string;
    montage_pace: string;
    flash_cuts: boolean;
  }
> = {
  cinematic_mixer: {
    visual_effect: "blockbuster",
    preferred_transition: "dissolve",
    montage_pace: "cinematic",
    flash_cuts: false,
  },
  fast_cuts: {
    visual_effect: "punch",
    preferred_transition: "zoomin",
    montage_pace: "viral",
    flash_cuts: true,
  },
  slow_zoom: {
    visual_effect: "cinematic",
    preferred_transition: "fade",
    montage_pace: "cinematic",
    flash_cuts: false,
  },
  karaoke_focus: {
    visual_effect: "vivid",
    preferred_transition: "fade",
    montage_pace: "medium",
    flash_cuts: false,
  },
  punch_hook: {
    visual_effect: "punch_pop",
    preferred_transition: "radial",
    montage_pace: "fast",
    flash_cuts: true,
  },
  smooth_glide: {
    visual_effect: "soft",
    preferred_transition: "smoothleft",
    montage_pace: "medium",
    flash_cuts: false,
  },
  gritty_handheld: {
    visual_effect: "drama",
    preferred_transition: "fadeblack",
    montage_pace: "fast",
    flash_cuts: true,
  },
  luxury_slow: {
    visual_effect: "golden_hour",
    preferred_transition: "dissolve",
    montage_pace: "cinematic",
    flash_cuts: false,
  },
  hype_edit: {
    visual_effect: "pop_art",
    preferred_transition: "circleopen",
    montage_pace: "viral",
    flash_cuts: true,
  },
  clean_minimal: {
    visual_effect: "soft_film",
    preferred_transition: "fade",
    montage_pace: "medium",
    flash_cuts: false,
  },
  boom_viral: {
    visual_effect: "punch_pop",
    preferred_transition: "zoomin",
    montage_pace: "viral",
    flash_cuts: true,
  },
  documentary_cut: {
    visual_effect: "soft_film",
    preferred_transition: "dissolve",
    montage_pace: "cinematic",
    flash_cuts: false,
  },
  street_reel: {
    visual_effect: "heatwave",
    preferred_transition: "slideright",
    montage_pace: "fast",
    flash_cuts: true,
  },
  soft_story: {
    visual_effect: "pastel_dream",
    preferred_transition: "smoothleft",
    montage_pace: "medium",
    flash_cuts: false,
  },
  techno_flash: {
    visual_effect: "night_neon",
    preferred_transition: "pixelize",
    montage_pace: "viral",
    flash_cuts: true,
  },
};

export const MONTAGE_PACE_PRESETS: Preset[] = [
  { value: "viral", label: "Viral (fast flash cuts)" },
  { value: "fast", label: "Fast" },
  { value: "medium", label: "Medium" },
  { value: "cinematic", label: "Cinematic (slow)" },
];

export const VISUAL_EFFECT_PRESETS: Preset[] = [
  { value: "cinematic", label: "Cinematic" },
  { value: "vivid", label: "Vivid" },
  { value: "soft", label: "Soft" },
  { value: "noir", label: "Noir" },
  { value: "punch", label: "Punch" },
  { value: "vignette", label: "Vignette" },
  { value: "warm", label: "Warm" },
  { value: "cool", label: "Cool" },
  { value: "teal_orange", label: "Teal & orange" },
  { value: "vintage", label: "Vintage" },
  { value: "bleach", label: "Bleach" },
  { value: "neon", label: "Neon" },
  { value: "pastel", label: "Pastel" },
  { value: "drama", label: "Drama" },
  { value: "glow", label: "Glow" },
  { value: "sharp", label: "Sharp" },
  { value: "dream", label: "Dream" },
  { value: "chrome", label: "Chrome" },
  { value: "sunset", label: "Sunset" },
  { value: "arctic", label: "Arctic" },
  { value: "ember", label: "Ember" },
  { value: "matrix", label: "Matrix" },
  { value: "retro_tv", label: "Retro TV" },
  { value: "film_grain", label: "Film grain" },
  { value: "high_key", label: "High key" },
  { value: "low_key", label: "Low key" },
  { value: "sepia", label: "Sepia" },
  { value: "duo_pink", label: "Duo pink" },
  { value: "clarity", label: "Clarity" },
  { value: "kodak", label: "Kodak" },
  { value: "fuji", label: "Fuji" },
  { value: "bleach_bypass", label: "Bleach bypass" },
  { value: "golden_hour", label: "Golden hour" },
  { value: "steel_blue", label: "Steel blue" },
  { value: "cross_process", label: "Cross process" },
  { value: "night_mood", label: "Night mood" },
  { value: "pop_art", label: "Pop art" },
  { value: "soft_glow", label: "Soft glow" },
  { value: "blockbuster", label: "Blockbuster" },
  { value: "moody_teal", label: "Moody teal" },
  { value: "neon_pop", label: "Neon pop" },
  { value: "warm_glow", label: "Warm glow" },
  { value: "cold_steel", label: "Cold steel" },
  { value: "pastel_dream", label: "Pastel dream" },
  { value: "noir_hard", label: "Noir hard" },
  { value: "sunset_flare", label: "Sunset flare" },
  { value: "soft_film", label: "Soft film" },
  { value: "punch_pop", label: "Punch pop" },
  { value: "ice_crystal", label: "Ice crystal" },
  { value: "amber_rush", label: "Amber rush" },
  { value: "cyber_lime", label: "Cyber lime" },
  { value: "rose_gold", label: "Rose gold" },
  { value: "deep_ocean", label: "Deep ocean" },
  { value: "paper_matte", label: "Paper matte" },
  { value: "vaporwave", label: "Vaporwave" },
  { value: "comic_ink", label: "Comic ink" },
  { value: "desert_dust", label: "Desert dust" },
  { value: "rainforest", label: "Rainforest" },
  { value: "mono_blue", label: "Mono blue" },
  { value: "heatwave", label: "Heatwave" },
  { value: "silver_screen", label: "Silver screen" },
  { value: "candy_pop", label: "Candy pop" },
  { value: "ink_wash", label: "Ink wash" },
  { value: "night_neon", label: "Night neon" },
  { value: "crimson_rush", label: "Crimson rush" },
  { value: "mint_fresh", label: "Mint fresh" },
  { value: "lavender_haze", label: "Lavender haze" },
  { value: "graphite", label: "Graphite" },
  { value: "honey_glaze", label: "Honey glaze" },
  { value: "electric_blue", label: "Electric blue" },
  { value: "moss", label: "Moss" },
  { value: "sandstorm", label: "Sandstorm" },
  { value: "plasma", label: "Plasma" },
  { value: "copper", label: "Copper" },
  { value: "pearl", label: "Pearl" },
  { value: "obsidian", label: "Obsidian" },
  { value: "sakura", label: "Sakura" },
  { value: "jade", label: "Jade" },
  { value: "cobalt", label: "Cobalt" },
  { value: "rust", label: "Rust" },
  { value: "fog", label: "Fog" },
  { value: "spark", label: "Spark" },
  { value: "velvet", label: "Velvet" },
  { value: "aurora", label: "Aurora" },
  { value: "noir_blue", label: "Noir blue" },
  { value: "candy_crush", label: "Candy crush" },
  { value: "smoke", label: "Smoke" },
  { value: "laser", label: "Laser" },
  { value: "bronze", label: "Bronze" },
  { value: "ice_blue", label: "Ice blue" },
  { value: "mango", label: "Mango" },
  { value: "plum", label: "Plum" },
  { value: "slate", label: "Slate" },
  { value: "flare_warm", label: "Flare warm" },
  { value: "bleach_soft", label: "Bleach soft" },
  { value: "cinema_teal", label: "Cinema teal" },
  { value: "punch_red", label: "Punch red" },
  { value: "soft_sepia", label: "Soft sepia" },
  { value: "neon_violet", label: "Neon violet" },
  { value: "forest_dusk", label: "Forest dusk" },
  { value: "chrome_blue", label: "Chrome blue" },
  { value: "glow_amber", label: "Glow amber" },
  { value: "hard_contrast", label: "Hard contrast" },
  { value: "soft_matte", label: "Soft matte" },
  { value: "urban_night", label: "Urban night" },
  { value: "tropical", label: "Tropical" },
  { value: "winter_fade", label: "Winter fade" },
  { value: "ink_red", label: "Ink red" },
  { value: "mint_noir", label: "Mint noir" },
  { value: "gold_rush", label: "Gold rush" },
  { value: "steel_noir", label: "Steel noir" },
  { value: "bubblegum", label: "Bubblegum" },
  { value: "deep_purple", label: "Deep purple" },
  { value: "lime_crush", label: "Lime crush" },
  { value: "ocean_mist", label: "Ocean mist" },
  { value: "ember_glow", label: "Ember glow" },
  { value: "none", label: "None" },
];

export const TRANSITION_PRESETS: Preset[] = [
  { value: "", label: "Auto (from montage pool)" },
  { value: "fade", label: "Fade" },
  { value: "dissolve", label: "Dissolve" },
  { value: "fadeblack", label: "Fade black" },
  { value: "fadewhite", label: "Fade white" },
  { value: "fadegrays", label: "Fade gray" },
  { value: "pixelize", label: "Pixelize" },
  { value: "distance", label: "Distance" },
  { value: "radial", label: "Radial" },
  { value: "hblur", label: "Blur" },
  { value: "wipeleft", label: "Wipe ←" },
  { value: "wiperight", label: "Wipe →" },
  { value: "wipeup", label: "Wipe ↑" },
  { value: "wipedown", label: "Wipe ↓" },
  { value: "slideleft", label: "Slide ←" },
  { value: "slideright", label: "Slide →" },
  { value: "slideup", label: "Slide ↑" },
  { value: "slidedown", label: "Slide ↓" },
  { value: "smoothleft", label: "Smooth ←" },
  { value: "smoothright", label: "Smooth →" },
  { value: "smoothup", label: "Smooth ↑" },
  { value: "smoothdown", label: "Smooth ↓" },
  { value: "circleopen", label: "Circle open" },
  { value: "circleclose", label: "Circle close" },
  { value: "circlecrop", label: "Circle crop" },
  { value: "rectcrop", label: "Rect crop" },
  { value: "vertopen", label: "Vert open" },
  { value: "horzopen", label: "Horz open" },
  { value: "diagtl", label: "Diag TL" },
  { value: "diagtr", label: "Diag TR" },
  { value: "diagbl", label: "Diag BL" },
  { value: "diagbr", label: "Diag BR" },
  { value: "zoomin", label: "Zoom in" },
  { value: "squeezeh", label: "Squeeze H" },
  { value: "squeezev", label: "Squeeze V" },
  { value: "hlslice", label: "H slice L" },
  { value: "hrslice", label: "H slice R" },
];

export const STYLE_PROMPT_PRESETS: Preset[] = [
  {
    value:
      "Powerful male narrator. Short punchy lines about discipline, focus, and building a better life. Never soft. Always cinematic.",
    label: "Powerful discipline narrator",
  },
  {
    value:
      "Calm mentor voice. Speak like a coach who has been through failure. Practical advice, no fluff, warm but firm.",
    label: "Calm mentor coach",
  },
  {
    value:
      "High-energy hype. Fast sentences. Gym and grind culture. Make the viewer feel they must act today.",
    label: "Gym grind hype",
  },
  {
    value:
      "Stoic philosopher tone. Timeless lessons. Sparse words. End with one clear principle.",
    label: "Stoic philosopher",
  },
  {
    value:
      "Modern entrepreneur. Money, leverage, and focus. Speak to ambitious builders. Avoid scammy get-rich talk.",
    label: "Modern entrepreneur",
  },
  {
    value:
      "Soft but strong female mentor. Confidence, boundaries, and self-respect. Empower without clichés.",
    label: "Strong female mentor",
  },
  {
    value:
      "Storyteller. Start with a scene, then the twist lesson. Emotional but concise for Shorts.",
    label: "Storyteller twist",
  },
  {
    value:
      "Brutal honesty. Call out bad habits directly. Tough love. Short, sharp, memorable lines.",
    label: "Brutal honesty",
  },
  {
    value:
      "Luxury lifestyle narration. Quiet confidence. Quality over quantity. Elegant pacing.",
    label: "Luxury lifestyle",
  },
  {
    value:
      "Immigrant hustle storyteller. Respect for hard work, family, and building from zero. Hopeful and real.",
    label: "Immigrant hustle",
  },
];

export const BRAND_RULES_PRESETS: Preset[] = [
  { value: "Never mention politics. Never sell hard. No links in replies.", label: "No politics / soft sell" },
  { value: "No medical claims. No guarantees. Stay motivational only.", label: "No medical claims" },
  { value: "Keep PG-13. No swearing. Family-friendly.", label: "Family-friendly PG-13" },
  { value: "Allowed light swearing for emphasis. No hate speech.", label: "Light swearing OK" },
  { value: "Never attack other creators. Stay positive or constructive.", label: "No creator attacks" },
  { value: "Always end with hope. Never leave the viewer hopeless.", label: "Always end with hope" },
  { value: "No crypto or get-rich-quick pitches.", label: "No crypto pitches" },
  { value: "Speak to one person ('you'), never a crowd lecture.", label: "Speak to one person" },
  { value: "Keep religious references neutral or avoid them.", label: "Neutral on religion" },
  { value: "Brand name never forced into script unless asked.", label: "No forced branding" },
];

export const REPLY_STYLE_PRESETS: Preset[] = [
  {
    value:
      "Reply warmly in the commenter's language. Keep it short. Stay on-brand. Never argue. Invite them to the next Short.",
    label: "Warm short invite",
  },
  {
    value: "Reply like a coach: brief, encouraging, one actionable tip. Same language as the comment.",
    label: "Coach tip reply",
  },
  {
    value: "Thank them first. Then one punchy line. Ask a follow-up question to boost replies.",
    label: "Thank + question",
  },
  {
    value: "Match their energy. If hype — hype back. If serious — be serious. Max 2 sentences.",
    label: "Match energy",
  },
  {
    value: "Never debate politics or religion. Redirect to self-improvement kindly.",
    label: "Redirect from debate",
  },
  {
    value: "Use their name if present. Compliment effort. Soft CTA to subscribe.",
    label: "Name + soft CTA",
  },
  {
    value: "Stoic and brief. One sentence max. Wisdom without arrogance.",
    label: "Stoic one-liner",
  },
  {
    value: "Playful emoji OK (1 max). Stay respectful. End with encouragement.",
    label: "Playful + respect",
  },
  {
    value: "If hate comment: calm boundary, no fuel. Offer to move on.",
    label: "Hate comment boundary",
  },
  {
    value: "Always reply in the comment language. Keep under 25 words.",
    label: "Under 25 words",
  },
];

export function ensurePreset(
  presets: Preset[],
  current: string,
): Preset[] {
  const v = (current || "").trim();
  if (!v) return presets;
  if (presets.some((p) => p.value === v)) return presets;
  return [{ value: v, label: `Custom: ${v.slice(0, 40)}` }, ...presets];
}
