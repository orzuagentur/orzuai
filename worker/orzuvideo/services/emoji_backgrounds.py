"""Solid / soft-gradient backgrounds for emoji-video mode (no stock footage)."""

from __future__ import annotations

import colorsys
import re
from pathlib import Path

from orzuvideo.pipeline.media import run_ffmpeg

# Professional dark/mid palettes — no busy imagery, readable under emoji overlays.
DEFAULT_EMOJI_BG_HEX = [
    "0F172A",
    "1E293B",
    "312E81",
    "0F766E",
    "7C2D12",
    "1C1917",
    "164E63",
    "3B0764",
    "14532D",
    "4C0519",
    "1E1B4B",
    "422006",
]


def sanitize_hex_color(value: object, fallback: str = "0F172A") -> str:
    text = str(value or "").strip().lstrip("#")
    if re.fullmatch(r"[0-9A-Fa-f]{6}", text):
        return text.upper()
    if re.fullmatch(r"[0-9A-Fa-f]{3}", text):
        return "".join(ch * 2 for ch in text).upper()
    return fallback.upper()


def sanitize_background_colors(raw: object, *, count: int = 6) -> list[str]:
    items = raw if isinstance(raw, list) else []
    out: list[str] = []
    seen: set[str] = set()
    for item in items:
        hex_c = sanitize_hex_color(item, "")
        if len(hex_c) != 6 or hex_c in seen:
            continue
        seen.add(hex_c)
        out.append(hex_c)
        if len(out) >= max(3, count):
            break
    if len(out) < 3:
        for hex_c in DEFAULT_EMOJI_BG_HEX:
            if hex_c not in seen:
                out.append(hex_c)
                seen.add(hex_c)
            if len(out) >= max(4, count):
                break
    return out[: max(4, count)]


def _shift_hex(hex_c: str, *, lightness_delta: float = 0.08) -> str:
    """Slightly lighten/darken for a soft two-stop gradient."""
    r = int(hex_c[0:2], 16) / 255.0
    g = int(hex_c[2:4], 16) / 255.0
    b = int(hex_c[4:6], 16) / 255.0
    h, light, s = colorsys.rgb_to_hls(r, g, b)
    light = max(0.05, min(0.92, light + lightness_delta))
    rr, gg, bb = colorsys.hls_to_rgb(h, light, s)
    return f"{int(rr * 255):02X}{int(gg * 255):02X}{int(bb * 255):02X}"


def _plate_filter(*, width: int, height: int, hex_c: str) -> str:
    pad = max(22, int(min(width, height) * 0.03))
    inner = max(42, int(min(width, height) * 0.055))
    top = max(70, int(height * 0.1))
    low_y = int(height * 0.72)
    accent = _shift_hex(hex_c, lightness_delta=0.18)
    return (
        "format=rgba,"
        "vignette=PI/4.6,"
        "noise=alls=3:allf=t,"
        f"drawbox=x=0:y=0:w={width}:h={top}:color=black@0.12:t=fill,"
        f"drawbox=x=0:y={low_y}:w={width}:h={height - low_y}:color=black@0.16:t=fill,"
        f"drawbox=x={pad}:y={pad}:w={width - pad * 2}:h={height - pad * 2}:"
        f"color=0x{accent}@0.16:t=4,"
        f"drawbox=x={inner}:y={inner}:w={width - inner * 2}:h={height - inner * 2}:"
        "color=white@0.07:t=2,"
        "format=yuv420p"
    )


def _make_solid_clip(
    *,
    hex_c: str,
    out: Path,
    size: tuple[int, int],
    duration: float,
    use_gradient: bool,
) -> Path:
    w, h = size
    dur = max(1.5, float(duration))
    out.parent.mkdir(parents=True, exist_ok=True)
    if use_gradient:
        c1 = hex_c
        c0 = _shift_hex(hex_c, lightness_delta=-0.06)
        # Soft diagonal wash — still “one tone”, no objects/people.
        lavfi = (
            f"gradients=s={w}x{h}:c0=0x{c0}:c1=0x{c1}:"
            f"x0=0:y0=0:x1={w}:y1={h}:duration={dur:.3f}:speed=0.02"
        )
        try:
            run_ffmpeg(
                [
                    "-f",
                    "lavfi",
                    "-i",
                    lavfi,
                    "-t",
                    f"{dur:.3f}",
                    "-vf",
                    _plate_filter(width=w, height=h, hex_c=hex_c),
                    "-c:v",
                    "libx264",
                    "-preset",
                    "veryfast",
                    "-crf",
                    "20",
                    "-pix_fmt",
                    "yuv420p",
                    str(out),
                ]
            )
            if out.exists() and out.stat().st_size > 1000:
                return out
        except Exception as exc:
            print(f"[EMOJI_BG] gradient fallback for #{hex_c}: {exc}")

    run_ffmpeg(
        [
            "-f",
            "lavfi",
            "-i",
            f"color=c=0x{hex_c}:s={w}x{h}:d={dur:.3f}",
            "-t",
            f"{dur:.3f}",
            "-vf",
            _plate_filter(width=w, height=h, hex_c=hex_c),
            "-c:v",
            "libx264",
            "-preset",
            "veryfast",
            "-crf",
            "20",
            "-pix_fmt",
            "yuv420p",
            str(out),
        ]
    )
    return out


def generate_emoji_background_clips(
    colors: list[str],
    out_dir: Path,
    *,
    count: int,
    size: tuple[int, int],
    duration_each: float = 4.0,
) -> list[Path]:
    """Build N solid/soft-gradient clips used as montage plates for emoji videos."""
    palette = sanitize_background_colors(colors, count=max(count, 4))
    out_dir.mkdir(parents=True, exist_ok=True)
    clips: list[Path] = []
    n = max(3, int(count))
    for i in range(n):
        hex_c = palette[i % len(palette)]
        path = out_dir / f"emoji_bg_{i:02d}_{hex_c}.mp4"
        use_grad = i % 2 == 1
        try:
            _make_solid_clip(
                hex_c=hex_c,
                out=path,
                size=size,
                duration=duration_each,
                use_gradient=use_grad,
            )
            if path.exists() and path.stat().st_size > 800:
                clips.append(path)
        except Exception as exc:
            print(f"[EMOJI_BG] clip {i} failed: {exc}")
    if not clips:
        # Last-resort single plate
        fallback = out_dir / "emoji_bg_fallback.mp4"
        _make_solid_clip(
            hex_c=DEFAULT_EMOJI_BG_HEX[0],
            out=fallback,
            size=size,
            duration=max(3.0, duration_each),
            use_gradient=False,
        )
        clips = [fallback]
    print(f"[EMOJI_BG] generated {len(clips)} solid/gradient plate(s)")
    return clips
