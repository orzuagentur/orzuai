from __future__ import annotations

from pathlib import Path
from typing import Any

from orzuvideo.config import settings
from orzuvideo.pipeline.media import (
    WordTiming,
    ffprobe_duration,
    run_ffmpeg,
    write_ass_subtitles,
)
from orzuvideo.pipeline.montage import (
    MOTION_PRESETS,
    concat_with_pro_transitions,
    normalize_clip_pro,
    pick_motion,
)


def _escape_ass_path(path: Path) -> str:
    p = path.resolve().as_posix()
    return p.replace(":", "\\:").replace("'", r"\'")


def mix_audio(
    voice: Path,
    music: Path | None,
    out: Path,
    *,
    voice_duration: float,
    music_volume_hook: float = 0.88,
    music_volume_body: float = 0.58,
    voice_volume: float = 1.05,
) -> Path:
    if music is None or not music.exists():
        run_ffmpeg(
            [
                "-i",
                str(voice),
                "-af",
                "loudnorm=I=-14:TP=-1.5:LRA=11",
                "-c:a",
                "aac",
                "-b:a",
                "192k",
                str(out),
            ]
        )
        return out

    fade_out_at = max(0.5, voice_duration - 1.4)
    # Stronger motivational bed — louder under hook + body
    hook_v = max(0.3, min(1.2, float(music_volume_hook)))
    body_v = max(0.2, min(1.0, float(music_volume_body)))
    vox_v = max(0.7, min(1.4, float(voice_volume)))
    filter_complex = (
        f"[1:a]aformat=sample_fmts=fltp:sample_rates=44100:channel_layouts=stereo,"
        f"loudnorm=I=-15:TP=-1.5:LRA=11,"
        f"volume='if(lt(t,2.8),{hook_v:.2f},{body_v:.2f})':eval=frame,"
        f"afade=t=in:st=0:d=0.15,"
        f"afade=t=out:st={fade_out_at:.3f}:d=1.3[bg];"
        f"[0:a]aformat=sample_fmts=fltp:sample_rates=44100:channel_layouts=stereo,"
        f"loudnorm=I=-14:TP=-1.5:LRA=11,volume={vox_v:.2f}[vox];"
        f"[vox][bg]amix=inputs=2:duration=first:dropout_transition=2:normalize=0,"
        f"loudnorm=I=-12:TP=-1.2:LRA=11[aout]"
    )
    run_ffmpeg(
        [
            "-i",
            str(voice),
            "-stream_loop",
            "-1",
            "-i",
            str(music),
            "-filter_complex",
            filter_complex,
            "-map",
            "[aout]",
            "-t",
            f"{voice_duration:.3f}",
            "-c:a",
            "aac",
            "-b:a",
            "192k",
            str(out),
        ]
    )
    return out


def burn_subtitles_and_mux(
    video: Path,
    audio: Path,
    words: list[WordTiming],
    out: Path,
    *,
    emphasis: list[str] | None = None,
    hook_text: str | None = None,
    work_dir: Path,
    size: tuple[int, int] | None = None,
    style_id: str = "classic",
    visual_effect: str | None = None,
) -> Path:
    from orzuvideo.pipeline.fx_library import effect_chain

    ass = write_ass_subtitles(
        words,
        work_dir / "subs.ass",
        emphasis=emphasis,
        hook_text=hook_text,
        play_res=size,
        style_id=style_id or "classic",
    )
    ass_esc = _escape_ass_path(ass)

    grade = effect_chain(visual_effect) if visual_effect else ""
    grade_part = f",{grade}" if grade else ",vignette=PI/5.5,eq=contrast=1.05:saturation=1.06:gamma=0.98"
    vf = f"ass='{ass_esc}'{grade_part}"

    duration = ffprobe_duration(audio)
    run_ffmpeg(
        [
            "-i",
            str(video),
            "-i",
            str(audio),
            "-t",
            f"{duration:.3f}",
            "-vf",
            vf,
            "-c:v",
            "libx264",
            "-preset",
            "medium",
            "-crf",
            "20",
            "-pix_fmt",
            "yuv420p",
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


def _overlay_xy(position: str) -> tuple[str, str]:
    pos = (position or "top_right").strip().lower()
    top_y = "main_h*0.08"
    center_y = "main_h*0.42-overlay_h/2"
    lower_y = "main_h*0.58-overlay_h/2"
    left_x = "main_w*0.07"
    center_x = "(main_w-overlay_w)/2"
    right_x = "main_w-overlay_w-main_w*0.07"
    if pos == "top_left":
        return left_x, top_y
    if pos == "top_center":
        return center_x, top_y
    if pos == "center_left":
        return left_x, center_y
    if pos == "center":
        return center_x, center_y
    if pos == "center_right":
        return right_x, center_y
    if pos == "bottom_left":
        return left_x, lower_y
    if pos == "bottom_right":
        return right_x, lower_y
    return right_x, top_y


def apply_visual_overlays(
    video: Path,
    overlays: list[dict[str, Any]],
    out: Path,
    *,
    duration: float,
    size: tuple[int, int],
) -> Path:
    usable = [
        ov
        for ov in overlays
        if isinstance(ov.get("path"), Path) and ov["path"].exists()
    ][:12]
    if not usable:
        return video

    w, h = size
    inputs = ["-i", str(video)]
    for ov in usable:
        inputs.extend(["-loop", "1", "-t", f"{duration:.3f}", "-i", str(ov["path"])])

    filters = ["[0:v]setpts=PTS-STARTPTS,format=rgba[base0]"]
    prev = "[base0]"
    for idx, ov in enumerate(usable):
        start = max(0.0, float(ov.get("start") or 0.0))
        end = min(duration, start + max(0.5, float(ov.get("duration") or 2.4)))
        if end <= start + 0.2:
            continue
        fade_out = max(start + 0.25, end - 0.22)
        size_pct = max(0.10, min(0.32, float(ov.get("size_pct") or 0.16)))
        width_px = max(96, min(int(w * size_pct), int(min(w, h) * 0.38)))
        x, y = _overlay_xy(str(ov.get("position") or "top_right"))
        # Subtle scale pop on enter (professional kinetic feel on solid plates).
        filters.append(
            f"[{idx + 1}:v]setpts=PTS-STARTPTS,"
            f"scale={width_px}:-1:flags=lanczos,format=rgba,"
            f"fade=t=in:st={start:.3f}:d=0.22:alpha=1,"
            f"fade=t=out:st={fade_out:.3f}:d=0.22:alpha=1[ov{idx}]"
        )
        filters.append(
            f"{prev}[ov{idx}]overlay=x={x}:y={y}:"
            f"enable='between(t,{start:.3f},{end:.3f})'[base{idx + 1}]"
        )
        prev = f"[base{idx + 1}]"
    filters.append(f"{prev}format=yuv420p[vout]")

    run_ffmpeg(
        [
            *inputs,
            "-filter_complex",
            ";".join(filters),
            "-map",
            "[vout]",
            "-t",
            f"{duration:.3f}",
            "-an",
            "-c:v",
            "libx264",
            "-preset",
            "fast",
            "-crf",
            "19",
            "-pix_fmt",
            "yuv420p",
            str(out),
        ]
    )
    return out


def build_short(
    *,
    clips: list[Path],
    voice_path: Path,
    music_path: Path | None,
    words: list[WordTiming],
    work_dir: Path,
    output_path: Path,
    emphasis: list[str] | None = None,
    hook_text: str | None = None,
    music_volume_hook: float = 0.88,
    music_volume_body: float = 0.58,
    voice_volume: float = 1.05,
    size: tuple[int, int] | None = None,
    subtitle_style: str = "classic",
    visual_effect: str | None = None,
    punch_first_clip: bool = True,
    motions_enabled: bool = True,
    allowed_motions: list[str] | None = None,
    transitions_enabled: bool = True,
    allowed_transitions: list[str] | None = None,
    visual_overlays: list[dict[str, Any]] | None = None,
) -> Path:
    """Pro Shorts assembly: punch open, motion library, cinematic transitions."""
    work_dir.mkdir(parents=True, exist_ok=True)
    voice_dur = ffprobe_duration(voice_path)
    frame = size or (settings.output_width, settings.output_height)

    n = max(1, len(clips))
    overlap = 0.55 if n > 1 else 0.0
    hook_dur = min(3.0, max(2.4, voice_dur * 0.12))
    rest_budget = max(0.5, voice_dur - hook_dur + overlap * max(0, n - 1))
    rest_n = max(1, n - 1)
    per_rest = rest_budget / rest_n

    used_motions: set[str] = set()
    normalized: list[Path] = []
    for i, clip in enumerate(clips):
        dst = work_dir / f"norm_{i}.mp4"
        dur = hook_dur if i == 0 else per_rest
        punch = bool(punch_first_clip and i == 0)
        if motions_enabled:
            motion = pick_motion(punch=punch, allowed_ids=allowed_motions)
            if not punch:
                tries = 0
                while motion["id"] in used_motions and tries < 6:
                    motion = pick_motion(punch=False, allowed_ids=allowed_motions)
                    tries += 1
                used_motions.add(motion["id"])
        else:
            # Motions off: hold a gentle body motion (no punch)
            body = [m for m in MOTION_PRESETS if m["id"] != "punch_in"]
            motion = body[0] if body else pick_motion(punch=False)
        print(f"Clip {i} motion: {motion['id']} ({dur:.2f}s)")
        normalize_clip_pro(
            clip,
            dst,
            dur,
            punch=punch,
            motion=motion,
            size=frame,
            effect=visual_effect if visual_effect and visual_effect != "none" else None,
        )
        normalized.append(dst)

    timeline = work_dir / "timeline.mp4"
    concat_with_pro_transitions(
        normalized,
        timeline,
        overlap=overlap if n > 1 else 0.0,
        size=frame,
        allowed_transitions=allowed_transitions,
        transitions_enabled=transitions_enabled,
    )

    tl_dur = ffprobe_duration(timeline)
    if tl_dur < voice_dur - 0.05:
        padded = work_dir / "timeline_pad.mp4"
        run_ffmpeg(
            [
                "-stream_loop",
                "-1",
                "-i",
                str(timeline),
                "-t",
                f"{voice_dur:.3f}",
                "-c",
                "copy",
                str(padded),
            ]
        )
        timeline = padded

    if visual_overlays:
        overlaid = work_dir / "timeline_overlays.mp4"
        try:
            timeline = apply_visual_overlays(
                timeline,
                visual_overlays,
                overlaid,
                duration=voice_dur,
                size=frame,
            )
        except Exception as exc:
            print(f"[OVERLAY] visual overlays skipped: {exc}")

    mixed = work_dir / "mixed.m4a"
    mix_audio(
        voice_path,
        music_path,
        mixed,
        voice_duration=voice_dur,
        music_volume_hook=music_volume_hook,
        music_volume_body=music_volume_body,
        voice_volume=voice_volume,
    )

    return burn_subtitles_and_mux(
        timeline,
        mixed,
        words,
        output_path,
        emphasis=emphasis,
        hook_text=hook_text,
        work_dir=work_dir,
        size=frame,
        style_id=subtitle_style or "classic",
        visual_effect=None,  # already graded on clips; avoid double grade
    )
