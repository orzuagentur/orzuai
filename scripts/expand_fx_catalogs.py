"""One-shot: expand FX catalogs in worker fx_library.py + web editor-catalog.ts."""
from __future__ import annotations

from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
FX = ROOT / "worker" / "orzuvideo" / "pipeline" / "fx_library.py"
CAT = ROOT / "web" / "src" / "lib" / "editor-catalog.ts"
PRESETS = ROOT / "web" / "src" / "lib" / "training-presets.ts"

# --- Extra effects (FFmpeg filter chains) ---
EXTRA_EFFECTS: dict[str, str] = {
    "crimson_rush": "eq=contrast=1.18:saturation=1.35:brightness=0.03:gamma_r=1.15,vignette=PI/4",
    "mint_fresh": "eq=contrast=1.06:saturation=1.12:gamma_g=1.1,colorbalance=gs=0.05",
    "lavender_haze": "eq=contrast=0.98:saturation=1.1:brightness=0.05,colorbalance=rs=0.04:bs=0.06,gblur=sigma=0.7",
    "graphite": "hue=s=0.2,eq=contrast=1.2:saturation=0.5:brightness=0.01",
    "honey_glaze": "eq=gamma_r=1.12:gamma_g=1.06:saturation=1.22:contrast=1.06,colorbalance=rs=0.07",
    "electric_blue": "eq=contrast=1.16:saturation=1.3:gamma_b=1.2,unsharp=5:5:0.8:5:5:0.0",
    "moss": "eq=contrast=1.08:saturation=0.9:gamma_g=1.12,colorbalance=gs=0.06:rs=-0.03",
    "sandstorm": "eq=contrast=1.1:saturation=1.05:brightness=0.04,noise=alls=11:allf=t,colorbalance=rs=0.08",
    "plasma": "eq=contrast=1.25:saturation=1.5:brightness=0.05,hue=h=15",
    "copper": "eq=contrast=1.12:saturation=1.15:gamma_r=1.1,colorbalance=rs=0.1:bs=-0.05,vignette=PI/4.5",
    "pearl": "eq=contrast=0.94:saturation=0.8:brightness=0.08:gamma=1.1",
    "obsidian": "eq=brightness=-0.12:contrast=1.3:saturation=0.7,vignette=PI/3",
    "sakura": "eq=contrast=1.05:saturation=1.15:brightness=0.05,colorbalance=rs=0.08:bs=0.02",
    "jade": "eq=contrast=1.1:saturation=1.18:gamma_g=1.12,colorbalance=gs=0.08",
    "cobalt": "eq=contrast=1.14:saturation=1.05:gamma_b=1.18,colorbalance=bs=0.08",
    "rust": "eq=contrast=1.15:saturation=1.1:gamma_r=1.2:gamma_b=0.85,sepia=0.15",
    "fog": "eq=contrast=0.9:saturation=0.7:brightness=0.06,gblur=sigma=1.4",
    "spark": "eq=contrast=1.2:saturation=1.35:brightness=0.06,unsharp=7:7:1.2:7:7:0.0",
    "velvet": "eq=contrast=1.08:saturation=1.05:brightness=-0.02,vignette=PI/3.5,colorbalance=rs=0.04",
    "aurora": "eq=contrast=1.1:saturation=1.25,colorbalance=gs=0.05:bs=0.08:rs=-0.03",
    "noir_blue": "hue=s=0.25,eq=contrast=1.28:saturation=0.6:gamma_b=1.15",
    "candy_crush": "eq=contrast=1.22:saturation=1.6:brightness=0.07",
    "smoke": "eq=contrast=1.05:saturation=0.65:brightness=0.02,gblur=sigma=0.9,noise=alls=6:allf=t",
    "laser": "eq=contrast=1.3:saturation=1.45:brightness=0.04,unsharp=5:5:1.4:5:5:0.0",
    "bronze": "eq=contrast=1.1:saturation=1.08:gamma_r=1.08,colorbalance=rs=0.09:bs=-0.04",
    "ice_blue": "eq=contrast=1.12:saturation=0.85:brightness=0.05:gamma_b=1.16",
    "mango": "eq=contrast=1.08:saturation=1.3:gamma_r=1.14:gamma_g=1.05,colorbalance=rs=0.08",
    "plum": "eq=contrast=1.12:saturation=1.15,colorbalance=rs=0.06:bs=0.08",
    "slate": "eq=contrast=1.1:saturation=0.75:brightness=0.01,colorbalance=bs=0.03",
    "flare_warm": "eq=contrast=1.08:saturation=1.28:brightness=0.06:gamma_r=1.16,vignette=PI/4",
    "bleach_soft": "eq=contrast=1.15:saturation=0.65:brightness=0.06",
    "cinema_teal": "colorbalance=bs=0.1:rs=-0.06,eq=contrast=1.16:saturation=1.1:brightness=-0.01",
    "punch_red": "eq=contrast=1.24:saturation=1.4:gamma_r=1.12,vignette=PI/4.2",
    "soft_sepia": "eq=contrast=0.98:saturation=0.7:brightness=0.04,sepia=0.45",
    "neon_violet": "eq=contrast=1.2:saturation=1.4,colorbalance=rs=0.08:bs=0.12",
    "forest_dusk": "eq=contrast=1.12:saturation=0.95:brightness=-0.03:gamma_g=1.08,vignette=PI/3.6",
    "chrome_blue": "eq=contrast=1.18:saturation=0.45:gamma_b=1.1",
    "glow_amber": "eq=contrast=1.08:saturation=1.22:brightness=0.05,gblur=sigma=0.5,colorbalance=rs=0.07",
    "hard_contrast": "eq=contrast=1.4:saturation=1.05:brightness=0.02",
    "soft_matte": "eq=contrast=0.92:saturation=0.95:brightness=0.05:gamma=1.08",
    "urban_night": "eq=brightness=-0.08:contrast=1.22:saturation=0.85:gamma_b=1.1,vignette=PI/3.2",
    "tropical": "eq=contrast=1.1:saturation=1.35:brightness=0.04:gamma_g=1.08",
    "winter_fade": "eq=contrast=1.05:saturation=0.7:brightness=0.06:gamma_b=1.1,gblur=sigma=0.4",
    "ink_red": "eq=contrast=1.2:saturation=1.25:gamma_r=1.2,colorbalance=rs=0.12",
    "mint_noir": "hue=s=0.35,eq=contrast=1.25:saturation=0.55:gamma_g=1.1",
    "gold_rush": "eq=contrast=1.12:saturation=1.25:gamma_r=1.12:gamma_g=1.05,colorbalance=rs=0.1",
    "steel_noir": "hue=s=0.15,eq=contrast=1.3:saturation=0.4:gamma_b=1.05,vignette=PI/3.4",
    "bubblegum": "eq=contrast=1.15:saturation=1.5:brightness=0.06,colorbalance=rs=0.1:bs=0.05",
    "deep_purple": "eq=contrast=1.14:saturation=1.2:brightness=-0.02,colorbalance=rs=0.05:bs=0.1",
    "lime_crush": "eq=contrast=1.2:saturation=1.4,colorchannelmixer=rr=0.9:gg=1.3:bb=0.75",
    "ocean_mist": "eq=contrast=1.05:saturation=0.9:brightness=0.04:gamma_b=1.12,gblur=sigma=0.6",
    "ember_glow": "eq=contrast=1.14:saturation=1.28:gamma_r=1.18,vignette=PI/4,gblur=sigma=0.35",
}

EXTRA_EFFECT_LABELS = {
    "crimson_rush": "Crimson rush",
    "mint_fresh": "Mint fresh",
    "lavender_haze": "Lavender haze",
    "graphite": "Graphite",
    "honey_glaze": "Honey glaze",
    "electric_blue": "Electric blue",
    "moss": "Moss",
    "sandstorm": "Sandstorm",
    "plasma": "Plasma",
    "copper": "Copper",
    "pearl": "Pearl",
    "obsidian": "Obsidian",
    "sakura": "Sakura",
    "jade": "Jade",
    "cobalt": "Cobalt",
    "rust": "Rust",
    "fog": "Fog",
    "spark": "Spark",
    "velvet": "Velvet",
    "aurora": "Aurora",
    "noir_blue": "Noir blue",
    "candy_crush": "Candy crush",
    "smoke": "Smoke",
    "laser": "Laser",
    "bronze": "Bronze",
    "ice_blue": "Ice blue",
    "mango": "Mango",
    "plum": "Plum",
    "slate": "Slate",
    "flare_warm": "Flare warm",
    "bleach_soft": "Bleach soft",
    "cinema_teal": "Cinema teal",
    "punch_red": "Punch red",
    "soft_sepia": "Soft sepia",
    "neon_violet": "Neon violet",
    "forest_dusk": "Forest dusk",
    "chrome_blue": "Chrome blue",
    "glow_amber": "Glow amber",
    "hard_contrast": "Hard contrast",
    "soft_matte": "Soft matte",
    "urban_night": "Urban night",
    "tropical": "Tropical",
    "winter_fade": "Winter fade",
    "ink_red": "Ink red",
    "mint_noir": "Mint noir",
    "gold_rush": "Gold rush",
    "steel_noir": "Steel noir",
    "bubblegum": "Bubblegum",
    "deep_purple": "Deep purple",
    "lime_crush": "Lime crush",
    "ocean_mist": "Ocean mist",
    "ember_glow": "Ember glow",
}

EXTRA_MOTIONS = [
    ("spin_in", "min(1.05+0.004*on,1.35)", "iw/2-(iw/zoom/2)+sin(on/10)*8", "ih/2-(ih/zoom/2)+cos(on/10)*6", "eq=contrast=1.12:saturation=1.15"),
    ("roll_left", "min(1.14+0.0004*on,1.24)", "iw/2-(iw/zoom/2)-on*0.9", "ih/2-(ih/zoom/2)+sin(on/15)*8", "eq=contrast=1.1:saturation=1.12"),
    ("roll_right", "min(1.14+0.0004*on,1.24)", "iw/2-(iw/zoom/2)+on*0.9", "ih/2-(ih/zoom/2)+sin(on/15)*8", "eq=contrast=1.1:saturation=1.12"),
    ("drop_in", "if(lt(on,10),1.45-on*0.03,min(1.15+0.0005*on,1.25))", "iw/2-(iw/zoom/2)", "ih*0.35-(ih/zoom/2)+on*0.8", "eq=contrast=1.14:saturation=1.18"),
    ("lift_out", "max(1.3-0.002*on,1.06)", "iw/2-(iw/zoom/2)", "ih/2-(ih/zoom/2)-on*0.5", "eq=contrast=1.08:saturation=1.1"),
    ("pulse_zoom", "1.12+0.06*sin(on/10)", "iw/2-(iw/zoom/2)", "ih/2-(ih/zoom/2)", "eq=contrast=1.12:saturation=1.2:brightness=0.03"),
    ("side_sweep", "min(1.18+0.0003*on,1.28)", "iw/2-(iw/zoom/2)+on*1.1", "ih/2-(ih/zoom/2)", "eq=contrast=1.1:saturation=1.14"),
    ("corner_crawl", "min(1.2+0.0004*on,1.3)", "iw*0.55-(iw/zoom/2)-on*0.35", "ih*0.55-(ih/zoom/2)-on*0.25", "eq=contrast=1.09:saturation=1.1"),
    ("hard_punch", "if(lt(on,6),1.02+on*0.07,min(1.4+0.0004*on,1.48))", "iw/2-(iw/zoom/2)", "ih/2-(ih/zoom/2)", "eq=contrast=1.22:saturation=1.28:brightness=0.05"),
    ("soft_drift", "min(1.08+0.0005*on,1.18)", "iw/2-(iw/zoom/2)+sin(on/30)*20", "ih/2-(ih/zoom/2)+cos(on/34)*14", "eq=contrast=1.05:saturation=1.08"),
    ("kick_zoom", "if(lt(on,7),1.5-on*0.06,min(1.16+0.0005*on,1.26))", "iw/2-(iw/zoom/2)+if(lt(on,7),sin(on)*12,0)", "ih/2-(ih/zoom/2)", "eq=contrast=1.18:saturation=1.22"),
    ("hover", "1.1+0.025*sin(on/22)", "iw/2-(iw/zoom/2)+sin(on/40)*6", "ih/2-(ih/zoom/2)+cos(on/38)*6", "eq=contrast=1.06:saturation=1.1"),
    ("dive", "min(1.08+0.0025*on,1.4)", "iw/2-(iw/zoom/2)", "ih*0.4-(ih/zoom/2)+on*0.9", "eq=contrast=1.12:saturation=1.1"),
    ("rise_spin", "min(1.12+0.0006*on,1.28)", "iw/2-(iw/zoom/2)+sin(on/12)*14", "ih/2-(ih/zoom/2)-on*0.7", "eq=contrast=1.1:saturation=1.14"),
    ("jitter_push", "min(1.15+0.0008*on,1.3)", "iw/2-(iw/zoom/2)+sin(on*1.6)*5", "ih/2-(ih/zoom/2)+cos(on*1.4)*4", "eq=contrast=1.14:saturation=1.16"),
    ("wide_pull", "max(1.35-0.0015*on,1.05)", "iw/2-(iw/zoom/2)", "ih/2-(ih/zoom/2)", "eq=contrast=1.05:saturation=1.05"),
    ("snap_left", "min(1.2+0.0003*on,1.28)", "iw*0.65-(iw/zoom/2)-on*0.55", "ih/2-(ih/zoom/2)", "eq=contrast=1.12:saturation=1.15"),
    ("snap_right", "min(1.2+0.0003*on,1.28)", "iw*0.35-(iw/zoom/2)+on*0.55", "ih/2-(ih/zoom/2)", "eq=contrast=1.12:saturation=1.15"),
    ("boom_up", "min(1.16+0.0005*on,1.28)", "iw/2-(iw/zoom/2)", "ih*0.65-(ih/zoom/2)-on*1.05", "eq=contrast=1.1:saturation=1.12"),
    ("crash_down", "min(1.1+0.0012*on,1.32)", "iw/2-(iw/zoom/2)", "ih*0.3-(ih/zoom/2)+on*1.1", "eq=contrast=1.16:saturation=1.2"),
    ("twist_drift", "min(1.14+0.0004*on,1.26)", "iw/2-(iw/zoom/2)+sin(on/9)*18", "ih/2-(ih/zoom/2)+cos(on/13)*12", "eq=contrast=1.09:saturation=1.13"),
    ("stomp_zoom", "if(lt(on,5),1.65-on*0.1,min(1.2+0.0004*on,1.3))", "iw/2-(iw/zoom/2)", "ih/2-(ih/zoom/2)", "eq=contrast=1.2:saturation=1.25:brightness=0.04"),
    ("glide_diag", "min(1.15+0.0005*on,1.27)", "iw/2-(iw/zoom/2)+on*0.6", "ih/2-(ih/zoom/2)-on*0.55", "eq=contrast=1.08:saturation=1.1"),
    ("focus_pull", "min(1.06+0.0022*on,1.34)", "iw/2-(iw/zoom/2)+sin(on/50)*4", "ih/2-(ih/zoom/2)", "eq=contrast=1.1:saturation=1.05"),
    ("shake_roll", "min(1.18+0.0002*on,1.26)", "iw/2-(iw/zoom/2)+sin(on*2)*10", "ih/2-(ih/zoom/2)+cos(on*1.7)*8", "eq=contrast=1.15:saturation=1.18"),
    ("pop_breathe", "1.14+0.05*sin(on/14)", "iw/2-(iw/zoom/2)", "ih/2-(ih/zoom/2)", "eq=contrast=1.1:saturation=1.18:brightness=0.03"),
    ("laser_track", "min(1.22+0.0005*on,1.34)", "iw/2-(iw/zoom/2)+on*0.3", "ih/2-(ih/zoom/2)-sin(on/8)*6", "eq=contrast=1.16:saturation=1.22"),
    ("anchor_push", "min(1.05+0.001*on,1.22)", "iw/2-(iw/zoom/2)", "ih/2-(ih/zoom/2)", "eq=contrast=1.07:saturation=1.08"),
    ("whip_diag", "min(1.2+0.0006*on,1.32)", "iw/2-(iw/zoom/2)+on*1.2", "ih/2-(ih/zoom/2)+on*0.4", "eq=contrast=1.14:saturation=1.2"),
    ("soft_orbit", "min(1.12+0.00035*on,1.24)", "iw/2-(iw/zoom/2)+cos(on/20)*20", "ih/2-(ih/zoom/2)+sin(on/20)*14", "eq=contrast=1.07:saturation=1.1"),
]

MOTION_LABELS = {
    "spin_in": "Spin in",
    "roll_left": "Roll left",
    "roll_right": "Roll right",
    "drop_in": "Drop in",
    "lift_out": "Lift out",
    "pulse_zoom": "Pulse zoom",
    "side_sweep": "Side sweep",
    "corner_crawl": "Corner crawl",
    "hard_punch": "Hard punch",
    "soft_drift": "Soft drift",
    "kick_zoom": "Kick zoom",
    "hover": "Hover",
    "dive": "Dive",
    "rise_spin": "Rise spin",
    "jitter_push": "Jitter push",
    "wide_pull": "Wide pull",
    "snap_left": "Snap left",
    "snap_right": "Snap right",
    "boom_up": "Boom up",
    "crash_down": "Crash down",
    "twist_drift": "Twist drift",
    "stomp_zoom": "Stomp zoom",
    "glide_diag": "Glide diag",
    "focus_pull": "Focus pull",
    "shake_roll": "Shake roll",
    "pop_breathe": "Pop breathe",
    "laser_track": "Laser track",
    "anchor_push": "Anchor push",
    "whip_diag": "Whip diag",
    "soft_orbit": "Soft orbit",
}

# subtitle extras: id -> (name, font, size, primary, outline, outline_w, shadow, bold, extras?)
EXTRA_SUBS = [
    ("hot_pink", "Hot Pink", "Arial Black", "78", "&H00FF66CC", "&H00000000", "5", "1", "-1", None),
    ("ice_white", "Ice White", "Arial", "74", "&H00FFFFFF", "&H00AA8866", "3", "1", "-1", None),
    ("blood_red", "Blood Red", "Impact", "84", "&H000000FF", "&H00000000", "6", "0", "-1", None),
    ("sky_blue", "Sky Blue", "Arial Black", "76", "&H00FFCC66", "&H00402000", "4", "1", "-1", None),
    ("lemon_zap", "Lemon Zap", "Arial Black", "80", "&H0000FFFF", "&H00004080", "5", "0", "-1", None),
    ("orange_blast", "Orange Blast", "Impact", "82", "&H000080FF", "&H00000000", "6", "1", "-1", None),
    ("violet_neon", "Violet Neon", "Arial Black", "78", "&H00FF66FF", "&H008000FF", "4", "2", "-1", None),
    ("emerald", "Emerald", "Arial Black", "76", "&H0080FF80", "&H00204020", "4", "1", "-1", None),
    ("sand_gold", "Sand Gold", "Georgia", "70", "&H00AADDFF", "&H00201000", "3", "1", "0", None),
    ("ink_black", "Ink Black", "Arial Black", "80", "&H00000000", "&H00FFFFFF", "5", "0", "-1", None),
    ("cloud_soft", "Cloud Soft", "Arial", "68", "&H00FFFFFF", "&H00404040", "2", "1", "0", {"border_style": "3", "back": "&H70000000"}),
    ("ticker", "Ticker", "Arial", "58", "&H00FFFFFF", "&H00000000", "0", "0", "-1", {"border_style": "3", "back": "&HC0000000", "align": "2"}),
    ("poster", "Poster", "Impact", "92", "&H00FFFFFF", "&H00000000", "9", "0", "-1", None),
    ("outline_cyan", "Outline Cyan", "Arial Black", "80", "&H00000000", "&H00FFE060", "5", "0", "-1", None),
    ("outline_gold", "Outline Gold", "Arial Black", "80", "&H00000000", "&H0000D4FF", "5", "0", "-1", None),
    ("bubble", "Bubble", "Arial", "72", "&H00FFFFFF", "&H00000000", "0", "0", "-1", {"border_style": "3", "back": "&HAA2060A0"}),
    ("warning", "Warning", "Impact", "86", "&H0000FFFF", "&H00000000", "7", "0", "-1", None),
    ("whisper", "Whisper", "Georgia", "62", "&H00E8E8E8", "&H66000000", "2", "1", "0", None),
    ("mega_hook", "Mega Hook", "Arial Black", "96", "&H00FFFFFF", "&H00000000", "10", "0", "-1", None),
    ("teal_pop", "Teal Pop", "Arial Black", "78", "&H00CCFF66", "&H00000000", "5", "1", "-1", None),
    ("rose_soft", "Rose Soft", "Arial", "70", "&H00D0C0FF", "&H00402040", "3", "1", "0", None),
    ("steel_caption", "Steel Caption", "Arial", "66", "&H00F0F0F0", "&H00000000", "0", "0", "-1", {"border_style": "3", "back": "&HA0283038"}),
    ("comic_yellow", "Comic Yellow", "Comic Sans MS", "76", "&H0000FFFF", "&H000000FF", "4", "0", "-1", None),
    ("night_lime", "Night Lime", "Arial Black", "80", "&H0000FF99", "&H00000000", "6", "2", "-1", None),
    ("royal", "Royal", "Georgia", "72", "&H00FFD0A0", "&H00400020", "3", "2", "0", None),
    ("pixel_block", "Pixel Block", "Courier New", "68", "&H00FFFFFF", "&H00000000", "4", "0", "-1", None),
    ("glow_white", "Glow White", "Arial Black", "82", "&H00FFFFFF", "&H00AAAAAA", "3", "3", "-1", None),
    ("shadow_heavy", "Shadow Heavy", "Arial Black", "78", "&H00FFFFFF", "&H00000000", "4", "6", "-1", None),
    ("caption_bar", "Caption Bar", "Arial", "60", "&H00FFFFFF", "&H00000000", "0", "0", "-1", {"border_style": "3", "back": "&HD0000000", "align": "2"}),
    ("duo_cyan", "Duo Cyan", "Arial Black", "78", "&H00FFE080", "&H00FF4080", "4", "1", "-1", None),
    ("magma", "Magma", "Impact", "84", "&H000055FF", "&H00000040", "6", "1", "-1", None),
    ("frost", "Frost", "Arial", "72", "&H00FFF8F0", "&H00806040", "3", "1", "0", None),
    ("acid", "Acid", "Arial Black", "80", "&H0000FF00", "&H00000000", "5", "0", "-1", None),
    ("cinema_lower", "Cinema Lower", "Georgia", "58", "&H00F5F5F5", "&H00000000", "0", "0", "0", {"border_style": "3", "back": "&HC0000000", "align": "2"}),
    ("ultra_bold", "Ultra Bold", "Impact", "94", "&H00FFFFFF", "&H00000000", "8", "0", "-1", None),
]

EXTRA_TEXT = [
    ("center_gold", "72", "0xFFD400", "5", "black", "(w-text_w)/2", "(h-text_h)/2"),
    ("top_banner", "60", "white", "4", "black", "(w-text_w)/2", "h*0.1"),
    ("mid_left", "64", "white", "4", "black", "w*0.06", "(h-text_h)/2"),
    ("mid_right", "64", "0x66FFE0", "4", "black", "w-text_w-w*0.06", "(h-text_h)/2"),
    ("bottom_wide", "58", "white", "4", "black", "(w-text_w)/2", "h*0.85"),
    ("hook_center", "88", "0xE8A54B", "7", "black", "(w-text_w)/2", "h*0.38"),
    ("tiny_top", "34", "white@0.9", "2", "black", "(w-text_w)/2", "h*0.06"),
    ("stamp_br", "44", "0xFF6688", "3", "black", "w-text_w-w*0.05", "h*0.88"),
    ("stamp_bl", "44", "0x88FFAA", "3", "black", "w*0.05", "h*0.88"),
    ("mega_top", "100", "white", "9", "black", "(w-text_w)/2", "h*0.2"),
    ("soft_caption", "50", "white", "2", "black", "(w-text_w)/2", "h*0.8"),
    ("boxed_center", "56", "white", "0", "black", "(w-text_w)/2", "(h-text_h)/2"),
    ("kinetic_top", "80", "0x66FFE0", "6", "black", "(w-text_w)/2", "h*0.22"),
    ("kinetic_low", "80", "0xFF88CC", "6", "black", "(w-text_w)/2", "h*0.7"),
    ("side_stack_l", "62", "white", "4", "black", "w*0.05", "h*0.35"),
    ("side_stack_r", "62", "white", "4", "black", "w-text_w-w*0.05", "h*0.35"),
    ("credit_right", "32", "white@0.8", "2", "black", "w-text_w-w*0.04", "h*0.94"),
    ("credit_left", "32", "white@0.8", "2", "black", "w*0.04", "h*0.94"),
    ("warn_center", "76", "0xFFCC00", "6", "black", "(w-text_w)/2", "(h-text_h)/2"),
    ("cta_center", "68", "0xE8A54B", "5", "black", "(w-text_w)/2", "h*0.55"),
    ("cta_top", "60", "0xE8A54B", "4", "black", "(w-text_w)/2", "h*0.14"),
    ("word_top", "96", "white", "8", "black", "(w-text_w)/2", "h*0.28"),
    ("word_low", "96", "white", "8", "black", "(w-text_w)/2", "h*0.62"),
    ("outline_only", "74", "black", "6", "white", "(w-text_w)/2", "(h-text_h)/2"),
    ("neon_mid", "70", "0xFF66FF", "4", "black", "(w-text_w)/2", "h*0.45"),
    ("cyan_mid", "70", "0x66E0FF", "4", "black", "(w-text_w)/2", "h*0.45"),
    ("lime_mid", "70", "0x99FF00", "4", "black", "(w-text_w)/2", "h*0.45"),
    ("serif_center", "66", "0xF8F8F8", "3", "black", "(w-text_w)/2", "(h-text_h)/2"),
    ("serif_bottom", "54", "0xF8F8F8", "3", "black", "(w-text_w)/2", "h*0.78"),
    ("poster_center", "110", "white", "10", "black", "(w-text_w)/2", "(h-text_h)/2"),
    ("thin_top", "48", "white", "2", "black", "(w-text_w)/2", "h*0.12"),
    ("thin_bottom", "48", "white", "2", "black", "(w-text_w)/2", "h*0.86"),
    ("box_top", "52", "white", "0", "black", "(w-text_w)/2", "h*0.16"),
    ("box_mid", "52", "white", "0", "black", "(w-text_w)/2", "h*0.48"),
    ("impact_mid", "90", "white", "8", "black", "(w-text_w)/2", "h*0.4"),
    ("impact_low", "90", "0xFFA500", "8", "black", "(w-text_w)/2", "h*0.65"),
    ("float_ul", "50", "white", "3", "black", "w*0.08", "h*0.12"),
    ("float_ur", "50", "white", "3", "black", "w-text_w-w*0.08", "h*0.12"),
    ("float_ll", "50", "white", "3", "black", "w*0.08", "h*0.82"),
    ("float_lr", "50", "white", "3", "black", "w-text_w-w*0.08", "h*0.82"),
    ("chapter", "58", "0xE8A54B", "4", "black", "(w-text_w)/2", "h*0.3"),
    ("subtitle_safe", "46", "white", "3", "black", "(w-text_w)/2", "h*0.82"),
    ("brand_tag", "40", "0xE8A54B", "2", "black", "(w-text_w)/2", "h*0.9"),
]


def patch_fx_library(text: str) -> str:
    marker_eff = '    "night_neon": "eq=contrast=1.24:saturation=1.4:brightness=-0.02:gamma_b=1.15,vignette=PI/3.2,unsharp=5:5:1.0:5:5:0.0",\n}'
    if "crimson_rush" not in text:
        extra = ",\n".join(f'    "{k}": "{v}"' for k, v in EXTRA_EFFECTS.items())
        text = text.replace(
            marker_eff,
            marker_eff[:-2] + ",\n" + extra + ",\n}",
        )

    motion_end = '''    {
        "id": "smash_cut_zoom",
        "zoom": "if(lt(on,4),1.6-on*0.12,min(1.18+0.0006*on,1.3))",
        "x": "iw/2-(iw/zoom/2)+if(lt(on,4),sin(on*5)*10,0)",
        "y": "ih/2-(ih/zoom/2)",
        "eq": "eq=contrast=1.2:saturation=1.3:brightness=0.05",
    },
]'''
    if "spin_in" not in text:
        blocks = []
        for mid, z, x, y, eq in EXTRA_MOTIONS:
            blocks.append(
                "    {\n"
                f'        "id": "{mid}",\n'
                f'        "zoom": "{z}",\n'
                f'        "x": "{x}",\n'
                f'        "y": "{y}",\n'
                f'        "eq": "{eq}",\n'
                "    },"
            )
        text = text.replace(motion_end, motion_end[:-1] + "\n" + "\n".join(blocks) + "\n]")

    sub_end = '''    "bold_white": {
        "name": "Bold White",
        "font": "Impact",
        "size": "88",
        "primary": "&H00FFFFFF",
        "outline": "&H00000000",
        "outline_w": "7",
        "shadow": "0",
        "bold": "-1",
    },
}'''
    if "hot_pink" not in text:
        chunks = []
        for row in EXTRA_SUBS:
            sid, name, font, size, primary, outline, ow, shadow, bold, extra = row
            body = (
                f'    "{sid}": {{\n'
                f'        "name": "{name}",\n'
                f'        "font": "{font}",\n'
                f'        "size": "{size}",\n'
                f'        "primary": "{primary}",\n'
                f'        "outline": "{outline}",\n'
                f'        "outline_w": "{ow}",\n'
                f'        "shadow": "{shadow}",\n'
                f'        "bold": "{bold}",\n'
            )
            if extra:
                for k, v in extra.items():
                    body += f'        "{k}": "{v}",\n'
            body += "    },"
            chunks.append(body)
        text = text.replace(sub_end, sub_end[:-1] + "\n" + "\n".join(chunks) + "\n}")

    text_end = '''    "word_slam": {
        "fontsize": "102",
        "fontcolor": "white",
        "borderw": "9",
        "bordercolor": "black",
        "x": "(w-text_w)/2",
        "y": "h*0.36",
    },
}'''
    if "center_gold" not in text:
        chunks = []
        boxed = {"boxed_center", "box_top", "box_mid"}
        for tid, fs, fc, bw, bc, x, y in EXTRA_TEXT:
            body = (
                f'    "{tid}": {{\n'
                f'        "fontsize": "{fs}",\n'
                f'        "fontcolor": "{fc}",\n'
                f'        "borderw": "{bw}",\n'
                f'        "bordercolor": "{bc}",\n'
            )
            if tid in boxed:
                body += '        "box": "1",\n        "boxcolor": "black@0.55",\n        "boxborderw": "14",\n'
            body += (
                f'        "x": "{x}",\n'
                f'        "y": "{y}",\n'
                "    },"
            )
            chunks.append(body)
        text = text.replace(text_end, text_end[:-1] + "\n" + "\n".join(chunks) + "\n}")

    helper = '''
def catalog_prompt_block() -> str:
    """Compact tool list for LLM system prompts (effects / subs / motions / text)."""
    effects = [k for k in EFFECT_FILTERS.keys() if k != "none"]
    motions = [m["id"] for m in MOTION_PRESETS]
    subs = list(SUBTITLE_STYLES.keys())
    texts = list(TEXT_STYLES.keys())
    transitions = list(TRANSITION_LIBRARY) if "TRANSITION_LIBRARY" in globals() else []
    return (
        "AVAILABLE TOOLS (pick only these ids):\\n"
        f"- visual_effect ({len(effects)}): {', '.join(effects)}\\n"
        f"- subtitle_style ({len(subs)}): {', '.join(subs)}\\n"
        f"- motion ({len(motions)}): {', '.join(motions)}\\n"
        f"- text_style ({len(texts)}): {', '.join(texts)}\\n"
        + (f"- preferred_transition: {', '.join(transitions)}\\n" if transitions else "")
    )
'''
    if "def catalog_prompt_block" not in text:
        text = text.rstrip() + "\n" + helper + "\n"
    return text


def patch_editor_catalog(text: str) -> str:
    if "crimson_rush" not in text:
        lines = []
        for k, label in EXTRA_EFFECT_LABELS.items():
            lines.append(
                f'  {{ id: "{k}", label: "{label}", css: "contrast(1.1) saturate(1.15)" }},'
            )
        text = text.replace(
            '  { id: "night_neon", label: "Night neon", css: "contrast(1.24) saturate(1.4) brightness(0.98) hue-rotate(15deg)" },\n] as const;',
            '  { id: "night_neon", label: "Night neon", css: "contrast(1.24) saturate(1.4) brightness(0.98) hue-rotate(15deg)" },\n'
            + "\n".join(lines)
            + "\n] as const;",
        )

    if "spin_in" not in text:
        lines = [f'  {{ id: "{mid}", label: "{MOTION_LABELS[mid]}" }},' for mid, *_ in EXTRA_MOTIONS]
        text = text.replace(
            '  { id: "smash_cut_zoom", label: "Smash cut zoom" },\n] as const;',
            '  { id: "smash_cut_zoom", label: "Smash cut zoom" },\n'
            + "\n".join(lines)
            + "\n] as const;",
        )

    if "hot_pink" not in text:
        lines = [f'  {{ id: "{row[0]}", label: "{row[1]}" }},' for row in EXTRA_SUBS]
        text = text.replace(
            '  { id: "bold_white", label: "Bold white" },\n] as const;',
            '  { id: "bold_white", label: "Bold white" },\n'
            + "\n".join(lines)
            + "\n] as const;",
        )

    if "center_gold" not in text:
        labels = {
            "center_gold": "Center gold",
            "top_banner": "Top banner",
            "mid_left": "Mid left",
            "mid_right": "Mid right",
            "bottom_wide": "Bottom wide",
            "hook_center": "Hook center",
            "tiny_top": "Tiny top",
            "stamp_br": "Stamp BR",
            "stamp_bl": "Stamp BL",
            "mega_top": "Mega top",
            "soft_caption": "Soft caption",
            "boxed_center": "Boxed center",
            "kinetic_top": "Kinetic top",
            "kinetic_low": "Kinetic low",
            "side_stack_l": "Side stack L",
            "side_stack_r": "Side stack R",
            "credit_right": "Credit right",
            "credit_left": "Credit left",
            "warn_center": "Warn center",
            "cta_center": "CTA center",
            "cta_top": "CTA top",
            "word_top": "Word top",
            "word_low": "Word low",
            "outline_only": "Outline only",
            "neon_mid": "Neon mid",
            "cyan_mid": "Cyan mid",
            "lime_mid": "Lime mid",
            "serif_center": "Serif center",
            "serif_bottom": "Serif bottom",
            "poster_center": "Poster center",
            "thin_top": "Thin top",
            "thin_bottom": "Thin bottom",
            "box_top": "Box top",
            "box_mid": "Box mid",
            "impact_mid": "Impact mid",
            "impact_low": "Impact low",
            "float_ul": "Float UL",
            "float_ur": "Float UR",
            "float_ll": "Float LL",
            "float_lr": "Float LR",
            "chapter": "Chapter",
            "subtitle_safe": "Subtitle safe",
            "brand_tag": "Brand tag",
        }
        lines = [f'  {{ id: "{tid}", label: "{labels[tid]}" }},' for tid, *_ in EXTRA_TEXT]
        text = text.replace(
            '  { id: "word_slam", label: "Word slam" },\n] as const;',
            '  { id: "word_slam", label: "Word slam" },\n'
            + "\n".join(lines)
            + "\n] as const;",
        )
    return text


def patch_presets(text: str) -> str:
    if "crimson_rush" in text:
        return text
    lines = [f'  {{ value: "{k}", label: "{v}" }},' for k, v in EXTRA_EFFECT_LABELS.items()]
    return text.replace(
        '  { value: "night_neon", label: "Night neon" },\n  { value: "none", label: "None" },\n];',
        '  { value: "night_neon", label: "Night neon" },\n'
        + "\n".join(lines)
        + '\n  { value: "none", label: "None" },\n];',
    )


def main() -> None:
    FX.write_text(patch_fx_library(FX.read_text(encoding="utf-8")), encoding="utf-8")
    CAT.write_text(patch_editor_catalog(CAT.read_text(encoding="utf-8")), encoding="utf-8")
    PRESETS.write_text(patch_presets(PRESETS.read_text(encoding="utf-8")), encoding="utf-8")
    print("expanded catalogs ok")
    print("effects+", len(EXTRA_EFFECTS), "motions+", len(EXTRA_MOTIONS), "subs+", len(EXTRA_SUBS), "text+", len(EXTRA_TEXT))


if __name__ == "__main__":
    main()
