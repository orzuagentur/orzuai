from __future__ import annotations

import re
from pathlib import Path
from typing import Any
from urllib.parse import quote

import httpx
from supabase import Client

from orzuvideo.pipeline.media import run_ffmpeg
from orzuvideo.services import db


_POSITIONS = {
    "top_left",
    "top_center",
    "top_right",
    "center_left",
    "center",
    "center_right",
    "bottom_left",
    "bottom_right",
}

_OPENMOJI_SYNONYMS: dict[str, list[str]] = {
    "idea": ["light bulb", "bulb"],
    "money": ["money bag", "dollar", "coin"],
    "profit": ["chart increasing", "money bag"],
    "growth": ["chart increasing", "rocket"],
    "business": ["briefcase", "chart increasing"],
    "success": ["trophy", "sparkles", "star"],
    "warning": ["warning", "alert"],
    "danger": ["warning", "fire"],
    "love": ["red heart", "heart"],
    "happy": ["smiling face", "grinning face"],
    "sad": ["crying face", "sad face"],
    "fast": ["rocket", "zap"],
    "energy": ["fire", "zap"],
    "tech": ["laptop", "robot"],
    "ai": ["robot", "brain"],
    "video": ["movie camera", "camera"],
    "location": ["round pushpin", "map"],
}

_ICONIFY_FALLBACKS: dict[str, str] = {
    "alert": "lucide:triangle-alert",
    "analytics": "lucide:chart-line",
    "calendar": "lucide:calendar",
    "camera": "lucide:camera",
    "chart": "lucide:chart-line",
    "check": "lucide:circle-check",
    "email": "lucide:mail",
    "globe": "lucide:globe",
    "heart": "lucide:heart",
    "idea": "lucide:lightbulb",
    "location": "lucide:map-pin",
    "lock": "lucide:lock",
    "money": "lucide:badge-dollar-sign",
    "phone": "lucide:phone",
    "play": "lucide:play",
    "rocket": "lucide:rocket",
    "shield": "lucide:shield-check",
    "shopping": "lucide:shopping-cart",
    "star": "lucide:star",
    "trend": "lucide:trending-up",
    "video": "lucide:video",
    "zap": "lucide:zap",
}


def _clean_text(value: Any, fallback: str = "") -> str:
    text = str(value or fallback).strip()
    return re.sub(r"\s+", " ", text)[:90]


def _as_float(value: Any, fallback: float) -> float:
    try:
        return float(value)
    except (TypeError, ValueError):
        return fallback


def _sanitize_color(raw: Any) -> str | None:
    text = str(raw or "").strip().lstrip("#").upper()
    if len(text) == 3 and all(c in "0123456789ABCDEF" for c in text):
        text = "".join(ch * 2 for ch in text)
    if len(text) == 6 and all(c in "0123456789ABCDEF" for c in text):
        return text
    return None


def _query_terms(query: str) -> list[str]:
    q = _clean_text(query).lower()
    words = [w for w in re.split(r"[^a-z0-9]+", q) if len(w) > 2]
    terms: list[str] = []
    for item in [q, *words]:
        if item and item not in terms:
            terms.append(item)
        for syn in _OPENMOJI_SYNONYMS.get(item, []):
            if syn not in terms:
                terms.append(syn)
    for fallback in ("sparkles", "star", "light bulb"):
        if fallback not in terms:
            terms.append(fallback)
    return terms[:8]


def _search_openmoji(sb: Client, query: str, used: set[str]) -> dict[str, Any] | None:
    select_cols = "hex,filename,storage_path,public_url,name,tags,group_name,subgroup"
    for term in _query_terms(query):
        pattern = f"%{term.replace('%', '').replace('_', '')}%"
        for column in ("name", "tags", "filename", "subgroup", "group_name"):
            try:
                result = (
                    sb.table("openmoji")
                    .select(select_cols)
                    .ilike(column, pattern)
                    .limit(10)
                    .execute()
                )
            except Exception as exc:
                print(f"[OVERLAY] openmoji search skipped: {exc}")
                return None
            rows = [
                r
                for r in (result.data or [])
                if str(r.get("hex") or r.get("filename") or "") not in used
            ]
            if rows:
                return rows[0]
    return None


def _iconify_url_for_query(query: str, color_hex: str | None) -> tuple[str, str] | None:
    hay = _clean_text(query).lower().replace("-", " ")
    color = color_hex or "FFFFFF"
    for token, icon_id in _ICONIFY_FALLBACKS.items():
        if token in hay:
            prefix, name = icon_id.split(":", 1)
            url = (
                f"https://api.iconify.design/{prefix}/{name}.svg"
                f"?height=256&width=256&color=%23{quote(color)}"
            )
            return icon_id, url
    return None


def _download(url: str, dest: Path) -> bool:
    try:
        with httpx.Client(timeout=60.0, follow_redirects=True) as client:
            res = client.get(url)
            res.raise_for_status()
            data = res.content
        if len(data) < 80:
            return False
        dest.parent.mkdir(parents=True, exist_ok=True)
        dest.write_bytes(data)
        return True
    except Exception as exc:
        print(f"[OVERLAY] download failed {url}: {exc}")
        return False


def _rasterize(src: Path, dest: Path, *, tint_hex: str | None = None) -> bool:
    """SVG/PNG → square RGBA; optional color tint for monochrome icons."""
    try:
        vf = (
            "scale=512:512:force_original_aspect_ratio=decrease,"
            "pad=512:512:(ow-iw)/2:(oh-ih)/2:color=0x00000000,"
            "format=rgba"
        )
        # Soft tint: multiply RGB by target color while keeping alpha.
        if tint_hex and len(tint_hex) == 6:
            r = int(tint_hex[0:2], 16) / 255.0
            g = int(tint_hex[2:4], 16) / 255.0
            b = int(tint_hex[4:6], 16) / 255.0
            vf = (
                f"{vf},"
                f"colorchannelmixer="
                f"rr={r:.4f}:rg=0:rb=0:"
                f"gr=0:gg={g:.4f}:gb=0:"
                f"br=0:bg=0:bb={b:.4f}:aa=1"
            )
        run_ffmpeg(
            [
                "-i",
                str(src),
                "-vf",
                vf,
                "-frames:v",
                "1",
                str(dest),
            ]
        )
        return dest.exists() and dest.stat().st_size > 500
    except Exception as exc:
        print(f"[OVERLAY] rasterize skipped {src.name}: {exc}")
        return False


def prepare_visual_overlays(
    sb: Client,
    *,
    user_id: str,
    job_id: str,
    overlays: Any,
    work_dir: Path,
    video_duration: float,
) -> list[dict[str, Any]]:
    """Resolve AI overlay plan to local PNG assets for FFmpeg overlay."""
    if not isinstance(overlays, list) or not overlays:
        return []

    work_dir.mkdir(parents=True, exist_ok=True)
    out: list[dict[str, Any]] = []
    used: set[str] = set()
    total = max(1.0, float(video_duration or 1.0))

    for idx, raw in enumerate(overlays[:12]):
        if not isinstance(raw, dict):
            continue
        query = _clean_text(raw.get("query") or raw.get("label"))
        if not query:
            continue

        kind = str(raw.get("kind") or "emoji").strip().lower()
        if kind not in ("emoji", "icon"):
            kind = "emoji"

        color_hex = _sanitize_color(raw.get("color"))
        provider = "openmoji"
        asset_id = ""
        source_url = ""
        source = work_dir / f"overlay_{idx}.svg"
        tint_for_raster: str | None = None

        row = _search_openmoji(sb, query, used) if kind == "emoji" else None
        if row:
            asset_id = str(row.get("hex") or row.get("filename") or query)
            source_url = str(row.get("public_url") or "").strip()
            used.add(asset_id)
            # Keep OpenMoji native colors; tint only if AI asked for a wash.
            tint_for_raster = None
        else:
            hit = _iconify_url_for_query(query, color_hex or "FFFFFF")
            if hit:
                asset_id, source_url = hit
                provider = "iconify"
                kind = "icon"
            elif kind == "emoji":
                # Last resort: still try iconify for unknown emoji queries
                hit = _iconify_url_for_query(query, color_hex or "FFFFFF")
                if hit:
                    asset_id, source_url = hit
                    provider = "iconify"
                    kind = "icon"

        if not source_url:
            print(f"[OVERLAY] no asset for query={query!r}")
            continue
        if not _download(source_url, source):
            continue

        png = work_dir / f"overlay_{idx}.png"
        # Iconify SVGs are already colored via URL; skip double-tint.
        apply_tint = tint_for_raster if provider == "openmoji" else None
        if not _rasterize(source, png, tint_hex=apply_tint):
            continue

        start_pct = max(0.02, min(0.9, _as_float(raw.get("start_pct"), 0.06 + idx * 0.07)))
        start = min(max(0.0, total * start_pct), max(0.0, total - 0.6))
        dur = max(1.4, min(5.0, _as_float(raw.get("duration"), 2.6)))
        dur = min(dur, max(0.6, total - start))
        position = str(raw.get("position") or "top_right").strip().lower()
        if position not in _POSITIONS:
            position = "top_right"
        size_pct = max(0.10, min(0.30, _as_float(raw.get("size_pct"), 0.16)))

        try:
            db.record_media_usage(
                sb,
                user_id=user_id,
                provider=provider,
                asset_id=asset_id,
                job_id=job_id,
                title=_clean_text(raw.get("label") or query),
                meta={
                    "query": query,
                    "source_url": source_url,
                    "color": color_hex,
                    "kind": kind,
                },
            )
        except Exception:
            pass

        out.append(
            {
                "path": png,
                "kind": kind,
                "query": query,
                "label": _clean_text(raw.get("label") or query),
                "provider": provider,
                "asset_id": asset_id,
                "source_url": source_url,
                "start": round(start, 3),
                "duration": round(dur, 3),
                "position": position,
                "size_pct": round(size_pct, 3),
                "color": f"#{color_hex}" if color_hex else None,
            }
        )

    print(f"[OVERLAY] prepared {len(out)} visual overlay(s)")
    return out
