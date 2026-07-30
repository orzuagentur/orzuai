from __future__ import annotations

import shutil
from urllib.parse import parse_qs, urlparse
from pathlib import Path

from orzuvideo.config import settings
from orzuvideo.pipeline.fx_library import (
    EFFECT_FILTERS,
    FADE_BOOKENDS,
    MOTION_PRESETS,
    effect_chain,
    frame_filter,
    motion_by_id,
)
from orzuvideo.pipeline.media import (
    ffprobe_duration,
    has_audio_stream,
    make_silent_audio,
    run_ffmpeg,
)

# Back-compat aliases
MOTION_BY_ID = {m["id"]: m for m in MOTION_PRESETS}


def _external_media_url(value: object) -> str:
    raw = str(value or "").strip()
    if not raw:
        return ""
    if raw.startswith("http://") or raw.startswith("https://"):
        return raw
    if raw.startswith("/api/media/download"):
        parsed = urlparse(raw)
        nested = parse_qs(parsed.query).get("url") or []
        if nested:
            return nested[0]
    return ""


def _download_media_asset(url: str, dest: Path, *, min_bytes: int = 1000) -> bool:
    if not url:
        return False
    try:
        import httpx

        dest.parent.mkdir(parents=True, exist_ok=True)
        with httpx.Client(timeout=180.0, follow_redirects=True) as client:
            res = client.get(url)
            res.raise_for_status()
            dest.write_bytes(res.content)
        return dest.exists() and dest.stat().st_size > min_bytes
    except Exception as exc:
        print(f"[REEDIT] media asset download failed: {exc}")
        return False


def _render_media_scene(
    asset: dict,
    out: Path,
    *,
    duration: float,
    work_dir: Path,
    with_audio: bool,
) -> bool:
    kind = str(asset.get("kind") or "").strip().lower()
    url = _external_media_url(asset.get("download_url") or asset.get("preview_url"))
    if kind not in {"video", "photo"} or not url:
        return False
    suffix = ".jpg" if kind == "photo" else ".mp4"
    source = work_dir / f"asset_{abs(hash(url))}{suffix}"
    if not _download_media_asset(url, source):
        return False

    out.parent.mkdir(parents=True, exist_ok=True)
    w, h = settings.output_width, settings.output_height
    vf = (
        f"scale={w}:{h}:force_original_aspect_ratio=increase,"
        f"crop={w}:{h},fps={settings.fps},format=yuv420p,"
        f"settb=1/{settings.fps},setpts=PTS-STARTPTS"
    )
    if kind == "photo":
        args = ["-loop", "1", "-i", str(source)]
    else:
        args = ["-stream_loop", "-1", "-i", str(source)]
    args.extend(["-t", f"{duration:.3f}", "-vf", vf])
    if with_audio:
        args.extend([
            "-f",
            "lavfi",
            "-t",
            f"{duration:.3f}",
            "-i",
            "anullsrc=channel_layout=stereo:sample_rate=44100",
            "-map",
            "0:v:0",
            "-map",
            "1:a:0",
            "-c:a",
            "aac",
            "-b:a",
            "192k",
        ])
    else:
        args.append("-an")
    args.extend([
        "-c:v",
        "libx264",
        "-preset",
        "fast",
        "-crf",
        "18",
        "-pix_fmt",
        "yuv420p",
        "-movflags",
        "+faststart",
        str(out),
    ])
    try:
        run_ffmpeg(args)
        return out.exists() and out.stat().st_size > 1000
    except Exception as exc:
        print(f"[REEDIT] media scene render failed: {exc}")
        return False


def trim_clip(
    source: Path,
    out: Path,
    *,
    start: float,
    end: float | None,
) -> Path:
    out.parent.mkdir(parents=True, exist_ok=True)
    dur = ffprobe_duration(source)
    ss = max(0.0, min(float(start), max(0.0, dur - 0.5)))
    if end is not None and end > ss + 0.4:
        length = min(float(end) - ss, dur - ss)
    else:
        length = max(0.5, dur - ss)

    fps = settings.fps
    args = [
        "-ss",
        f"{ss:.3f}",
        "-i",
        str(source),
        "-t",
        f"{length:.3f}",
        "-vf",
        f"fps={fps},format=yuv420p,settb=1/{fps},setpts=PTS-STARTPTS",
        "-r",
        str(fps),
        "-vsync",
        "cfr",
        "-video_track_timescale",
        str(fps),
        "-c:v",
        "libx264",
        "-preset",
        "fast",
        "-crf",
        "18",
        "-pix_fmt",
        "yuv420p",
    ]
    if has_audio_stream(source):
        args.extend(["-c:a", "aac", "-b:a", "192k"])
    else:
        args.append("-an")
    args.extend(["-movflags", "+faststart", str(out)])
    run_ffmpeg(args)
    return out


def _atempo_chain(speed: float) -> str:
    """Build atempo chain (each filter must stay within 0.5–2.0)."""
    spd = max(0.25, min(4.0, float(speed)))
    parts: list[str] = []
    # Factor so that audio duration matches video setpts=PTS/spd
    remaining = spd
    while remaining > 2.0 + 1e-6:
        parts.append("atempo=2.0")
        remaining /= 2.0
    while remaining < 0.5 - 1e-6:
        parts.append("atempo=0.5")
        remaining /= 0.5
    parts.append(f"atempo={remaining:.4f}")
    return ",".join(parts)


def apply_speed(source: Path, out: Path, *, speed: float) -> Path:
    """Change playback speed for video (+ audio when present)."""
    out.parent.mkdir(parents=True, exist_ok=True)
    spd = max(0.25, min(4.0, float(speed or 1.0)))
    if abs(spd - 1.0) < 0.02:
        import shutil

        shutil.copy(source, out)
        return out

    fps = settings.fps
    has_a = has_audio_stream(source)
    if has_a:
        fc = (
            f"[0:v]setpts=PTS/{spd:.4f},fps={fps},format=yuv420p[v];"
            f"[0:a]{_atempo_chain(spd)}[a]"
        )
        args = [
            "-i",
            str(source),
            "-filter_complex",
            fc,
            "-map",
            "[v]",
            "-map",
            "[a]",
            "-c:v",
            "libx264",
            "-preset",
            "fast",
            "-crf",
            "18",
            "-c:a",
            "aac",
            "-b:a",
            "192k",
            "-movflags",
            "+faststart",
            str(out),
        ]
    else:
        args = [
            "-i",
            str(source),
            "-vf",
            f"setpts=PTS/{spd:.4f},fps={fps},format=yuv420p",
            "-an",
            "-c:v",
            "libx264",
            "-preset",
            "fast",
            "-crf",
            "18",
            "-movflags",
            "+faststart",
            str(out),
        ]
    run_ffmpeg(args)
    return out


def retime_scenes(
    source: Path,
    out: Path,
    *,
    durations: list[float],
    scene_indexes: list[int] | None = None,
    source_scene_count: int | None = None,
    replacements: list[dict | None] | None = None,
    work_dir: Path,
) -> Path:
    """Split the current render into scene blocks and retime each block."""
    targets: list[float] = []
    for value in durations:
        try:
            raw = float(value)
        except (TypeError, ValueError):
            continue
        if raw > 0:
            targets.append(max(0.5, min(120.0, raw)))
    if len(targets) < 2:
        shutil.copy(source, out)
        return out

    source_dur = ffprobe_duration(source)
    if source_dur < 1.0:
        shutil.copy(source, out)
        return out

    work_dir.mkdir(parents=True, exist_ok=True)
    targets = targets[:40]
    if scene_indexes:
        indexes = [int(index) for index in scene_indexes[: len(targets)]]
    else:
        indexes = list(range(len(targets)))
    total_source_scenes = max(
        1,
        int(source_scene_count or 0) or max(indexes, default=0) + 1 or len(targets),
    )
    source_step = source_dur / total_source_scenes
    pieces: list[Path] = []
    source_has_audio = has_audio_stream(source)
    for output_index, (source_index, target) in enumerate(zip(indexes, targets)):
        replacement = (
            replacements[output_index]
            if replacements and output_index < len(replacements)
            else None
        )
        if replacement:
            adjusted = work_dir / f"scene_{output_index:02d}_media.mp4"
            if _render_media_scene(
                replacement,
                adjusted,
                duration=target,
                work_dir=work_dir / "downloaded_media",
                with_audio=source_has_audio,
            ):
                pieces.append(adjusted)
                continue
        if source_index < 0 or source_index >= total_source_scenes:
            continue
        start = source_index * source_step
        end = (
            source_dur
            if source_index == total_source_scenes - 1
            else (source_index + 1) * source_step
        )
        raw = work_dir / f"scene_{output_index:02d}_raw.mp4"
        adjusted = work_dir / f"scene_{output_index:02d}_retime.mp4"
        trim_clip(source, raw, start=start, end=end)
        raw_dur = max(0.2, ffprobe_duration(raw))
        speed = max(0.25, min(4.0, raw_dur / target))
        apply_speed(raw, adjusted, speed=speed)
        pieces.append(adjusted)

    if not pieces:
        shutil.copy(source, out)
        return out

    concat_file = work_dir / "scene_concat.txt"
    concat_lines = []
    for piece in pieces:
        safe_path = piece.as_posix().replace("'", "'\\''")
        concat_lines.append(f"file '{safe_path}'")
    concat_file.write_text("\n".join(concat_lines), encoding="utf-8")

    args = [
        "-f",
        "concat",
        "-safe",
        "0",
        "-i",
        str(concat_file),
        "-c:v",
        "libx264",
        "-preset",
        "fast",
        "-crf",
        "18",
        "-pix_fmt",
        "yuv420p",
        "-r",
        str(settings.fps),
        "-vsync",
        "cfr",
        "-video_track_timescale",
        str(settings.fps),
    ]
    if pieces and has_audio_stream(pieces[0]):
        args.extend(["-c:a", "aac", "-b:a", "192k"])
    else:
        args.append("-an")
    args.extend(["-movflags", "+faststart", str(out)])
    run_ffmpeg(args)
    return out


def apply_look(
    source: Path,
    out: Path,
    *,
    effect: str,
    motion: str,
    intro_fade: str,
    outro_fade: str,
    flip_h: bool = False,
    flip_v: bool = False,
    zoom: float = 1.0,
    brightness: float = 0.0,
    contrast: float = 1.0,
    saturation: float = 1.0,
) -> Path:
    """Apply grade / optional Ken Burns / bookend fades / transform / manual EQ."""
    out.parent.mkdir(parents=True, exist_ok=True)
    dur = ffprobe_duration(source)
    fps = settings.fps
    w, h = settings.output_width, settings.output_height
    parts: list[str] = []

    if flip_h:
        parts.append("hflip")
    if flip_v:
        parts.append("vflip")

    z = max(1.0, min(2.0, float(zoom or 1.0)))
    motion_p = motion_by_id(motion) if motion and motion != "none" else None
    if motion_p:
        parts.append(
            f"scale={w}:{h}:force_original_aspect_ratio=increase,crop={w}:{h}"
        )
        parts.append(
            f"zoompan=z='{motion_p['zoom']}':x='{motion_p['x']}':y='{motion_p['y']}'"
            f":d=1:s={w}x{h}:fps={fps}"
        )
        if motion_p.get("eq"):
            parts.append(motion_p["eq"])
        ef = effect_chain(effect)
        if ef and effect not in ("none", ""):
            parts.append(ef)
    else:
        if z > 1.01:
            parts.append(
                f"scale={w}:{h}:force_original_aspect_ratio=increase,"
                f"crop=iw/{z:.3f}:ih/{z:.3f},scale={w}:{h}"
            )
        ef = effect_chain(effect)
        if ef:
            parts.append(ef)

    # Manual color grade (additive on top of look presets)
    b = max(-0.4, min(0.4, float(brightness or 0.0)))
    c = max(0.5, min(1.8, float(contrast or 1.0)))
    s = max(0.0, min(2.0, float(saturation or 1.0)))
    if abs(b) > 0.01 or abs(c - 1.0) > 0.01 or abs(s - 1.0) > 0.01:
        parts.append(f"eq=brightness={b:.3f}:contrast={c:.3f}:saturation={s:.3f}")

    fade_in = 0.35 if intro_fade and intro_fade != "none" else 0.0
    fade_out = 0.45 if outro_fade and outro_fade != "none" else 0.0
    if fade_in > 0:
        color = "white" if intro_fade == "fadewhite" else "black"
        parts.append(f"fade=t=in:st=0:d={fade_in:.2f}:color={color}")
    if fade_out > 0:
        st = max(0.1, dur - fade_out)
        color = "white" if outro_fade == "fadewhite" else "black"
        parts.append(f"fade=t=out:st={st:.3f}:d={fade_out:.2f}:color={color}")

    parts.append(f"fps={fps},format=yuv420p,settb=1/{fps},setpts=PTS-STARTPTS")

    vf = ",".join(parts)
    args = [
        "-i",
        str(source),
        "-vf",
        vf,
        "-c:v",
        "libx264",
        "-preset",
        "medium",
        "-crf",
        "19",
        "-pix_fmt",
        "yuv420p",
        "-r",
        str(fps),
        "-vsync",
        "cfr",
        "-video_track_timescale",
        str(fps),
    ]
    if has_audio_stream(source):
        args.extend(["-c:a", "aac", "-b:a", "192k"])
    else:
        args.append("-an")
    args.extend(["-movflags", "+faststart", str(out)])
    run_ffmpeg(args)
    return out


def burn_frame_overlay(source: Path, out: Path, frame_id: str) -> Path:
    """Draw a decorative frame ("рамка") on top of the finished picture.

    Returns `source` unchanged when the frame id is unknown / 'none'.
    """
    w, h = settings.output_width, settings.output_height
    vf = frame_filter(frame_id, w, h)
    if not vf:
        return source
    out.parent.mkdir(parents=True, exist_ok=True)
    args = [
        "-i",
        str(source),
        "-vf",
        f"{vf},format=yuv420p",
        "-c:v",
        "libx264",
        "-preset",
        "medium",
        "-crf",
        "19",
        "-pix_fmt",
        "yuv420p",
    ]
    if has_audio_stream(source):
        args.extend(["-c:a", "copy"])
    else:
        args.append("-an")
    args.extend(["-movflags", "+faststart", str(out)])
    run_ffmpeg(args)
    return out


def extract_or_silence(video: Path, out: Path) -> Path:
    out.parent.mkdir(parents=True, exist_ok=True)
    if not has_audio_stream(video):
        return make_silent_audio(out, ffprobe_duration(video))
    run_ffmpeg(
        [
            "-i",
            str(video),
            "-vn",
            "-c:a",
            "aac",
            "-b:a",
            "192k",
            str(out),
        ]
    )
    return out


def mux_av(video: Path, audio: Path, out: Path) -> Path:
    out.parent.mkdir(parents=True, exist_ok=True)
    run_ffmpeg(
        [
            "-i",
            str(video),
            "-i",
            str(audio),
            "-map",
            "0:v:0",
            "-map",
            "1:a:0",
            "-c:v",
            "copy",
            "-c:a",
            "aac",
            "-b:a",
            "192k",
            "-shortest",
            "-movflags",
            "+faststart",
            str(out),
        ]
    )
    return out


def _ffmpeg_text(value: object, limit: int = 16) -> str:
    return (
        str(value or "")
        .replace("\\", "\\\\")
        .replace(":", "\\:")
        .replace("'", r"\'")
        .replace("%", "%%")
    )[:limit]


def _ffmpeg_hex_color(value: object, fallback: str) -> str:
    raw = str(value or "").strip().lstrip("#")
    if len(raw) == 3:
        raw = "".join(ch * 2 for ch in raw)
    if len(raw) == 6 and all(ch in "0123456789abcdefABCDEF" for ch in raw):
        return f"0x{raw}"
    return fallback


def burn_element_overlay(
    source: Path,
    out: Path,
    element: dict,
    *,
    work_dir: Path,
) -> Path:
    """Burn a selected emoji/icon element into a re-edit render."""
    if not isinstance(element, dict):
        shutil.copy(source, out)
        return out

    size = max(0.55, min(1.9, float(element.get("size") or 1.0)))
    color = _ffmpeg_hex_color(element.get("color"), "0x8a00d4")
    bg = _ffmpeg_hex_color(element.get("background"), "0xffffff")
    asset_url = _external_media_url(element.get("assetUrl") or element.get("asset_url"))
    symbol = str(element.get("symbol") or "").strip()
    px = int(116 * size)
    x_expr = "W-w-W*0.10"
    y_expr = "H*0.14"

    if asset_url:
        suffix = ".svg" if ".svg" in asset_url.lower().split("?")[0] else ".png"
        asset = work_dir / f"element_{abs(hash(asset_url))}{suffix}"
        if _download_media_asset(asset_url, asset, min_bytes=20):
            run_ffmpeg(
                [
                    "-i",
                    str(source),
                    "-i",
                    str(asset),
                    "-filter_complex",
                    (
                        f"[1:v]scale={px}:{px}:force_original_aspect_ratio=decrease[el];"
                        f"[0:v][el]overlay=x={x_expr}:y={y_expr}:format=auto[v]"
                    ),
                    "-map",
                    "[v]",
                    "-map",
                    "0:a?",
                    "-c:v",
                    "libx264",
                    "-preset",
                    "fast",
                    "-crf",
                    "19",
                    "-pix_fmt",
                    "yuv420p",
                    "-c:a",
                    "copy",
                    "-movflags",
                    "+faststart",
                    str(out),
                ]
            )
            return out

    if not symbol:
        shutil.copy(source, out)
        return out

    safe = _ffmpeg_text(symbol)
    fontsize = int(66 * size)
    vf = (
        f"drawtext=text='{safe}':fontsize={fontsize}:fontcolor={color}:"
        f"x=w-tw-w*0.10:y=h*0.14:box=1:boxcolor={bg}@0.88:"
        "boxborderw=18:borderw=2:bordercolor=white@0.70"
    )
    run_ffmpeg(
        [
            "-i",
            str(source),
            "-vf",
            vf,
            "-c:v",
            "libx264",
            "-preset",
            "fast",
            "-crf",
            "19",
            "-pix_fmt",
            "yuv420p",
            "-c:a",
            "copy",
            "-movflags",
            "+faststart",
            str(out),
        ]
    )
    return out


# Keep for API validation / docs
KNOWN_EFFECTS = set(EFFECT_FILTERS.keys())
KNOWN_MOTIONS = {"none", *[m["id"] for m in MOTION_PRESETS]}
KNOWN_FADES = set(FADE_BOOKENDS)
