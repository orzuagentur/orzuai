"""CapCut-style FFmpeg look library: transitions, grades, motion, text, stills."""

from __future__ import annotations

# Official xfade transition names (FFmpeg) — 36+ CapCut-like wipes/dissolves
TRANSITION_LIBRARY: list[str] = [
    "fade",
    "fadeblack",
    "fadewhite",
    "fadegrays",
    "dissolve",
    "pixelize",
    "distance",
    "radial",
    "hblur",
    "wipeleft",
    "wiperight",
    "wipeup",
    "wipedown",
    "wipetl",
    "wipetr",
    "wipebl",
    "wipebr",
    "slideleft",
    "slideright",
    "slideup",
    "slidedown",
    "smoothleft",
    "smoothright",
    "smoothup",
    "smoothdown",
    "circlecrop",
    "rectcrop",
    "circleopen",
    "circleclose",
    "vertopen",
    "vertclose",
    "horzopen",
    "horzclose",
    "diagtl",
    "diagtr",
    "diagbl",
    "diagbr",
    "hlslice",
    "hrslice",
    "vuslice",
    "vdslice",
    "squeezeh",
    "squeezev",
    "zoomin",
]

# Color / film grades (25+)
EFFECT_FILTERS: dict[str, str] = {
    "none": "",
    "cinematic": "eq=contrast=1.08:saturation=1.12:brightness=0.02,vignette=PI/5.5",
    "vivid": "eq=contrast=1.14:saturation=1.28:brightness=0.03",
    "soft": "eq=contrast=0.96:saturation=0.92:brightness=0.04:gamma=1.05",
    "noir": "hue=s=0,eq=contrast=1.2:brightness=-0.02",
    "punch": "eq=contrast=1.18:saturation=1.22:brightness=0.05",
    "vignette": "vignette=PI/4.5,eq=contrast=1.06:saturation=1.08",
    "warm": "eq=contrast=1.06:saturation=1.1:gamma_r=1.05:gamma_b=0.95,colorbalance=rs=0.06:gs=0.02:bs=-0.04",
    "cool": "eq=contrast=1.05:saturation=1.05:gamma_b=1.08:gamma_r=0.95,colorbalance=rs=-0.04:bs=0.06",
    "teal_orange": "colorbalance=rs=0.08:gs=-0.02:bs=-0.06:rm=0.04:bm=-0.05,eq=contrast=1.1:saturation=1.15",
    "vintage": "eq=contrast=0.95:saturation=0.75:brightness=0.03:gamma=1.08,vignette=PI/4,noise=alls=8:allf=t",
    "bleach": "eq=contrast=1.25:saturation=0.55:brightness=0.08",
    "neon": "eq=contrast=1.2:saturation=1.45:brightness=0.04,unsharp=5:5:1.0:5:5:0.0",
    "pastel": "eq=contrast=0.92:saturation=0.85:brightness=0.06:gamma=1.1",
    "drama": "eq=contrast=1.22:saturation=0.95:brightness=-0.03,vignette=PI/4",
    "glow": "gblur=sigma=1.2,eq=contrast=1.05:saturation=1.12:brightness=0.04",
    "sharp": "unsharp=5:5:1.2:5:5:0.0,eq=contrast=1.08:saturation=1.05",
    "dream": "gblur=sigma=2.5,eq=saturation=1.15:brightness=0.05:gamma=1.08",
    "chrome": "eq=contrast=1.15:saturation=0.4:brightness=0.02",
    "sunset": "eq=gamma_r=1.12:gamma_g=1.02:gamma_b=0.88:saturation=1.18:contrast=1.06",
    "arctic": "eq=gamma_b=1.15:gamma_r=0.9:saturation=0.85:contrast=1.08:brightness=0.03",
    "ember": "eq=gamma_r=1.18:gamma_g=0.95:gamma_b=0.85:saturation=1.2:contrast=1.1",
    "matrix": "colorchannelmixer=rr=0.1:rg=0.7:rb=0.1:gr=0.05:gg=0.85:gb=0.1:br=0:bg=0.4:bb=0.2,eq=contrast=1.15",
    "retro_tv": "noise=alls=12:allf=t,eq=contrast=1.1:saturation=1.2,vignette=PI/3.5",
    "film_grain": "noise=alls=10:allf=t+u,eq=contrast=1.05:saturation=1.05",
    "high_key": "eq=brightness=0.12:contrast=0.92:saturation=1.05:gamma=1.12",
    "low_key": "eq=brightness=-0.08:contrast=1.2:saturation=0.9,vignette=PI/3.8",
    "sepia": "colorchannelmixer=.393:.769:.189:0:.349:.686:.168:0:.272:.534:.131,eq=contrast=1.05",
    "duo_pink": "colorchannelmixer=rr=0.9:rg=0.2:rb=0.3:gr=0.2:gg=0.5:gb=0.4:br=0.5:bg=0.2:bb=0.7,eq=contrast=1.08",
    "clarity": "unsharp=7:7:1.5:7:7:0.0,eq=contrast=1.1:saturation=1.08",
    "kodak": "eq=contrast=1.08:saturation=1.15:gamma_r=1.06:gamma_b=0.94,colorbalance=rs=0.05:bs=-0.03",
    "fuji": "eq=contrast=1.05:saturation=0.95:gamma_g=1.04,colorbalance=gs=0.04:rs=-0.02",
    "bleach_bypass": "eq=contrast=1.28:saturation=0.45:brightness=0.04,unsharp=5:5:0.8:5:5:0.0",
    "golden_hour": "eq=gamma_r=1.14:gamma_g=1.05:gamma_b=0.88:saturation=1.2:contrast=1.05,vignette=PI/5",
    "steel_blue": "eq=gamma_b=1.12:gamma_r=0.92:saturation=0.9:contrast=1.12,colorbalance=bs=0.05:rs=-0.04",
    "cross_process": "curves=vintage,eq=contrast=1.15:saturation=1.25",
    "night_mood": "eq=brightness=-0.1:contrast=1.18:saturation=0.75:gamma_b=1.1,vignette=PI/3.2",
    "pop_art": "eq=contrast=1.35:saturation=1.55:brightness=0.06",
    "soft_glow": "gblur=sigma=0.8,eq=contrast=1.04:saturation=1.1:brightness=0.05",
    "blockbuster": "colorbalance=rs=0.1:bs=-0.08:rm=0.05:bm=-0.06,eq=contrast=1.14:saturation=1.18",
    "moody_teal": "colorbalance=bs=0.08:rs=-0.05:gs=-0.02,eq=contrast=1.12:saturation=1.05:brightness=-0.02",
    "neon_pop": "eq=contrast=1.22:saturation=1.5:brightness=0.06,unsharp=5:5:1.0:5:5:0.0,vignette=PI/3.8",
    "warm_glow": "eq=contrast=1.1:saturation=1.25:brightness=0.06:gamma=1.05,colorbalance=rs=0.06:bs=-0.04,vignette=PI/5",
    "cold_steel": "eq=contrast=1.16:saturation=0.9:brightness=0.01:gamma_b=1.1,colorbalance=bs=0.06:rs=-0.04,vignette=PI/3.5",
    "pastel_dream": "eq=contrast=0.95:saturation=1.15:brightness=0.08:gamma=1.08,gblur=sigma=0.6",
    "noir_hard": "hue=s=0,eq=contrast=1.4:brightness=-0.02,vignette=PI/3,noise=alls=12:allf=t",
    "sunset_flare": "eq=gamma_r=1.16:gamma_g=1.02:gamma_b=0.86:saturation=1.32:contrast=1.1,vignette=PI/4",
    "soft_film": "eq=contrast=1.05:saturation=1.05:brightness=0.02:gamma=1.03,noise=alls=4:allf=t,vignette=PI/5.5",
    "punch_pop": "eq=contrast=1.26:saturation=1.42:brightness=0.05,unsharp=5:5:0.9:5:5:0.0,vignette=PI/4.5",
    "ice_crystal": "eq=contrast=1.12:saturation=0.8:brightness=0.04:gamma_b=1.14,colorbalance=bs=0.07,unsharp=5:5:0.7:5:5:0.0",
    "amber_rush": "eq=gamma_r=1.2:gamma_g=1.05:gamma_b=0.82:saturation=1.28:contrast=1.12,vignette=PI/4.2",
}

# Ken Burns / camera moves
MOTION_PRESETS: list[dict[str, str]] = [
    {
        "id": "punch_in",
        "zoom": "min(zoom+0.0028,1.28)",
        "x": "iw/2-(iw/zoom/2)",
        "y": "ih/2-(ih/zoom/2)",
        "eq": "eq=contrast=1.14:saturation=1.22:brightness=0.04",
    },
    {
        "id": "slow_push",
        "zoom": "min(zoom+0.0012,1.18)",
        "x": "iw/2-(iw/zoom/2)",
        "y": "ih/2-(ih/zoom/2)",
        "eq": "eq=contrast=1.06:saturation=1.1:brightness=0.02",
    },
    {
        "id": "rise",
        "zoom": "min(zoom+0.0015,1.2)",
        "x": "iw/2-(iw/zoom/2)",
        "y": "ih*0.52-(ih/zoom/2)-on*0.35",
        "eq": "eq=contrast=1.08:saturation=1.12:brightness=0.025",
    },
    {
        "id": "drift_left",
        "zoom": "min(1.12+0.0004*on,1.2)",
        "x": "iw/2-(iw/zoom/2)-on*0.55",
        "y": "ih/2-(ih/zoom/2)",
        "eq": "eq=contrast=1.07:saturation=1.1:brightness=0.02",
    },
    {
        "id": "drift_right",
        "zoom": "min(1.12+0.0004*on,1.2)",
        "x": "iw/2-(iw/zoom/2)+on*0.55",
        "y": "ih/2-(ih/zoom/2)",
        "eq": "eq=contrast=1.07:saturation=1.1:brightness=0.02",
    },
    {
        "id": "snap_zoom",
        "zoom": "if(lt(on,8),1.35-on*0.02,min(zoom+0.0009,1.16))",
        "x": "iw/2-(iw/zoom/2)",
        "y": "ih/2-(ih/zoom/2)",
        "eq": "eq=contrast=1.16:saturation=1.25:brightness=0.05",
    },
    {
        "id": "pull_out",
        "zoom": "max(1.28-0.0018*on,1.05)",
        "x": "iw/2-(iw/zoom/2)",
        "y": "ih/2-(ih/zoom/2)",
        "eq": "eq=contrast=1.05:saturation=1.08",
    },
    {
        "id": "tilt_up",
        "zoom": "min(1.15+0.0003*on,1.22)",
        "x": "iw/2-(iw/zoom/2)",
        "y": "ih*0.62-(ih/zoom/2)-on*0.7",
        "eq": "eq=contrast=1.07:saturation=1.1",
    },
    {
        "id": "tilt_down",
        "zoom": "min(1.15+0.0003*on,1.22)",
        "x": "iw/2-(iw/zoom/2)",
        "y": "ih*0.38-(ih/zoom/2)+on*0.7",
        "eq": "eq=contrast=1.07:saturation=1.1",
    },
    {
        "id": "handheld",
        "zoom": "min(1.1+0.0002*on,1.16)",
        "x": "iw/2-(iw/zoom/2)+sin(on/7)*8",
        "y": "ih/2-(ih/zoom/2)+cos(on/9)*6",
        "eq": "eq=contrast=1.05:saturation=1.08",
    },
    {
        "id": "orbit",
        "zoom": "min(1.14+0.0005*on,1.22)",
        "x": "iw/2-(iw/zoom/2)+sin(on/18)*18",
        "y": "ih/2-(ih/zoom/2)+cos(on/18)*12",
        "eq": "eq=contrast=1.08:saturation=1.12",
    },
    {
        "id": "crash_zoom",
        "zoom": "if(lt(on,12),1.05+on*0.035,min(zoom+0.0008,1.35))",
        "x": "iw/2-(iw/zoom/2)",
        "y": "ih/2-(ih/zoom/2)",
        "eq": "eq=contrast=1.2:saturation=1.25:brightness=0.04",
    },
    {
        "id": "whip_left",
        "zoom": "min(1.18+0.0005*on,1.28)",
        "x": "iw/2-(iw/zoom/2)-on*1.4",
        "y": "ih/2-(ih/zoom/2)+sin(on/11)*4",
        "eq": "eq=contrast=1.1:saturation=1.15:brightness=0.03",
    },
    {
        "id": "whip_right",
        "zoom": "min(1.18+0.0005*on,1.28)",
        "x": "iw/2-(iw/zoom/2)+on*1.4",
        "y": "ih/2-(ih/zoom/2)+sin(on/11)*4",
        "eq": "eq=contrast=1.1:saturation=1.15:brightness=0.03",
    },
    {
        "id": "breathe",
        "zoom": "1.12+0.04*sin(on/18)",
        "x": "iw/2-(iw/zoom/2)",
        "y": "ih/2-(ih/zoom/2)",
        "eq": "eq=contrast=1.06:saturation=1.12:brightness=0.02",
    },
    {
        "id": "reveal_up",
        "zoom": "min(1.2+0.0006*on,1.3)",
        "x": "iw/2-(iw/zoom/2)",
        "y": "ih*0.7-(ih/zoom/2)-on*1.1",
        "eq": "eq=contrast=1.09:saturation=1.14:brightness=0.03",
    },
    {
        "id": "zoom_out_punch",
        "zoom": "if(lt(on,10),1.4-on*0.025,max(1.4-0.002*on,1.08))",
        "x": "iw/2-(iw/zoom/2)",
        "y": "ih/2-(ih/zoom/2)",
        "eq": "eq=contrast=1.12:saturation=1.18:brightness=0.03",
    },
    {
        "id": "vertigo",
        "zoom": "min(1.05+0.003*on,1.4)",
        "x": "iw/2-(iw/zoom/2)",
        "y": "ih/2-(ih/zoom/2)+on*0.15",
        "eq": "eq=contrast=1.1:saturation=1.05",
    },
    {
        "id": "shake_hit",
        "zoom": "min(1.2+0.0002*on,1.25)",
        "x": "iw/2-(iw/zoom/2)+if(lt(on,15),sin(on*2.2)*14,sin(on/8)*3)",
        "y": "ih/2-(ih/zoom/2)+if(lt(on,15),cos(on*1.8)*10,cos(on/9)*2)",
        "eq": "eq=contrast=1.15:saturation=1.2:brightness=0.04",
    },
    {
        "id": "slide_diag",
        "zoom": "min(1.16+0.0004*on,1.24)",
        "x": "iw/2-(iw/zoom/2)+on*0.7",
        "y": "ih/2-(ih/zoom/2)-on*0.45",
        "eq": "eq=contrast=1.08:saturation=1.12",
    },
    {
        "id": "whip_zoom",
        "zoom": "if(lt(on,8),1.05+on*0.05,min(1.45+0.001*on,1.55))",
        "x": "iw/2-(iw/zoom/2)+if(lt(on,8),sin(on)*20,0)",
        "y": "ih/2-(ih/zoom/2)",
        "eq": "eq=contrast=1.14:saturation=1.22:brightness=0.04",
    },
    {
        "id": "parallax_drift",
        "zoom": "min(1.18+0.0003*on,1.28)",
        "x": "iw/2-(iw/zoom/2)+sin(on/22)*28",
        "y": "ih/2-(ih/zoom/2)+cos(on/28)*18",
        "eq": "eq=contrast=1.08:saturation=1.15:brightness=0.02",
    },
    {
        "id": "snap_in",
        "zoom": "if(lt(on,6),1.55-on*0.08,min(1.12+0.0004*on,1.22))",
        "x": "iw/2-(iw/zoom/2)",
        "y": "ih/2-(ih/zoom/2)",
        "eq": "eq=contrast=1.16:saturation=1.2:brightness=0.05",
    },
    {
        "id": "float_rise",
        "zoom": "min(1.1+0.0005*on,1.22)",
        "x": "iw/2-(iw/zoom/2)",
        "y": "ih/2-(ih/zoom/2)-on*0.9",
        "eq": "eq=contrast=1.05:saturation=1.1:brightness=0.03",
    },
    {
        "id": "orbit_soft",
        "zoom": "min(1.14+0.00035*on,1.26)",
        "x": "iw/2-(iw/zoom/2)+cos(on/16)*22",
        "y": "ih/2-(ih/zoom/2)+sin(on/16)*16",
        "eq": "eq=contrast=1.09:saturation=1.14",
    },
    {
        "id": "slow_dolly",
        "zoom": "min(1.06+0.0009*on,1.28)",
        "x": "iw/2-(iw/zoom/2)",
        "y": "ih/2-(ih/zoom/2)+on*0.12",
        "eq": "eq=contrast=1.07:saturation=1.08:brightness=0.01",
    },
    {
        "id": "impact_shake",
        "zoom": "min(1.22+0.0003*on,1.3)",
        "x": "iw/2-(iw/zoom/2)+if(lt(on,10),sin(on*3.1)*18,sin(on/10)*4)",
        "y": "ih/2-(ih/zoom/2)+if(lt(on,10),cos(on*2.6)*14,cos(on/11)*3)",
        "eq": "eq=contrast=1.18:saturation=1.22:brightness=0.05",
    },
    {
        "id": "peek_left",
        "zoom": "min(1.2+0.0004*on,1.28)",
        "x": "iw*0.62-(iw/zoom/2)-on*0.4",
        "y": "ih/2-(ih/zoom/2)",
        "eq": "eq=contrast=1.1:saturation=1.14",
    },
    {
        "id": "peek_right",
        "zoom": "min(1.2+0.0004*on,1.28)",
        "x": "iw*0.38-(iw/zoom/2)+on*0.4",
        "y": "ih/2-(ih/zoom/2)",
        "eq": "eq=contrast=1.1:saturation=1.14",
    },
]

# Editing pace profiles for AI montage
MONTAGE_PACE: dict[str, dict[str, float | str]] = {
    "viral": {
        "overlap": 0.68,
        "hook_ratio": 0.09,
        "hook_min": 1.8,
        "hook_max": 2.5,
        "flash_bias": 0.7,
        "speed_body": 1.08,
    },
    "fast": {
        "overlap": 0.62,
        "hook_ratio": 0.10,
        "hook_min": 2.0,
        "hook_max": 2.7,
        "flash_bias": 0.55,
        "speed_body": 1.05,
    },
    "medium": {
        "overlap": 0.55,
        "hook_ratio": 0.12,
        "hook_min": 2.4,
        "hook_max": 3.0,
        "flash_bias": 0.25,
        "speed_body": 1.0,
    },
    "cinematic": {
        "overlap": 0.40,
        "hook_ratio": 0.14,
        "hook_min": 2.8,
        "hook_max": 3.6,
        "flash_bias": 0.08,
        "speed_body": 0.96,
    },
}

FLASH_TRANSITION_POOL = (
    "fadewhite",
    "fadeblack",
    "radial",
    "zoomin",
    "circleopen",
    "circleclose",
    "distance",
    "hblur",
    "pixelize",
    "squeezeh",
    "squeezev",
    "diagtl",
    "diagbr",
    "hlslice",
    "hrslice",
)

# ASS subtitle / title looks (PrimaryColour is &HAABBGGRR)
SUBTITLE_STYLES: dict[str, dict[str, str]] = {
    "classic": {
        "name": "Classic",
        "font": "Arial Black",
        "size": "78",
        "primary": "&H00FFFFFF",
        "outline": "&H00000000",
        "outline_w": "6",
        "shadow": "0",
        "bold": "-1",
    },
    "karaoke_gold": {
        "name": "Karaoke Gold",
        "font": "Arial Black",
        "size": "82",
        "primary": "&H0000E5FF",
        "outline": "&H00000000",
        "outline_w": "7",
        "shadow": "0",
        "bold": "-1",
    },
    "box_white": {
        "name": "Box White",
        "font": "Arial",
        "size": "72",
        "primary": "&H00FFFFFF",
        "outline": "&H00000000",
        "outline_w": "0",
        "shadow": "0",
        "bold": "-1",
        "border_style": "3",
        "back": "&H99000000",
    },
    "neon_pink": {
        "name": "Neon Pink",
        "font": "Arial Black",
        "size": "80",
        "primary": "&H00FF66FF",
        "outline": "&H00FF00AA",
        "outline_w": "4",
        "shadow": "2",
        "bold": "-1",
    },
    "minimal": {
        "name": "Minimal",
        "font": "Arial",
        "size": "64",
        "primary": "&H00F0F0F0",
        "outline": "&H66000000",
        "outline_w": "2",
        "shadow": "0",
        "bold": "0",
    },
    "impact": {
        "name": "Impact",
        "font": "Impact",
        "size": "90",
        "primary": "&H00FFFFFF",
        "outline": "&H00000000",
        "outline_w": "8",
        "shadow": "0",
        "bold": "-1",
    },
    "soft_shadow": {
        "name": "Soft Shadow",
        "font": "Arial",
        "size": "74",
        "primary": "&H00FFFFFF",
        "outline": "&H00000000",
        "outline_w": "3",
        "shadow": "4",
        "bold": "-1",
    },
    "yellow_pop": {
        "name": "Yellow Pop",
        "font": "Arial Black",
        "size": "80",
        "primary": "&H0000FFFF",
        "outline": "&H00000000",
        "outline_w": "6",
        "shadow": "0",
        "bold": "-1",
    },
    "lower_third": {
        "name": "Lower Third",
        "font": "Arial",
        "size": "58",
        "primary": "&H00FFFFFF",
        "outline": "&H00000000",
        "outline_w": "0",
        "shadow": "0",
        "bold": "-1",
        "border_style": "3",
        "back": "&HC0000000",
        "align": "2",
    },
    "hook_banner": {
        "name": "Hook Banner",
        "font": "Arial Black",
        "size": "92",
        "primary": "&H0000E5FF",
        "outline": "&H00000000",
        "outline_w": "8",
        "shadow": "0",
        "bold": "-1",
    },
    "cyan_glow": {
        "name": "Cyan Glow",
        "font": "Arial Black",
        "size": "80",
        "primary": "&H00FFE066",
        "outline": "&H00FFAA00",
        "outline_w": "3",
        "shadow": "3",
        "bold": "-1",
    },
    "fire_orange": {
        "name": "Fire Orange",
        "font": "Impact",
        "size": "86",
        "primary": "&H0000A5FF",
        "outline": "&H0000288B",
        "outline_w": "6",
        "shadow": "2",
        "bold": "-1",
    },
    "lime_pulse": {
        "name": "Lime Pulse",
        "font": "Arial Black",
        "size": "78",
        "primary": "&H0000FF99",
        "outline": "&H00000000",
        "outline_w": "5",
        "shadow": "0",
        "bold": "-1",
    },
    "comic_pop": {
        "name": "Comic Pop",
        "font": "Comic Sans MS",
        "size": "76",
        "primary": "&H00FFFFFF",
        "outline": "&H000000FF",
        "outline_w": "5",
        "shadow": "0",
        "bold": "-1",
    },
    "glass_frost": {
        "name": "Glass Frost",
        "font": "Arial",
        "size": "68",
        "primary": "&H00FFFFFF",
        "outline": "&H00000000",
        "outline_w": "0",
        "shadow": "0",
        "bold": "-1",
        "border_style": "3",
        "back": "&HAA1A1A2E",
    },
    "serif_clean": {
        "name": "Serif Clean",
        "font": "Georgia",
        "size": "70",
        "primary": "&H00F8F8F8",
        "outline": "&H66000000",
        "outline_w": "2",
        "shadow": "1",
        "bold": "0",
    },
    "stack_outline": {
        "name": "Stack Outline",
        "font": "Arial Black",
        "size": "84",
        "primary": "&H00000000",
        "outline": "&H00FFFFFF",
        "outline_w": "5",
        "shadow": "0",
        "bold": "-1",
    },
    "typewriter": {
        "name": "Typewriter",
        "font": "Courier New",
        "size": "64",
        "primary": "&H00E8E8E8",
        "outline": "&H00000000",
        "outline_w": "3",
        "shadow": "0",
        "bold": "0",
    },
    "viral_white": {
        "name": "Viral White",
        "font": "Arial Black",
        "size": "86",
        "primary": "&H00FFFFFF",
        "outline": "&H00000000",
        "outline_w": "9",
        "shadow": "0",
        "bold": "-1",
    },
    "duotone_sub": {
        "name": "Duotone Sub",
        "font": "Arial Black",
        "size": "78",
        "primary": "&H00FFCC66",
        "outline": "&H00AA4400",
        "outline_w": "4",
        "shadow": "2",
        "bold": "-1",
    },
    "neon_cyan": {
        "name": "Neon Cyan",
        "font": "Arial Black",
        "size": "80",
        "primary": "&H00FFE060",
        "outline": "&H00FF0080",
        "outline_w": "5",
        "shadow": "0",
        "bold": "-1",
    },
    "soft_white": {
        "name": "Soft White",
        "font": "Arial",
        "size": "68",
        "primary": "&H00FFFFFF",
        "outline": "&H00404040",
        "outline_w": "2",
        "shadow": "1",
        "bold": "0",
        "back": "&H60000000",
        "border_style": "3",
    },
    "mint_clean": {
        "name": "Mint Clean",
        "font": "Arial",
        "size": "70",
        "primary": "&H00C8FFD0",
        "outline": "&H00204030",
        "outline_w": "3",
        "shadow": "1",
        "bold": "-1",
    },
    "purple_wave": {
        "name": "Purple Wave",
        "font": "Arial Black",
        "size": "74",
        "primary": "&H00FFB0E0",
        "outline": "&H00600080",
        "outline_w": "4",
        "shadow": "2",
        "bold": "-1",
    },
    "newspaper": {
        "name": "Newspaper",
        "font": "Georgia",
        "size": "64",
        "primary": "&H00F5F5F5",
        "outline": "&H00000000",
        "outline_w": "2",
        "shadow": "0",
        "bold": "0",
        "back": "&H90000000",
        "border_style": "3",
    },
    "street_graffiti": {
        "name": "Street Graffiti",
        "font": "Impact",
        "size": "84",
        "primary": "&H0000FF80",
        "outline": "&H00000000",
        "outline_w": "6",
        "shadow": "0",
        "bold": "-1",
    },
    "elegant_gold": {
        "name": "Elegant Gold",
        "font": "Georgia",
        "size": "72",
        "primary": "&H0000D4FF",
        "outline": "&H00201000",
        "outline_w": "3",
        "shadow": "2",
        "bold": "0",
    },
    "bold_white": {
        "name": "Bold White",
        "font": "Impact",
        "size": "88",
        "primary": "&H00FFFFFF",
        "outline": "&H00000000",
        "outline_w": "7",
        "shadow": "0",
        "bold": "-1",
    },
}

# Legacy / UI aliases → canonical SUBTITLE_STYLES keys
_SUBTITLE_ALIASES: dict[str, str] = {
    "karaoke_bold": "karaoke_gold",
    "karaoke": "karaoke_gold",
    "gold": "karaoke_gold",
    "bold": "bold_white",
    "tiktok": "viral_white",
    "youtube": "classic",
    "banner": "hook_banner",
    "hook": "hook_banner",
    "cyan": "neon_cyan",
    "neon": "neon_pink",
    "clean": "soft_white",
    "fire": "fire_orange",
    "mint": "mint_clean",
    "purple": "purple_wave",
    "comic": "comic_pop",
    "serif": "serif_clean",
    "graffiti": "street_graffiti",
    "news": "newspaper",
    "elegant": "elegant_gold",
}


def normalize_subtitle_style(style_id: str | None) -> str:
    """Map UI / legacy ids to a key present in SUBTITLE_STYLES."""
    raw = (style_id or "classic").strip().lower().replace(" ", "_").replace("-", "_")
    if not raw:
        return "classic"
    mapped = _SUBTITLE_ALIASES.get(raw, raw)
    if mapped in SUBTITLE_STYLES:
        return mapped
    for key in SUBTITLE_STYLES:
        if key in mapped or mapped in key:
            return key
    return "classic"


# Training video_style → montage defaults (overridden by explicit training fields)
VIDEO_STYLE_MONTAGE: dict[str, dict[str, str | bool]] = {
    "cinematic_mixer": {
        "visual_effect": "blockbuster",
        "preferred_transition": "dissolve",
        "montage_pace": "cinematic",
        "flash_cuts": False,
    },
    "fast_cuts": {
        "visual_effect": "punch",
        "preferred_transition": "zoomin",
        "montage_pace": "viral",
        "flash_cuts": True,
    },
    "slow_zoom": {
        "visual_effect": "cinematic",
        "preferred_transition": "fade",
        "montage_pace": "cinematic",
        "flash_cuts": False,
    },
    "karaoke_focus": {
        "visual_effect": "vivid",
        "preferred_transition": "fade",
        "montage_pace": "medium",
        "flash_cuts": False,
    },
    "punch_hook": {
        "visual_effect": "punch_pop",
        "preferred_transition": "radial",
        "montage_pace": "fast",
        "flash_cuts": True,
    },
    "smooth_glide": {
        "visual_effect": "soft",
        "preferred_transition": "smoothleft",
        "montage_pace": "medium",
        "flash_cuts": False,
    },
    "gritty_handheld": {
        "visual_effect": "drama",
        "preferred_transition": "fadeblack",
        "montage_pace": "fast",
        "flash_cuts": True,
    },
    "luxury_slow": {
        "visual_effect": "golden_hour",
        "preferred_transition": "dissolve",
        "montage_pace": "cinematic",
        "flash_cuts": False,
    },
    "hype_edit": {
        "visual_effect": "pop_art",
        "preferred_transition": "circleopen",
        "montage_pace": "viral",
        "flash_cuts": True,
    },
    "clean_minimal": {
        "visual_effect": "soft_film",
        "preferred_transition": "fade",
        "montage_pace": "medium",
        "flash_cuts": False,
    },
}


def resolve_training_montage(
    training: dict | None,
    *,
    script_data: dict | None = None,
    meta0: dict | None = None,
) -> dict[str, str | bool | None]:
    """Prefer AI Training montage fields, then video_style, then script/meta."""
    training = dict(training or {})
    # Fallback when DB columns not migrated yet — mirrored by /api/training
    prefs = training.get("music_prefs") or {}
    if isinstance(prefs, dict):
        look = prefs.get("montage_look")
        if isinstance(look, dict):
            for key in (
                "visual_effect",
                "preferred_transition",
                "montage_pace",
                "flash_cuts",
                "subtitle_style",
            ):
                if not training.get(key) and look.get(key) is not None:
                    training[key] = look[key]
    script_data = script_data or {}
    meta0 = meta0 or {}
    style_key = str(training.get("video_style") or "").strip().lower().replace(" ", "_")
    from_style = VIDEO_STYLE_MONTAGE.get(style_key) or {}

    def pick_str(*keys: str, default: str = "") -> str:
        for src in (training, from_style, script_data, meta0):
            for k in keys:
                v = src.get(k)
                if v is None:
                    continue
                s = str(v).strip()
                if s:
                    return s
        return default

    def pick_bool(*keys: str, default: bool = False) -> bool:
        for src in (training, from_style, script_data, meta0):
            for k in keys:
                if k in src and src.get(k) is not None:
                    return bool(src.get(k))
        return default

    subtitle = normalize_subtitle_style(
        pick_str("subtitle_style", default="classic")
    )
    effect = pick_str("visual_effect", "effect", default="cinematic")
    if effect not in EFFECT_FILTERS:
        effect = "cinematic"
    transition = pick_str("preferred_transition", default="")
    if transition and transition not in TRANSITION_LIBRARY:
        transition = ""
    pace = pick_str("montage_pace", default="medium").lower()
    if pace not in MONTAGE_PACE:
        pace = "medium"
    flash = pick_bool("flash_cuts", default=False)

    return {
        "subtitle_style": subtitle,
        "visual_effect": effect,
        "preferred_transition": transition or None,
        "montage_pace": pace,
        "flash_cuts": flash,
    }

# drawtext title cards / still overlays
TEXT_STYLES: dict[str, dict[str, str]] = {
    "bold_center": {
        "fontsize": "72",
        "fontcolor": "white",
        "borderw": "5",
        "bordercolor": "black",
        "x": "(w-text_w)/2",
        "y": "(h-text_h)/2",
    },
    "hook_top": {
        "fontsize": "64",
        "fontcolor": "0xE8A54B",
        "borderw": "4",
        "bordercolor": "black",
        "x": "(w-text_w)/2",
        "y": "h*0.18",
    },
    "caption_bottom": {
        "fontsize": "56",
        "fontcolor": "white",
        "borderw": "4",
        "bordercolor": "black",
        "x": "(w-text_w)/2",
        "y": "h*0.78",
    },
    "box_lower": {
        "fontsize": "52",
        "fontcolor": "white",
        "box": "1",
        "boxcolor": "black@0.55",
        "boxborderw": "16",
        "x": "(w-text_w)/2",
        "y": "h*0.72",
    },
    "tiny_credit": {
        "fontsize": "36",
        "fontcolor": "white@0.85",
        "borderw": "2",
        "bordercolor": "black",
        "x": "(w-text_w)/2",
        "y": "h*0.92",
    },
    "mega_title": {
        "fontsize": "96",
        "fontcolor": "white",
        "borderw": "8",
        "bordercolor": "black",
        "x": "(w-text_w)/2",
        "y": "(h-text_h)/2",
    },
    "slide_left_title": {
        "fontsize": "70",
        "fontcolor": "0xE8A54B",
        "borderw": "4",
        "bordercolor": "black",
        "x": "w*0.08",
        "y": "(h-text_h)/2",
    },
    "slide_right_title": {
        "fontsize": "70",
        "fontcolor": "white",
        "borderw": "4",
        "bordercolor": "black",
        "x": "w-text_w-w*0.08",
        "y": "(h-text_h)/2",
    },
    "kinetic_center": {
        "fontsize": "88",
        "fontcolor": "0x66FFE0",
        "borderw": "6",
        "bordercolor": "black",
        "x": "(w-text_w)/2",
        "y": "h*0.42",
    },
    "stamp_corner": {
        "fontsize": "48",
        "fontcolor": "0xFF66AA",
        "borderw": "3",
        "bordercolor": "black",
        "x": "w*0.06",
        "y": "h*0.12",
    },
    "cta_bottom": {
        "fontsize": "54",
        "fontcolor": "0xE8A54B",
        "borderw": "4",
        "bordercolor": "black",
        "box": "1",
        "boxcolor": "black@0.45",
        "boxborderw": "14",
        "x": "(w-text_w)/2",
        "y": "h*0.82",
    },
    "word_slam": {
        "fontsize": "102",
        "fontcolor": "white",
        "borderw": "9",
        "bordercolor": "black",
        "x": "(w-text_w)/2",
        "y": "h*0.36",
    },
}

FADE_BOOKENDS = ("none", "fade", "fadeblack", "fadewhite")


def effect_chain(effect_id: str) -> str:
    return EFFECT_FILTERS.get(effect_id or "none", "") or ""


def motion_by_id(motion_id: str) -> dict[str, str] | None:
    for m in MOTION_PRESETS:
        if m["id"] == motion_id:
            return m
    return None


def pace_profile(pace_id: str | None) -> dict[str, float | str]:
    key = (pace_id or "medium").strip().lower()
    return dict(MONTAGE_PACE.get(key) or MONTAGE_PACE["medium"])
