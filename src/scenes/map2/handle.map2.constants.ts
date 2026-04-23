/** Hằng số & key asset Map2 — tách khỏi scene để dễ chỉnh. */

export const MAP2_BG_KEY = 'bg_map2';
export const MAP2_PLAYER2_KEY = 'map2_player2';
export const MAP2_PLAYER2_IDLE_KEY = 'map2_player2_idle';
export const MAP2_PLAYER2_WALK_KEY = 'map2_player2_walk';
export const MAP2_PLAYER2_JUMP_KEY = 'map2_player2_jump';
export const MAP2_PLAYER2_IDLE_ANIM_KEY = 'map2_player2_idle_loop';
export const MAP2_PLAYER2_WALK_ANIM_KEY = 'map2_player2_walk_loop';
export const MAP2_PLAYER2_JUMP_ANIM_KEY = 'map2_player2_jump_loop';
/** player2.json cat_super_00..07 — gồng (lặp). */
export const MAP2_CAT_SUPER_HOLD_ANIM_KEY = 'cat_super_hold';
/** player2.json cat_super_08..14 — xả chiêu (một lần). */
export const MAP2_CAT_SUPER_RELEASE_ANIM_KEY = 'cat_super_release';
export const MAP2_UI_KEY = 'map2_ui_cutscene';
export const MAP2_DRAGON_KEY = 'map2_dragon';
export const MAP2_DRAGON_IDLE_KEY = 'map2_dragon_idle';
export const MAP2_DRAGON_WALK_KEY = 'map2_dragon_walk';
export const MAP2_DRAGON_WALK_ANIM_KEY = 'map2_dragon_walk_loop';
export const MAP2_DRAGON_ATTACK_KEY = 'map2_dragon_attack';
export const MAP2_DRAGON_ATTACK_FX_KEY = 'map2_dragon_attack_fx';
export const MAP2_CLASH_KEY = 'map2_clash';
export const MAP2_DRAGON_ATTACK_ANIM_KEY = 'map2_dragon_attack_once';
export const MAP2_DRAGON_ATTACK_FX_ANIM_KEY = 'map2_dragon_attack_fx_once';
export const MAP2_CLASH_ANIM_KEY = 'map2_clash_once';
/** Đạn bay: lặp vài frame cuối của attack_effect để lửa chuyển động. */
export const MAP2_DRAGON_FIREBALL_LOOP_ANIM_KEY = 'map2_dragon_fireball_loop';
export const DRAGON_ROAR_PREFIX = 'dragon_roar_';
export const DRAGON_IDLE_BATTLE_PREFIX = 'dragon_battle_';
export const DRAGON_WALK_PREFIX = 'dragon_walking_';
export const DRAGON_ROAR_REQUIRED_TEXTURE_SIZE = 8724;
export const MAP2_BG_HEIGHT_PX = 546;
export const MAP2_GROUND_Y_PX = 486;
export const MAP2_GROUND_RATIO = MAP2_GROUND_Y_PX / MAP2_BG_HEIGHT_PX;
export const NINJA_FOOT_OFFSET_Y = 44;
export const CAT_SUPER_FOOT_OFFSET_Y = 44;
/** Chân dragon: căn với cat rồi nâng thêm 44px (giảm offset Y). */
export const DRAGON_FOOT_OFFSET_Y = NINJA_FOOT_OFFSET_Y - 84;
/** Cat đối kháng (bộ frame mới): căn cùng mốc chân với rồng để không "trôi" theo atlas trim. */
export const FIGHT_CAT_FOOT_OFFSET_Y = DRAGON_FOOT_OFFSET_Y;
export const SHOW_GROUND_DEBUG_LINE = false;
export const BIRD_START_OFFSET_X = 140;
export const BIRD_START_OFFSET_Y = -136;
export const NINJA_FOCUS_EXTRA_Y = 0;
export const CAT_SUPER_OFFSET_X = 550;
export const CAT_SUPER_OFFSET_Y = 0;
export const CAT_SUPER_SCALE = 3.0;
export const CAT_SUPER_MIN_X_MARGIN = 90;
export const CAT_SUPER_MAX_X_MARGIN = 90;
export const MID_ZOOM = 1.06;
export const MID_ZOOM_DURATION_MS = 850;
export const CAT_SUPER_ZOOM = 1.58;
export const CAT_SUPER_ZOOM_DURATION_MS = 1000;
export const NINJA_INTRO_ZOOM = 1.32;
export const NINJA_INTRO_DURATION_MS = 1000;
export const BIRD_RUNIN_DURATION_MS = 1000;
export const NINJA_RUNIN_DURATION_MS = 1000;
export const RUNIN_CAMERA_TRACK_BIAS_Y = -20;
export const RUNIN_EASE = 'Sine.easeInOut';
export const RUN_ANIM_FALLBACK_MS = 1400;
export const EFFECT_TRACK_ZOOM = 1.66;
export const BIRD_FOCUS_ZOOM = 1.46;
export const BIRD_FOCUS_DURATION_MS = 760;
export const EFFECT_OFFSET_X = 5;
export const EFFECT_OFFSET_Y = -12;
export const EFFECT_HIT_OFFSET_X = 8;
export const EFFECT_HIT_OFFSET_Y = -42;
export const EFFECT_SCALE = 4.2;
export const EFFECT_FRAME_SWAP_MS = 70;
export const EFFECT_TRAVEL_DURATION_MS = 420;
export const EFFECT_SPEED_PX_PER_SEC = 600;
export const UI_BASE_SIZE_PX = 384;
export const UI_WIDTH_RATIO = 0.42;
export const UI_HEIGHT_RATIO = 0.55;
export const WHITE_FLASH_IN_MS = 260;
export const WHITE_FLASH_OUT_MS = 520;
export const CUTSCENE_RELEASE_DELAY_MS = 450;
export const DRAGON_BASE_WIDTH_PX = 725;
export const DRAGON_BASE_HEIGHT_PX = 445;
export const DRAGON_WIDTH_RATIO = 0.38;
export const DRAGON_HEIGHT_RATIO = 0.42;
/** Đối kháng Map2: bố cục theo thiết kế 960px rộng. */
export const MAP2_DESIGN_WIDTH = 960;
export const FIGHT_DRAGON_X_FRAC = 200 / MAP2_DESIGN_WIDTH;
export const FIGHT_NINJA_X_FRAC = 800 / MAP2_DESIGN_WIDTH;
export const DRAGON_WALK_PX_PER_SEC = 155;
export const DRAGON_BACK_PX_PER_SEC = 135;
export const DRAGON_FIGHT_X_MIN_FRAC = 0.06;
export const DRAGON_FIGHT_X_MAX_FRAC = 0.62;
export const FIREBALL_SPEED_PX_PER_SEC = 520;
/** Chưởng mèo bay chậm hơn để giữ effect lâu hơn trên màn. */
export const CAT_EFFECT_PROJECTILE_SPEED_PX_PER_SEC = 260;
export const FIREBALL_DAMAGE = 9;
export const SLASH_DAMAGE_DRAGON = 12;
export const VERSUS_HP_MAX = 100;
export const NINJA_MANA_MAX = 100;
export const MANA_SLASH_COST = 18;
export const NINJA_MANA_REGEN_PER_SEC = 14;
export const FIREBALL_COOLDOWN_MS = 380;
export const DRAGON_ATTACK_FPS = 32;
/** Hitbox Cat đối kháng: cắt bỏ phần trong suốt quanh sprite. */
export const FIGHT_CAT_HITBOX_WIDTH = 40;
export const FIGHT_CAT_HITBOX_HEIGHT = 60;
export const FIGHT_CAT_HITBOX_OFFSET_X = 30;
export const FIGHT_CAT_HITBOX_OFFSET_Y = 20;
export const FIGHT_CAT_MOVE_PX_PER_SEC = 165;
export const FIGHT_CAT_X_MIN_FRAC = 0.52;
export const FIGHT_CAT_X_MAX_FRAC = 0.94;
export const FIGHT_CAT_MOVE_DEADZONE = 0.06;
/** Nắm tay super: kéo sprite Cat lên lại để khớp chân với các anim còn lại. */
export const FIGHT_CAT_SUPER_Y_ADJUST = -22;
/** Cat nhảy (2 ngón): nâng chân lên cao để né đường đạn rồng. */
export const FIGHT_CAT_JUMP_Y_ADJUST = -150;
/** Điểm phóng cat_effect_super tinh chỉnh theo tâm Cat hiện tại. */
export const FIGHT_CAT_EFFECT_SPAWN_X_BIAS = -20;
export const FIGHT_CAT_EFFECT_SPAWN_Y_BIAS = 3;
export const FIGHT_CAT_EFFECT_SCALE = 2.28;
/** Đạn rồng sống lâu hơn để nhìn rõ quỹ đạo/va chạm. */
export const MAP2_DRAGON_FIREBALL_LIFETIME_MS = 5000;
/** Hitbox đạn rồng tăng ~2/3 so với mức cũ (40 -> 66). */
export const MAP2_DRAGON_FIREBALL_HITBOX_SIZE = 66;
/** Tăng scale đạn rồng để không bị quá nhỏ trên võ đài. */
export const MAP2_DRAGON_FIREBALL_SCALE = 1.65;
/** Khóa chống gọi spawn quá dày do nhiễu event. */
export const MAP2_DRAGON_MIN_SPAWN_INTERVAL_MS = 240;
