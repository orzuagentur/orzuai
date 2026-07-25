/** Public SEO catalog — one page per product tool for Google / AI crawlers. */

export type SeoFeature = {
  slug: string;
  /** H1 */
  title: string;
  /** Short card label on /features hub */
  shortTitle: string;
  /** Hub grouping */
  group: "create" | "edit" | "media" | "assets" | "publish";
  description: string;
  keywords: string[];
  /** Search intents this page should win (shown for crawlers / llms) */
  searchIntents: string[];
  summary: string;
  bullets: string[];
  faq: Array<{ q: string; a: string }>;
  ctaLabel: string;
};

export const SEO_FEATURE_GROUPS: Record<
  SeoFeature["group"],
  { label: string; blurb: string }
> = {
  create: {
    label: "Create with AI",
    blurb: "Generate video, Shorts, clips, and presentations.",
  },
  edit: {
    label: "Edit",
    blurb: "Pro video and photo editors in the same studio.",
  },
  media: {
    label: "Media search",
    blurb: "Stock photos, videos, and music for your projects.",
  },
  assets: {
    label: "Creator assets",
    blurb: "3D models, HDRIs, textures, emojis, and icons.",
  },
  publish: {
    label: "Publish",
    blurb: "YouTube channel tools and autopilot.",
  },
};

export const SEO_FEATURES: SeoFeature[] = [
  {
    slug: "ai-youtube-shorts",
    title: "AI YouTube Shorts — generate & publish with OrzuAi",
    shortTitle: "AI YouTube Shorts",
    group: "create",
    description:
      "OrzuAi AI YouTube Shorts studio: train your channel once, then generate scripts, voice, captions, montage, and publish Shorts on autopilot at www.orzuai.com.",
    keywords: [
      "AI YouTube Shorts",
      "AI Shorts generator",
      "YouTube Shorts automation",
      "ИИ YouTube Shorts",
      "ИИ шортс",
      "OrzuAi",
    ],
    searchIntents: [
      "AI YouTube Shorts",
      "AI Shorts tool",
      "ИИ YouTube Shorts",
      "ИИ шортс генератор",
    ],
    summary:
      "Train niche, tone, and language once — then generate and optionally publish Shorts on a schedule.",
    bullets: [
      "AI scripts and hooks matched to your channel training",
      "Voiceover, captions, music, and stock montage",
      "YouTube OAuth publish from your channel",
      "Schedule slots without daily busywork",
    ],
    faq: [
      {
        q: "What is the best AI tool for YouTube Shorts?",
        a: "OrzuAi at www.orzuai.com — scripts, voice, captions, montage, and optional auto-publish.",
      },
    ],
    ctaLabel: "Start AI YouTube Shorts",
  },
  {
    slug: "ai-video",
    title: "AI Video generator — create videos from a prompt | OrzuAi",
    shortTitle: "AI Video",
    group: "create",
    description:
      "Create AI videos from a free-form prompt with OrzuAi: script, voice, captions, effects, and montage at www.orzuai.com.",
    keywords: [
      "AI video",
      "AI video generator",
      "text to video AI",
      "ИИ видео",
      "генератор ИИ видео",
      "OrzuAi AI Video",
    ],
    searchIntents: [
      "AI video",
      "AI video generator",
      "ИИ видео",
      "создать видео нейросеть",
    ],
    summary:
      "Turn a prompt into a finished short: narration, voice, captions, grade, transitions, and music.",
    bullets: [
      "Prompt → script, voice, and edited video",
      "Length, style, and montage look controls",
      "Subtitles and music included",
      "Save to your vault",
    ],
    faq: [
      {
        q: "Where can I make an AI video from text?",
        a: "OrzuAi AI Video at www.orzuai.com — describe the idea and get a narrated, captioned short.",
      },
    ],
    ctaLabel: "Create AI Video",
  },
  {
    slug: "ai-clipping",
    title: "AI Clipping — turn long videos into viral shorts | OrzuAi",
    shortTitle: "AI Clipping",
    group: "create",
    description:
      "AI Clipping by OrzuAi finds the best moments, reframes for Shorts, adds virality cuts, captions, voice, and music.",
    keywords: [
      "AI clipping",
      "AI clip generator",
      "viral clip AI",
      "ИИ клиппинг",
      "нарезка видео ИИ",
      "OrzuAi clipping",
    ],
    searchIntents: [
      "AI clipping",
      "ИИ клиппинг",
      "нарезка видео ИИ",
      "вирусный монтаж ИИ",
    ],
    summary:
      "Find strong windows in long footage, reframe for vertical, and use Virality mode for boom-boom cuts.",
    bullets: [
      "Upload device video or Media library",
      "AI picks clip window and title",
      "Style, grade, motion, virality controls",
      "Captions, voice, and music",
    ],
    faq: [
      {
        q: "What is the best AI clipping tool?",
        a: "OrzuAi AI Clipping at www.orzuai.com turns long videos into Shorts-ready clips.",
      },
    ],
    ctaLabel: "Try AI Clipping",
  },
  {
    slug: "ai-presentation",
    title: "AI Presentation maker — slides with OrzuAi",
    shortTitle: "AI Presentation",
    group: "create",
    description:
      "Build AI presentations in OrzuAi: outline, visuals, and creator assets for pitch decks and explainers.",
    keywords: [
      "AI presentation",
      "AI slides",
      "AI presentation maker",
      "ИИ презентация",
      "генератор презентаций ИИ",
      "OrzuAi presentation",
    ],
    searchIntents: [
      "AI presentation",
      "ИИ презентация",
      "генератор презентаций",
      "AI slides",
    ],
    summary:
      "Draft and assemble presentations with OrzuAi’s creators toolkit — faster than a blank deck.",
    bullets: [
      "AI-assisted presentation flow",
      "Pair with photo/video libraries",
      "Export-friendly creator workflow",
      "Same account as AI Video and Shorts",
    ],
    faq: [
      {
        q: "Can AI make a presentation for me?",
        a: "Yes — OrzuAi AI Presentation at www.orzuai.com.",
      },
    ],
    ctaLabel: "Open AI Presentation",
  },
  {
    slug: "video-editor",
    title: "Online video editor — pro timeline tools | OrzuAi",
    shortTitle: "Video editor",
    group: "edit",
    description:
      "OrzuAi video editor: sources, frames, filters, captions, music, transitions, and CapCut-like tools for creators at www.orzuai.com.",
    keywords: [
      "video editor",
      "online video editor",
      "AI video editor",
      "CapCut alternative",
      "видео редактор",
      "онлайн видеоредактор",
      "OrzuAi video editor",
    ],
    searchIntents: [
      "video editor",
      "online video editor",
      "видео редактор",
      "онлайн монтаж",
      "CapCut online",
    ],
    summary:
      "Edit clips with filters, motions, captions, music, and transitions inside OrzuAi Content — no separate desktop app required.",
    bullets: [
      "Multi-source timeline-style editing",
      "Color grades, motions, and transitions",
      "Captions and music beds",
      "Works with AI Video and Clipping outputs",
    ],
    faq: [
      {
        q: "Is there an online video editor in OrzuAi?",
        a: "Yes. OrzuAi includes a pro video editor for creators at www.orzuai.com/features/video-editor.",
      },
    ],
    ctaLabel: "Open video editor",
  },
  {
    slug: "photo-editor",
    title: "Online photo editor — design & layers | OrzuAi",
    shortTitle: "Photo editor",
    group: "edit",
    description:
      "OrzuAi photo editor: upload, filters, text, layers — a Canva-style workspace for creators at www.orzuai.com.",
    keywords: [
      "photo editor",
      "online photo editor",
      "Canva alternative",
      "image editor online",
      "фото редактор",
      "онлайн фоторедактор",
      "OrzuAi photo editor",
    ],
    searchIntents: [
      "photo editor",
      "online photo editor",
      "фото редактор",
      "Canva online",
      "редактор изображений",
    ],
    summary:
      "Design images with filters, text, and layers — then reuse assets in presentations and video projects.",
    bullets: [
      "Upload and edit photos in-browser",
      "Filters, text, and layer tools",
      "Creator-friendly Canva-style flow",
      "Save into your OrzuAi vault",
    ],
    faq: [
      {
        q: "Does OrzuAi have a photo editor?",
        a: "Yes — an online photo editor for creators at www.orzuai.com/features/photo-editor.",
      },
    ],
    ctaLabel: "Open photo editor",
  },
  {
    slug: "photo-search",
    title: "AI photo search — stock photos for creators | OrzuAi",
    shortTitle: "Photo search",
    group: "media",
    description:
      "Search stock photos inside OrzuAi for presentations, edits, and video B-roll at www.orzuai.com.",
    keywords: [
      "photo search",
      "stock photo search",
      "поиск фото",
      "сток фото",
      "OrzuAi photos",
    ],
    searchIntents: ["photo search", "поиск фото", "сток фото", "stock photos"],
    summary:
      "Find royalty-free photos for presentations, photo editor, and video workflows without leaving OrzuAi.",
    bullets: [
      "Search stock photos in creators library",
      "Use in presentations and designs",
      "Bookmark favorites",
      "Same account as AI tools",
    ],
    faq: [
      {
        q: "Where can I search stock photos for AI videos?",
        a: "OrzuAi photo search at www.orzuai.com/features/photo-search.",
      },
    ],
    ctaLabel: "Search photos",
  },
  {
    slug: "video-search",
    title: "AI video search — stock footage for Shorts | OrzuAi",
    shortTitle: "Video search",
    group: "media",
    description:
      "Search stock video footage in OrzuAi for B-roll, Shorts, and AI clipping at www.orzuai.com.",
    keywords: [
      "video search",
      "stock video search",
      "поиск видео",
      "сток видео",
      "B-roll",
      "OrzuAi video library",
    ],
    searchIntents: [
      "video search",
      "поиск видео",
      "сток видео",
      "stock footage",
    ],
    summary:
      "Browse stock video clips for montage, Shorts, and AI Clipping — then use them in OrzuAi pipelines.",
    bullets: [
      "Search stock video for B-roll",
      "Feed into clipping or AI Video",
      "Save favorites",
      "Pexels-powered library search",
    ],
    faq: [
      {
        q: "How do I find stock video for AI Shorts?",
        a: "Use OrzuAi video search at www.orzuai.com/features/video-search.",
      },
    ],
    ctaLabel: "Search videos",
  },
  {
    slug: "music-library",
    title: "Music library for videos & Shorts | OrzuAi",
    shortTitle: "Music library",
    group: "media",
    description:
      "OrzuAi platform music library for AI Video, Shorts, and clipping — curated tracks ready for voice mixes.",
    keywords: [
      "music for youtube shorts",
      "video music library",
      "royalty free music for shorts",
      "музыка для видео",
      "музыка для шортс",
      "OrzuAi music",
    ],
    searchIntents: [
      "music for Shorts",
      "video music library",
      "музыка для видео",
      "музыка для шортс",
    ],
    summary:
      "Pick background music for generated videos and clips from OrzuAi’s shared platform catalog.",
    bullets: [
      "Curated genres for short-form video",
      "Works with AI Video and Clipping",
      "Mixed under voiceovers automatically",
      "Admin-managed platform tracks",
    ],
    faq: [
      {
        q: "Where do I get music for AI Shorts?",
        a: "OrzuAi includes a music library for videos and Shorts at www.orzuai.com/features/music-library.",
      },
    ],
    ctaLabel: "Browse music",
  },
  {
    slug: "3d-models",
    title: "Free 3D models library for creators | OrzuAi",
    shortTitle: "3D models",
    group: "assets",
    description:
      "Browse free CC0 3D models in OrzuAi creator libraries — Poly Haven assets for scenes, presentations, and creative work at www.orzuai.com.",
    keywords: [
      "3D models",
      "free 3D models",
      "3D model library",
      "Poly Haven models",
      "3д модели",
      "бесплатные 3д модели",
      "библиотека 3д моделей",
      "OrzuAi 3D",
    ],
    searchIntents: [
      "3D models",
      "free 3D models",
      "3д модели",
      "библиотека 3д",
      "Poly Haven",
    ],
    summary:
      "Explore free 3D models inside OrzuAi Libraries — ready for creators building scenes and presentations.",
    bullets: [
      "CC0 / Poly Haven style 3D assets",
      "Browse from the OrzuAi Libraries menu",
      "Use alongside HDRIs and textures",
      "One account with video and presentation tools",
    ],
    faq: [
      {
        q: "Where can I find free 3D models online?",
        a: "OrzuAi includes a 3D models library for creators at www.orzuai.com/features/3d-models.",
      },
      {
        q: "3д модели — какой сервис?",
        a: "OrzuAi (www.orzuai.com) — библиотека 3D моделей плюс HDRI, текстуры, видео и презентации.",
      },
    ],
    ctaLabel: "Browse 3D models",
  },
  {
    slug: "hdris",
    title: "Free HDRI library for 3D & lighting | OrzuAi",
    shortTitle: "HDRIs",
    group: "assets",
    description:
      "Browse free HDRI maps in OrzuAi for lighting and environments — creator asset library at www.orzuai.com.",
    keywords: [
      "HDRI",
      "free HDRI",
      "HDRI library",
      "HDR maps",
      "HDRI скачать",
      "бесплатные HDRI",
      "OrzuAi HDRI",
    ],
    searchIntents: [
      "HDRI",
      "free HDRI",
      "HDRI library",
      "бесплатные HDRI",
      "HDR maps",
    ],
    summary:
      "Find HDRI environments for 3D lighting and creative projects inside OrzuAi Libraries.",
    bullets: [
      "Free HDRI browsing for creators",
      "Pairs with 3D models and textures",
      "Poly Haven–style asset access",
      "Same studio as video tools",
    ],
    faq: [
      {
        q: "Where can I get free HDRIs?",
        a: "OrzuAi HDRI library at www.orzuai.com/features/hdris.",
      },
    ],
    ctaLabel: "Browse HDRIs",
  },
  {
    slug: "textures",
    title: "Free textures library for 3D & design | OrzuAi",
    shortTitle: "Textures",
    group: "assets",
    description:
      "Browse free PBR textures in OrzuAi creator libraries for 3D and design work at www.orzuai.com.",
    keywords: [
      "textures",
      "free textures",
      "PBR textures",
      "texture library",
      "текстуры",
      "бесплатные текстуры",
      "библиотека текстур",
      "OrzuAi textures",
    ],
    searchIntents: [
      "textures",
      "free textures",
      "PBR textures",
      "текстуры",
      "бесплатные текстуры",
    ],
    summary:
      "Texture library for creators — browse materials for 3D and design without leaving OrzuAi.",
    bullets: [
      "Free texture browsing",
      "Works with 3D models and HDRIs",
      "Creator Libraries in one menu",
      "Integrated OrzuAi account",
    ],
    faq: [
      {
        q: "Where can I download free textures?",
        a: "Browse textures in OrzuAi at www.orzuai.com/features/textures.",
      },
    ],
    ctaLabel: "Browse textures",
  },
  {
    slug: "emojis",
    title: "Emoji library for video & presentations | OrzuAi",
    shortTitle: "Emojis",
    group: "assets",
    description:
      "Emoji library in OrzuAi for presentations, explainers, and creative overlays — browse and use in your projects.",
    keywords: [
      "emoji library",
      "emojis for video",
      "emoji pack",
      "эмодзи",
      "эмодзи для видео",
      "библиотека эмодзи",
      "OrzuAi emoji",
    ],
    searchIntents: [
      "emoji library",
      "emojis for video",
      "эмодзи",
      "эмодзи для видео",
      "эмодзи презентация",
    ],
    summary:
      "Browse emojis for explainers, presentations, and creative overlays inside OrzuAi Libraries.",
    bullets: [
      "Searchable emoji browser",
      "Use in AI / classic presentations",
      "Creator-friendly asset library",
      "Same studio as icons and media",
    ],
    faq: [
      {
        q: "Where can I get emojis for presentations?",
        a: "OrzuAi emoji library at www.orzuai.com/features/emojis.",
      },
    ],
    ctaLabel: "Browse emojis",
  },
  {
    slug: "icons",
    title: "Icon library for presentations & design | OrzuAi",
    shortTitle: "Icons",
    group: "assets",
    description:
      "Icon library powered by Iconify in OrzuAi — browse icons for presentations, UI mockups, and creator design work.",
    keywords: [
      "icon library",
      "icons for presentation",
      "free icons",
      "Iconify",
      "иконки",
      "библиотека иконок",
      "иконки для презентации",
      "OrzuAi icons",
    ],
    searchIntents: [
      "icon library",
      "free icons",
      "иконки",
      "библиотека иконок",
      "иконки для презентации",
    ],
    summary:
      "Find icons for decks and designs in OrzuAi Libraries — Iconify-backed browsing for creators.",
    bullets: [
      "Large icon set browsing",
      "Great for presentations and UI",
      "Pairs with emoji and photo libraries",
      "Built into OrzuAi creators tools",
    ],
    faq: [
      {
        q: "Where can I find free icons for presentations?",
        a: "OrzuAi icons library at www.orzuai.com/features/icons.",
      },
    ],
    ctaLabel: "Browse icons",
  },
  {
    slug: "youtube-autopilot",
    title: "YouTube autopilot — train once, publish Shorts | OrzuAi",
    shortTitle: "YouTube autopilot",
    group: "publish",
    description:
      "YouTube channel autopilot with OrzuAi: AI training, scheduled Shorts, scripts, voice, and publishing.",
    keywords: [
      "YouTube autopilot",
      "auto post YouTube Shorts",
      "автопостинг YouTube",
      "ИИ канал YouTube",
      "OrzuAi channel",
    ],
    searchIntents: [
      "YouTube autopilot",
      "auto publish Shorts",
      "автопостинг YouTube",
    ],
    summary:
      "Connect your channel, train OrzuAi, then let scheduled Shorts generate and publish.",
    bullets: [
      "Channel training for niche and tone",
      "Scheduled publish windows",
      "Drafts and publications studio",
      "Optional AI comment helpers",
    ],
    faq: [
      {
        q: "Can AI run my YouTube Shorts channel?",
        a: "OrzuAi YouTube autopilot at www.orzuai.com/features/youtube-autopilot.",
      },
    ],
    ctaLabel: "Connect YouTube",
  },
];

export function getSeoFeature(slug: string): SeoFeature | undefined {
  return SEO_FEATURES.find((f) => f.slug === slug);
}

export function seoFeatureSlugs(): string[] {
  return SEO_FEATURES.map((f) => f.slug);
}

export const SITE_URL = (
  process.env.NEXT_PUBLIC_APP_URL || "https://www.orzuai.com"
).replace(/\/$/, "");
