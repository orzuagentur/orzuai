from __future__ import annotations

from pathlib import Path

from orzuvideo.config import settings
from orzuvideo.pipeline.fx_library import (
    EFFECT_FILTERS,
    FADE_BOOKENDS,
    MOTION_PRESETS,
    effect_chain,
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


# Keep for API validation / docs
KNOWN_EFFECTS = set(EFFECT_FILTERS.keys())
KNOWN_MOTIONS = {"none", *[m["id"] for m in MOTION_PRESETS]}
KNOWN_FADES = set(FADE_BOOKENDS)
