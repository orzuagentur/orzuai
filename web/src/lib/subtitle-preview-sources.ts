import { SUBTITLE_STYLES, SUBTITLE_STYLE_IDS } from "@/lib/editor-catalog";

/** One unique Unsplash still per subtitle style (seed for first-time R2 cache). */
const UNSPLASH_STILLS = [
  "1492691527719-9d1e07e534b4",
  "1514525253161-7a46d19cd819",
  "1485846234645-a62644f84728",
  "1550684848-fac1c5b4e853",
  "1506905925346-21bda4d32df4",
  "1470229722913-7c0e2dbbafd3",
  "1469474968028-56623f02e42e",
  "1516035069371-29a1b244cc32",
  "1536440136628-849c177e76a1",
  "1574717024653-61fd2cf4d44d",
  "1451187580459-43490279c0fa",
  "1441974231531-c6227db76b6e",
  "1611162616475-46b635cb6868",
  "1519681393784-d120267933ba",
  "1507003211169-0a1dd7228f2d",
  "1493225457124-a3eb161ffa5f",
  "1455390582262-044cdead277a",
  "1516280440612-907644e9deba",
  "1550684848-89b6e8f564f8",
  "1501785880826-56d285d7a213",
  "1518770660439-4636190af475",
  "1526374965318-7f61d4dc18c5",
  "1524250502761-1ad6da2283f8",
  "1504384308090-c894fdcc538d",
  "1491002051414-454ac27445e9",
  "1472214103451-9374bd1c798e",
  "1519682337058-a94a5194-fcf0",
  "1506157785241-7a7f9e734246",
  "1464822759023-fed6225832c3",
  "1515405295579-7eb0e4ebb019",
  "1526481280695-3aab583786c6",
  "1480714378408-67cf0d13b963",
  "1519501025264-65ba35632f0a",
  "1523961131990-5dfe78734602",
  "1542753444-436903b73e4b",
  "1500530855697-b586d89ba3ee",
  "1518837690689-578a1bfaacb1",
  "1523438884716-0a2701074ed0",
  "1493246507139-91e8efd70446",
  "1504198458649-3128b932ad49",
  "1517248135467-4c7edcad34c4",
  "1522202176988-66273c2fd55f",
  "1529156069898-49953e39b3ac",
  "1516321318523-f43f12a2c9a5",
  "1521737711869-e3b0755c001a",
  "1557804506-669a67965ba0",
  "1556761175-b413da4baf72",
  "1552664730-d307ca884978",
  "1553877522-43269d4ea984",
  "1556760547-740de0a55865",
  "1551434678-e076c223a692",
  "1556761175-5973dc0f324e",
  "1559136881-264c5d989696",
  "1557683316-86679f504204",
  "1558618666-fcd25c85cd64",
  "1560472354-b33ff0c44a43",
  "1563986768609-322da13575f3",
  "1565299624946-b28f1a2b4b2a",
  "1567620905732-2d1ec7ab7445",
  "1571019613454-1cb2f99b2d8b",
  "1574623451916-756e8c1c9a0d",
  "1581091226825-a6a2a5aee158",
  "1581092160562-40aa08e78837",
  "1581092918056-0c889c377637",
] as const;

function unsplashUrl(photoId: string): string {
  return `https://images.unsplash.com/photo-${photoId}?auto=format&fit=crop&w=640&h=640&q=82`;
}

/**
 * Deterministic, always-unique fallback for styles beyond the curated Unsplash
 * list. Uses a per-style seed so every card renders a distinct still and never
 * 404s (unlike hand-maintained photo ids).
 */
function seededStillUrl(styleId: string): string {
  return `https://picsum.photos/seed/orzu-${encodeURIComponent(styleId)}/640/640`;
}

const SOURCE_BY_ID: Record<string, string> = {};
SUBTITLE_STYLES.forEach((style, index) => {
  SOURCE_BY_ID[style.id] =
    index < UNSPLASH_STILLS.length
      ? unsplashUrl(UNSPLASH_STILLS[index])
      : seededStillUrl(style.id);
});

export function subtitlePreviewSourceUrl(styleId: string): string | null {
  return SOURCE_BY_ID[styleId] || null;
}

export function subtitlePreviewR2Key(styleId: string): string {
  return `platform/subtitle-previews/${styleId}.jpg`;
}

export function isSubtitleStyleId(id: string): boolean {
  return SUBTITLE_STYLE_IDS.has(id);
}

export function subtitlePreviewApiPath(styleId: string): string {
  return `/api/subtitles/preview-bg/${encodeURIComponent(styleId)}`;
}
