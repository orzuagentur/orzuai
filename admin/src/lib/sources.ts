export type SourceCategory =
  | "database"
  | "storage"
  | "media"
  | "ai"
  | "voice"
  | "publish"
  | "hosting"
  | "render"
  | "assets"
  | "email"
  | "domains"
  | "legacy";

/** Health of the integration for ops (limits / billing). */
export type OpsHealth =
  | "ok"
  | "watch"
  | "raise_limit"
  | "need_paid"
  | "setup";

export type SourceEntry = {
  id: string;
  name: string;
  tagline: string;
  category: SourceCategory;
  categoryLabel: string;
  website: string;
  usedIn: string[];
  purpose: string;
  details: string[];
  envKeys: string[];
  status: "active" | "legacy" | "infra";
  /** Card badge: is the free/paid plan enough? */
  opsHealth: OpsHealth;
  /** Short status line on the card */
  opsStatusLabel: string;
  /** What to do next (raise limit, upgrade, verify domain, etc.) */
  opsAction: string;
  /** Typical plan / quota note */
  planHint: string;
};

export const SOURCES: SourceEntry[] = [
  {
    id: "supabase",
    name: "Supabase",
    tagline: "Auth, Postgres, and app data",
    category: "database",
    categoryLabel: "Database & Auth",
    website: "https://supabase.com",
    usedIn: ["Web app", "Admin", "Worker"],
    purpose:
      "Primary backend: user accounts, profiles (including is_admin), video jobs, music metadata, favorites, usage/costs, and Row Level Security.",
    details: [
      "Email/password auth for clients and admins.",
      "profiles.is_admin gates the separate admin console.",
      "music_genres / music_tracks store the shared platform music catalog (is_platform).",
      "video_jobs and related tables drive Creativity / daily pipelines.",
      "Service role is used by admin APIs and the Python worker; anon key is used by browsers.",
    ],
    envKeys: [
      "NEXT_PUBLIC_SUPABASE_URL",
      "NEXT_PUBLIC_SUPABASE_ANON_KEY",
      "SUPABASE_SERVICE_ROLE_KEY",
      "SUPABASE_URL (worker)",
    ],
    status: "active",
    opsHealth: "watch",
    opsStatusLabel: "Watch DB size & egress",
    opsAction:
      "If approaching Free/Pro storage or egress caps, upgrade Supabase plan or raise project limits in the dashboard.",
    planHint: "Pro recommended in production; Free is OK for early staging.",
  },
  {
    id: "cloudflare-r2",
    name: "Cloudflare R2",
    tagline: "Object storage for video & music files",
    category: "storage",
    categoryLabel: "Storage",
    website: "https://www.cloudflare.com/developer-platform/r2/",
    usedIn: ["Web app", "Admin", "Worker"],
    purpose:
      "All large binary media lives in R2: finished videos, thumbnails, uploaded music tracks. Supabase holds only metadata and URLs.",
    details: [
      "Bucket default: orzu-media (R2_BUCKET).",
      "Public CDN base: R2_PUBLIC_BASE_URL (e.g. media.orzuai.com).",
      "Admin uses signed GET URLs so playback works from the admin domain.",
      "Music uploads go through presigned PUT then register rows in music_tracks.",
      "Worker uploads rendered MP4s and assets via boto3 / S3 API.",
    ],
    envKeys: [
      "R2_ACCOUNT_ID",
      "R2_ACCESS_KEY_ID",
      "R2_SECRET_ACCESS_KEY",
      "R2_BUCKET",
      "R2_PUBLIC_BASE_URL",
      "R2_ENDPOINT",
      "R2_REGION",
    ],
    status: "active",
    opsHealth: "ok",
    opsStatusLabel: "Storage OK",
    opsAction:
      "Monitor Class A/B ops and stored GB in Cloudflare. Raise R2 budget if monthly video volume grows.",
    planHint: "Pay-as-you-go R2; no egress fees to Cloudflare network.",
  },
  {
    id: "pexels",
    name: "Pexels",
    tagline: "Stock video & photo footage",
    category: "media",
    categoryLabel: "Stock media",
    website: "https://www.pexels.com/api/",
    usedIn: ["Web Media studio", "Admin Media", "Worker"],
    purpose:
      "Search and download royalty-free clips used as B-roll in generated videos and in the Media browser.",
    details: [
      "Queried from Media search APIs and from the worker during job render.",
      "Script generation can suggest Pexels search queries.",
      "Downloaded / referenced assets can be bookmarked in favorites.",
    ],
    envKeys: ["PEXELS_API_KEY"],
    status: "active",
    opsHealth: "raise_limit",
    opsStatusLabel: "May need higher API limit",
    opsAction:
      "If search returns 429 / rate errors, request a higher Pexels API limit or add a second key. Production traffic often outgrows the default free quota.",
    planHint: "Free API key with rate limits — request increase for production.",
  },
  {
    id: "unsplash",
    name: "Unsplash",
    tagline: "High-quality stock photos",
    category: "media",
    categoryLabel: "Stock media",
    website: "https://unsplash.com/developers",
    usedIn: ["Web photo library", "Presentations / creators"],
    purpose:
      "Photo search for creator libraries and presentation visuals when Unsplash is configured.",
    details: [
      "Requires UNSPLASH_ACCESS_KEY on the web project.",
      "Used alongside Pexels/Pixabay for photo coverage.",
      "Demo/demo rates are limited — production needs a registered app.",
    ],
    envKeys: ["UNSPLASH_ACCESS_KEY"],
    status: "active",
    opsHealth: "raise_limit",
    opsStatusLabel: "Demo limit — upgrade app",
    opsAction:
      "Register a production Unsplash app and request higher rate limits if photo search is heavy. Demo keys are too low for multi-user traffic.",
    planHint: "Free developer app; production approval / higher quota as needed.",
  },
  {
    id: "pixabay",
    name: "Pixabay",
    tagline: "Stock photos & clips backup source",
    category: "media",
    categoryLabel: "Stock media",
    website: "https://pixabay.com/api/docs/",
    usedIn: ["Web media search"],
    purpose:
      "Additional stock photo/video search to broaden results beyond Pexels/Unsplash.",
    details: [
      "PIXABAY_API_KEY on web (and admin if Media search uses it).",
      "Fallback / parallel provider for library search.",
    ],
    envKeys: ["PIXABAY_API_KEY"],
    status: "active",
    opsHealth: "watch",
    opsStatusLabel: "Watch hourly quota",
    opsAction:
      "If Pixabay rate limits hit, space out requests or request a higher quota from Pixabay support.",
    planHint: "Free API with hourly request caps.",
  },
  {
    id: "iconify",
    name: "Iconify",
    tagline: "Icon sets for creator libraries",
    category: "assets",
    categoryLabel: "Assets",
    website: "https://iconify.design",
    usedIn: ["Web icons library", "Presentations"],
    purpose:
      "Public Iconify API powers the icons browser for presentations and creator assets (no paid key required).",
    details: [
      "Calls api.iconify.design from the web app.",
      "No secret env key — public CDN/API.",
      "Cache aggressively if traffic grows.",
    ],
    envKeys: [],
    status: "active",
    opsHealth: "ok",
    opsStatusLabel: "Public API OK",
    opsAction:
      "Usually no billing. If Iconify rate-limits, add caching or self-host icon JSON packs.",
    planHint: "Free public API — no subscription.",
  },
  {
    id: "openai",
    name: "OpenAI",
    tagline: "Scripts, hooks, clipping picks, comments",
    category: "ai",
    categoryLabel: "AI",
    website: "https://platform.openai.com",
    usedIn: ["Worker", "Web (YouTube comments API)", "Whisper transcription"],
    purpose:
      "LLM for video scripts, hooks, music mood hints, clip window picking, and AI replies to YouTube comments. Whisper for transcription on clipping.",
    details: [
      "Default model: gpt-4o-mini (OPENAI_MODEL).",
      "Worker scriptgen builds Creativity / daily video copy.",
      "Usage and estimated cost are logged for the Expenses screen.",
      "Web can call OpenAI for comment drafts when enabled.",
    ],
    envKeys: ["OPENAI_API_KEY", "OPENAI_MODEL"],
    status: "active",
    opsHealth: "need_paid",
    opsStatusLabel: "Paid usage — set spend cap",
    opsAction:
      "Ensure billing is active with a monthly spend limit. Raise TPM/RPM org limits if jobs queue on 429. Prefer gpt-4o-mini for cost control.",
    planHint: "Pay-as-you-go; set Organization usage limits in OpenAI dashboard.",
  },
  {
    id: "elevenlabs",
    name: "ElevenLabs",
    tagline: "Text-to-speech voiceovers",
    category: "voice",
    categoryLabel: "Voice",
    website: "https://elevenlabs.io",
    usedIn: ["Worker"],
    purpose:
      "Turns script text into spoken audio beds that are mixed into the final video.",
    details: [
      "Voice id configurable via ELEVENLABS_VOICE_ID.",
      "Character usage is tracked for Expenses.",
      "Runs only on the worker machine during render.",
    ],
    envKeys: ["ELEVENLABS_API_KEY", "ELEVENLABS_VOICE_ID"],
    status: "active",
    opsHealth: "raise_limit",
    opsStatusLabel: "Characters — upgrade if low",
    opsAction:
      "If voice jobs fail on quota, upgrade ElevenLabs plan or buy more characters. Starter plans run out quickly with daily Shorts.",
    planHint: "Starter → Creator/Pro as channel volume grows.",
  },
  {
    id: "youtube",
    name: "YouTube",
    tagline: "OAuth publish & channel tools",
    category: "publish",
    categoryLabel: "Publishing",
    website: "https://developers.google.com/youtube",
    usedIn: ["Web app", "Worker"],
    purpose:
      "Connect a channel, upload/publish videos, and manage comments / training against the user’s YouTube account.",
    details: [
      "OAuth connect + callback on the client site.",
      "Tokens stored per profile for worker uploads.",
      "YOUTUBE_REDIRECT_URI must match the live domain (www.orzuai.com).",
    ],
    envKeys: [
      "YOUTUBE_CLIENT_ID",
      "YOUTUBE_CLIENT_SECRET",
      "YOUTUBE_REDIRECT_URI",
    ],
    status: "active",
    opsHealth: "watch",
    opsStatusLabel: "Watch quota units",
    opsAction:
      "Monitor Google Cloud YouTube Data API quota. Request quota increase if uploads/comments hit daily unit limits.",
    planHint: "Google Cloud project free tier quota; request increase for scale.",
  },
  {
    id: "vercel",
    name: "Vercel",
    tagline: "Hosts web + admin Next.js apps",
    category: "hosting",
    categoryLabel: "Hosting",
    website: "https://vercel.com",
    usedIn: ["orzuai.com", "orzuvideo-admin"],
    purpose:
      "Serverless hosting for the customer web app and the isolated admin project (same GitHub repo, different Root Directory).",
    details: [
      "Client root: web/",
      "Admin root: admin/ → orzuvideo-admin.vercel.app",
      "Env vars are configured separately per Vercel project.",
      "Also runs scheduled cron routes when CRON_SECRET / Vercel Cron is set.",
    ],
    envKeys: ["CRON_SECRET", "NEXT_PUBLIC_APP_URL", "VERCEL"],
    status: "infra",
    opsHealth: "watch",
    opsStatusLabel: "Watch function usage",
    opsAction:
      "If cron or API hits Hobby limits, move web to Pro. Keep admin on a separate Vercel project.",
    planHint: "Hobby for early; Pro for production cron + bandwidth.",
  },
  {
    id: "railway",
    name: "Railway",
    tagline: "Long-running video worker",
    category: "hosting",
    categoryLabel: "Hosting",
    website: "https://railway.app",
    usedIn: ["Worker (Python)"],
    purpose:
      "Runs the OrzuVideo worker that polls jobs, downloads media, synthesizes voice, renders with FFmpeg, and uploads results to R2 / YouTube.",
    details: [
      "Needs the same Supabase service role + R2 + OpenAI + ElevenLabs + Pexels keys as production.",
      "Poll interval via POLL_INTERVAL_SEC.",
      "Temp disk for intermediate media during render.",
    ],
    envKeys: [
      "SUPABASE_URL",
      "SUPABASE_SERVICE_ROLE_KEY",
      "POLL_INTERVAL_SEC",
      "TEMP_DIR",
    ],
    status: "infra",
    opsHealth: "need_paid",
    opsStatusLabel: "Paid usage for CPU/disk",
    opsAction:
      "Scale worker RAM/CPU and disk if FFmpeg jobs OOM or fill temp. Add a second worker replica if queue grows.",
    planHint: "Usage-based Railway plan — budget for continuous worker + disk.",
  },
  {
    id: "ffmpeg",
    name: "FFmpeg",
    tagline: "Local video / audio assembly",
    category: "render",
    categoryLabel: "Render",
    website: "https://ffmpeg.org",
    usedIn: ["Worker"],
    purpose:
      "Cuts, overlays, mixes voice + music, and encodes the final MP4 on the worker host.",
    details: [
      "Must be installed on the machine running the worker.",
      "Used across montage / clipping / thumbnail pipelines.",
      "Not a cloud SaaS — binary dependency on Railway/local.",
    ],
    envKeys: [],
    status: "infra",
    opsHealth: "ok",
    opsStatusLabel: "Local binary OK",
    opsAction:
      "No SaaS limit. Ensure worker image includes a recent FFmpeg build with libx264 + filters.",
    planHint: "Open-source — no subscription.",
  },
  {
    id: "poly-haven",
    name: "Poly Haven",
    tagline: "CC0 3D / HDR / texture assets",
    category: "assets",
    categoryLabel: "Assets",
    website: "https://polyhaven.com",
    usedIn: ["Web Creators studio"],
    purpose:
      "Optional browser for free Poly Haven models, HDRIs, and textures for creators exploring assets.",
    details: [
      "Public Poly Haven API (no paid key in repo).",
      "Used from the Creators / Poly Haven UI on the client site.",
      "Not required for core video generation.",
    ],
    envKeys: [],
    status: "active",
    opsHealth: "ok",
    opsStatusLabel: "Public API OK",
    opsAction: "No billing. Cache CDN responses if users browse heavily.",
    planHint: "Free CC0 assets — no subscription.",
  },
  {
    id: "platform-music",
    name: "Platform music library",
    tagline: "Shared R2 music catalog for all videos",
    category: "media",
    categoryLabel: "Stock media",
    website: "/music",
    usedIn: ["Admin Music", "Worker background beds"],
    purpose:
      "Admin-curated genres and tracks stored in R2 + music_* tables. Every video job picks from this shared is_platform catalog.",
    details: [
      "Managed only in the admin Music section.",
      "Any admin account sees and extends the same library.",
      "Worker falls back to per-user library only if is_platform is missing.",
      "Duplicates are skipped via file_hash across the platform catalog.",
    ],
    envKeys: ["(same as Cloudflare R2 + Supabase)"],
    status: "active",
    opsHealth: "ok",
    opsStatusLabel: "Internal catalog OK",
    opsAction:
      "Keep uploading cleared tracks in Admin → Music. Storage cost follows R2.",
    planHint: "Internal — no third-party music SaaS fee.",
  },
  {
    id: "resend",
    name: "Resend",
    tagline: "Transactional email API",
    category: "email",
    categoryLabel: "Email",
    website: "https://resend.com",
    usedIn: ["Web app", "Admin Email"],
    purpose:
      "Sends all OrzuAi product emails through one branded HTML template: welcome, login OTP, password reset, reset success, and new-device alerts.",
    details: [
      "API key: RESEND_API_KEY on the web (and admin) Vercel projects.",
      "From address stored in email_settings (editable in Admin → Email).",
      "Until a custom domain is verified, use onboarding@resend.dev for tests.",
      "Admin Email section previews every template card.",
    ],
    envKeys: ["RESEND_API_KEY", "RESEND_FROM_EMAIL"],
    status: "active",
    opsHealth: "watch",
    opsStatusLabel: "Verify domain + volume",
    opsAction:
      "Verify orzuai.com DNS in Resend. Upgrade plan if monthly email volume exceeds Free tier.",
    planHint: "Free tier for early; paid as auth email volume grows.",
  },
  {
    id: "namecheap",
    name: "Namecheap",
    tagline: "Domains & professional email",
    category: "domains",
    categoryLabel: "Domains",
    website: "https://www.namecheap.com",
    usedIn: ["DNS", "Mailbox / forwarding"],
    purpose:
      "Buy and manage the OrzuAi domain and optional professional mailboxes. Point DNS (SPF/DKIM/DMARC) at Resend for deliverability.",
    details: [
      "Purchase/renew domain (e.g. orzuai.com / mail subdomain).",
      "Add Resend DNS records from the Resend domain wizard.",
      "Optional Namecheap Private Email or forwarding to support inbox.",
      "Not an in-app API — ops dependency documented here for the team.",
    ],
    envKeys: [],
    status: "infra",
    opsHealth: "ok",
    opsStatusLabel: "Renew domain yearly",
    opsAction:
      "Keep auto-renew on. Ensure SPF/DKIM/DMARC still point at Resend after DNS edits.",
    planHint: "Annual domain + optional Private Email.",
  },
];

export function getSource(id: string): SourceEntry | undefined {
  return SOURCES.find((s) => s.id === id);
}

export function opsHealthLabel(h: OpsHealth): string {
  switch (h) {
    case "ok":
      return "OK";
    case "watch":
      return "Watch";
    case "raise_limit":
      return "Raise limit";
    case "need_paid":
      return "Paid / upgrade";
    case "setup":
      return "Needs setup";
    default:
      return h;
  }
}
