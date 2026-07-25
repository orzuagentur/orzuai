-- AI Training: persist montage look settings used by the worker
alter table public.ai_training
  add column if not exists visual_effect text not null default 'cinematic',
  add column if not exists preferred_transition text not null default '',
  add column if not exists montage_pace text not null default 'medium',
  add column if not exists flash_cuts boolean not null default false;

-- Normalize legacy subtitle ids so Training → worker stays consistent
update public.ai_training
set subtitle_style = 'karaoke_gold'
where subtitle_style in ('karaoke_bold', 'karaoke');

comment on column public.ai_training.visual_effect is
  'Color grade / look id from EFFECT_FILTERS (e.g. cinematic, punch, neon)';
comment on column public.ai_training.preferred_transition is
  'Preferred FFmpeg xfade name; empty = auto from montage pool';
comment on column public.ai_training.montage_pace is
  'viral | fast | medium | cinematic';
-- Expand default motion / transition pools for richer AI montage
update public.montage_settings
set
  enabled_motions = array[
    'punch_in','slow_push','rise','drift_left','drift_right','snap_zoom',
    'pull_out','tilt_up','tilt_down','handheld','orbit','crash_zoom',
    'whip_left','whip_right','breathe','reveal_up','zoom_out_punch',
    'vertigo','shake_hit','slide_diag','whip_zoom','parallax_drift',
    'snap_in','float_rise','orbit_soft','slow_dolly','impact_shake',
    'peek_left','peek_right'
  ],
  enabled_transitions = array[
    'fade','fadeblack','fadewhite','dissolve','pixelize','distance','radial','hblur',
    'wipeleft','wiperight','wipeup','wipedown','slideleft','slideright','slideup','slidedown',
    'smoothleft','smoothright','smoothup','smoothdown','circleopen','circleclose',
    'diagtl','diagtr','diagbl','diagbr','zoomin','squeezeh','squeezev'
  ]
where true;
