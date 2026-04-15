import Phaser from 'phaser';

/** Layer nền map1 ổn định (không dùng layer3) */
export const MAP1_LAYER_INDICES = [0, 1, 2, 4] as const;
export const BG_SCROLL_X = [0.35, 0.75, 1.25, 3.8] as const;

export const CAT_FIXED_X = 150;
export const GROUND_MARGIN = 80;

export const BOTTOM_SPAWN_OFFSCREEN_PX = 12;
export const BOTTOM_MOVE_SPEED_X = -320;
export const DESTROY_OFFSCREEN_X = -100;
export const NINJA_JUMP_AIR_TIME_SEC = 1.0;

export const LIMBO_SPAWN_TOKEN = '__limbo_anim__';
export const MUSHROOM_SPAWN_TOKEN = '__mushroom_anim__';

/** Atlas keys */
export const BIRD_ATLAS_KEY = 'bird_atlas';
export const M1_ENEMIES_ATLAS_KEY = 'm1_enemies';
/** Spritesheet hiệu ứng biến mất khi enemy bị slash (map1_disappear.png + frame 0..20). */
export const MAP1_DISAPPEAR_SHEET_KEY = 'map1_disappear';

/** High lane scaling */
export const SHOOTER_ENEMY_ANIM_KEYS = new Set(['m1_air', 'm1_ufo']);
export const MAX_HIGH_BODY_WIDTH_PX = 400;

/** Bottom lane scaling */
export const BOTTOM_SCALES: Record<string, number> = {
    m1_spike: 0.36,
    m1_mushroom: 0.27,
    m1_limbo: 0.39,
    m1_tree_trunk: 0.57,
};
export const DEFAULT_BOTTOM_SCALE = 0.39;

type AtlasFrameMeta = {
    sourceSize?: { h: number };
    spriteSourceSize?: { x: number; y: number; w: number; h: number };
};

const BOTTOM_FEET_NUDGE_PX: Record<string, number> = {
    m1_spike: 2,
    m1_mushroom: 0,
    m1_limbo: 4,
    m1_tree_trunk: 0,
    default: 2,
};

export function inferBottomKindFromFrame(frameName: string): string {
    const name = frameName.toLowerCase();
    if (name.includes('spike')) {
        return 'm1_spike';
    }
    if (name.includes('mushroom')) {
        return 'm1_mushroom';
    }
    if (name.includes('limbo')) {
        return 'm1_limbo';
    }
    if (name.includes('tree')) {
        return 'm1_tree_trunk';
    }
    return 'default';
}

export function bottomTransparentPaddingSourcePx(
    frame: Phaser.Textures.Frame,
): number {
    const d = frame.customData as AtlasFrameMeta | undefined;
    if (!d?.sourceSize?.h || !d.spriteSourceSize) {
        return 0;
    }
    const ss = d.spriteSourceSize;
    return Math.max(0, d.sourceSize.h - ss.y - ss.h);
}

export function bottomFeetNudgePx(kind: string): number {
    return BOTTOM_FEET_NUDGE_PX[kind] ?? BOTTOM_FEET_NUDGE_PX.default;
}
