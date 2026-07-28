from __future__ import annotations

import random
from pathlib import Path

import httpx

from orzuvideo.config import settings


def search_videos(
    query: str,
    per_page: int = 12,
    page: int = 1,
    *,
    orientation: str = "portrait",
) -> list[dict]:
    if not settings.pexels_api_key:
        raise RuntimeError("PEXELS_API_KEY is required")

    headers = {"Authorization": settings.pexels_api_key}
    params = {
        "query": query,
        "orientation": orientation
        if orientation in {"portrait", "landscape", "square"}
        else "portrait",
        "size": "medium",
        "per_page": per_page,
        "page": page,
    }
    with httpx.Client(timeout=60.0) as client:
        resp = client.get(
            "https://api.pexels.com/videos/search",
            headers=headers,
            params=params,
        )
        resp.raise_for_status()
        return resp.json().get("videos") or []


def _target_ratio(orientation: str) -> float:
    if orientation == "landscape":
        return 16 / 9
    if orientation == "square":
        return 1.0
    return 9 / 16


def _file_score(file_row: dict, *, orientation: str) -> float:
    width = float(file_row.get("width") or 0)
    height = float(file_row.get("height") or 0)
    if width <= 0 or height <= 0:
        return 0.0
    ratio = width / height
    target = _target_ratio(orientation)
    ratio_score = max(0.0, 1.0 - min(1.0, abs(ratio - target) / target))
    pixels = width * height
    resolution_score = min(1.0, pixels / (1280 * 720))
    hd_bonus = 0.2 if (width >= 720 and height >= 720) else 0.0
    return ratio_score * 70 + resolution_score * 35 + hd_bonus * 20


def _best_file(video: dict, *, orientation: str = "portrait") -> str | None:
    files = video.get("video_files") or []
    ranked = sorted(
        files,
        key=lambda f: _file_score(f, orientation=orientation),
        reverse=True,
    )
    for f in ranked:
        link = f.get("link")
        if link:
            return link
    return None


def _video_score(video: dict, *, orientation: str) -> float:
    best = max(
        (_file_score(f, orientation=orientation) for f in (video.get("video_files") or [])),
        default=0.0,
    )
    try:
        dur = float(video.get("duration") or 0)
    except (TypeError, ValueError):
        dur = 0.0
    # B-roll clips around 6-28s cut best; very tiny clips often loop badly.
    dur_score = 25.0 if 6 <= dur <= 28 else 12.0 if 3 <= dur < 45 else 0.0
    has_thumb = 8.0 if video.get("image") or video.get("video_pictures") else 0.0
    return best + dur_score + has_thumb + random.random() * 8.0


def download_stock_clips(
    queries: list[str],
    dest_dir: Path,
    count: int = 3,
    *,
    exclude_ids: set[str] | set[int] | None = None,
    orientation: str = "portrait",
) -> tuple[list[Path], list[str], list[dict]]:
    """
    Download unique Pexels clips, skipping IDs already used on prior videos.
    Returns (paths, used_asset_ids, clip_meta with thumbs).
    """
    dest_dir.mkdir(parents=True, exist_ok=True)
    clips: list[Path] = []
    used_ids: list[str] = []
    clip_meta: list[dict] = []
    seen_ids: set[str] = {str(x) for x in (exclude_ids or set())}

    shuffled = list(queries)
    random.shuffle(shuffled)
    # Extra generic queries if we keep hitting used IDs
    extras = [
        "cinematic city night",
        "athlete training grit",
        "sunrise mountain hike",
        "ocean waves drone",
        "neon street walking",
        "coffee shop creator",
        "storm clouds timelapse",
        "desert road driving",
    ]
    search_list = shuffled + [e for e in extras if e not in shuffled]

    for query in search_list:
        if len(clips) >= count:
            break
        for page in (1, 2, 3):
            if len(clips) >= count:
                break
            try:
                videos = search_videos(
                    query,
                    per_page=30,
                    page=page,
                    orientation=orientation,
                )
            except Exception as exc:
                print(f"Pexels search failed ({query} p{page}): {exc}")
                continue
            if not videos:
                break
            ranked_videos = sorted(
                videos,
                key=lambda v: _video_score(v, orientation=orientation),
                reverse=True,
            )
            top_band = ranked_videos[: min(18, len(ranked_videos))]
            for video in top_band:
                vid = str(video.get("id") or "")
                if not vid or vid in seen_ids:
                    continue
                link = _best_file(video, orientation=orientation)
                if not link:
                    continue
                seen_ids.add(vid)
                path = dest_dir / f"pexels_{vid}.mp4"
                with httpx.Client(timeout=120.0, follow_redirects=True) as client:
                    r = client.get(link)
                    r.raise_for_status()
                    path.write_bytes(r.content)
                clips.append(path)
                used_ids.append(vid)
                thumb = video.get("image")
                if not thumb:
                    pics = video.get("video_pictures") or []
                    if pics:
                        thumb = pics[0].get("picture")
                clip_meta.append(
                    {
                        "id": vid,
                        "provider": "pexels",
                        "kind": "video",
                        "thumb": thumb,
                        "query": query,
                        "label": (video.get("user") or {}).get("name") or f"Clip {vid}",
                    }
                )
                print(f"Pexels clip {vid} for query={query!r} page={page}")
                if len(clips) >= count:
                    break

    if not clips and exclude_ids:
        # Library exhausted for this user — soft reuse, still shuffled
        print(
            f"[PEXELS] no unused clips left (excluded={len(exclude_ids)}) — soft reuse"
        )
        return download_stock_clips(
            queries,
            dest_dir,
            count=count,
            exclude_ids=None,
            orientation=orientation,
        )

    if not clips:
        raise RuntimeError(f"No fresh Pexels clips for queries: {queries}")
    return clips, used_ids, clip_meta
