import Phaser from 'phaser';
import {
    DRAGON_ATTACK_FPS,
    DRAGON_IDLE_BATTLE_PREFIX,
    DRAGON_ROAR_PREFIX,
    DRAGON_WALK_PREFIX,
    MAP2_DRAGON_ATTACK_ANIM_KEY,
    MAP2_DRAGON_ATTACK_FX_ANIM_KEY,
    MAP2_DRAGON_ATTACK_FX_KEY,
    MAP2_CLASH_ANIM_KEY,
    MAP2_CLASH_KEY,
    MAP2_DRAGON_FIREBALL_LOOP_ANIM_KEY,
    MAP2_DRAGON_ATTACK_KEY,
    MAP2_DRAGON_KEY,
    MAP2_DRAGON_IDLE_KEY,
    MAP2_DRAGON_WALK_ANIM_KEY,
    MAP2_DRAGON_WALK_KEY,
    MAP2_CAT_SUPER_HOLD_ANIM_KEY,
    MAP2_CAT_SUPER_RELEASE_ANIM_KEY,
    MAP2_PLAYER2_IDLE_ANIM_KEY,
    MAP2_PLAYER2_IDLE_KEY,
    MAP2_PLAYER2_JUMP_ANIM_KEY,
    MAP2_PLAYER2_JUMP_KEY,
    MAP2_PLAYER2_KEY,
    MAP2_PLAYER2_WALK_ANIM_KEY,
    MAP2_PLAYER2_WALK_KEY,
    MAP2_UI_KEY,
} from './handle.map2.constants.js';

export type Map2DragonAnimKeys = {
    dragonFramePrefix: string;
    dragonAnimKey: string;
    dragonIdleAnimKey: string;
};

export function registerMap2Anims(
    scene: Phaser.Scene,
    dragon: Map2DragonAnimKeys,
): void {
    if (!scene.anims.exists('ninja_run')) {
        scene.anims.create({
            key: 'ninja_run',
            frames: scene.anims.generateFrameNames('player', {
                prefix: 'ninja cat/run/ninja-run_',
                start: 0,
                end: 11,
                suffix: '.png',
                zeroPad: 2,
            }),
            frameRate: 12,
            repeat: -1,
        });
    }
    if (!scene.anims.exists('ninja_run_intro_once')) {
        scene.anims.create({
            key: 'ninja_run_intro_once',
            frames: scene.anims.generateFrameNames('player', {
                prefix: 'ninja cat/run/ninja-run_',
                start: 0,
                end: 11,
                suffix: '.png',
                zeroPad: 2,
            }),
            frameRate: 12,
            repeat: 0,
        });
    }
    if (!scene.anims.exists('ninja_jump')) {
        scene.anims.create({
            key: 'ninja_jump',
            frames: scene.anims.generateFrameNames('player', {
                prefix: 'ninja cat/pull lever/ninja-pull lever_',
                start: 0,
                end: 14,
                suffix: '.png',
                zeroPad: 2,
            }),
            frameRate: 18,
            repeat: 0,
        });
    }
    if (!scene.anims.exists('ninja_slash')) {
        scene.anims.create({
            key: 'ninja_slash',
            frames: scene.anims.generateFrameNames('player', {
                prefix: 'ninja cat/slash/ninja-slash_',
                start: 0,
                end: 11,
                suffix: '.png',
                zeroPad: 2,
            }),
            frameRate: 22,
            repeat: 0,
        });
    }
    if (!scene.anims.exists('ninja_die')) {
        scene.anims.create({
            key: 'ninja_die',
            frames: scene.anims.generateFrameNames('player', {
                prefix: 'ninja cat/die/ninja-die_',
                start: 0,
                end: 18,
                suffix: '.png',
                zeroPad: 2,
            }),
            frameRate: 14,
            repeat: 0,
        });
    }
    if (!scene.anims.exists('bird_fly')) {
        scene.anims.create({
            key: 'bird_fly',
            frames: scene.anims.generateFrameNames('bird_atlas', {
                prefix: 'bird/map1_bird_fly_',
                start: 0,
                end: 5,
                suffix: '.png',
                zeroPad: 2,
            }),
            frameRate: 10,
            repeat: -1,
        });
    }
    if (!scene.anims.exists('hoi_sinh_cutscene')) {
        scene.anims.create({
            key: 'hoi_sinh_cutscene',
            frames: scene.anims.generateFrameNames(MAP2_UI_KEY, {
                prefix: 'hoi_sinh_',
                start: 0,
                end: 47,
                suffix: '.png',
                zeroPad: 2,
            }),
            frameRate: 18,
            repeat: 0,
        });
    }
    if (
        scene.textures.exists(MAP2_DRAGON_KEY) &&
        !scene.anims.exists(dragon.dragonAnimKey)
    ) {
        const dragonTexture = scene.textures.get(MAP2_DRAGON_KEY);
        const allRoarFrameNames = dragonTexture.getFrameNames();
        const roarFrames = allRoarFrameNames
            .filter(
                (name) =>
                    name.startsWith(dragon.dragonFramePrefix) ||
                    name.includes(`/${dragon.dragonFramePrefix}`),
            )
            .sort((a, b) => {
                const na = Number(a.replace(/\D+/g, ''));
                const nb = Number(b.replace(/\D+/g, ''));
                return na - nb;
            })
            .map((frame) => ({ key: MAP2_DRAGON_KEY, frame }));
        console.log('[Map2] Dragon roar atlas loaded', {
            allFrameCount: allRoarFrameNames.length,
            roarFrameCount: roarFrames.length,
            firstRoarFrame: roarFrames[0]?.frame ?? null,
            lastRoarFrame: roarFrames[roarFrames.length - 1]?.frame ?? null,
            animKey: dragon.dragonAnimKey,
        });
        if (roarFrames.length > 0) {
            scene.anims.create({
                key: dragon.dragonAnimKey,
                frames: roarFrames,
                frameRate: 10,
                repeat: 0,
            });
        } else {
            console.warn(
                '[Map2] Dragon roar animation has 0 frames. Check roar atlas frame names/prefix.',
            );
        }
    }
    if (
        scene.textures.exists(MAP2_DRAGON_IDLE_KEY) &&
        !scene.anims.exists(dragon.dragonIdleAnimKey)
    ) {
        const idleFrames = scene.textures
            .get(MAP2_DRAGON_IDLE_KEY)
            .getFrameNames()
            .filter((name) => name.startsWith(DRAGON_IDLE_BATTLE_PREFIX))
            .sort((a, b) => {
                const na = Number(a.replace(/\D+/g, ''));
                const nb = Number(b.replace(/\D+/g, ''));
                return na - nb;
            })
            .map((frame) => ({ key: MAP2_DRAGON_IDLE_KEY, frame }));
        console.log('[Map2] Dragon idle atlas loaded', {
            idleFrameCount: idleFrames.length,
            firstIdleFrame: idleFrames[0]?.frame ?? null,
            lastIdleFrame: idleFrames[idleFrames.length - 1]?.frame ?? null,
            animKey: dragon.dragonIdleAnimKey,
        });
        if (idleFrames.length > 0) {
            scene.anims.create({
                key: dragon.dragonIdleAnimKey,
                frames: idleFrames,
                frameRate: 10,
                repeat: -1,
            });
        }
    }
    if (
        scene.textures.exists(MAP2_DRAGON_WALK_KEY) &&
        !scene.anims.exists(MAP2_DRAGON_WALK_ANIM_KEY)
    ) {
        scene.anims.create({
            key: MAP2_DRAGON_WALK_ANIM_KEY,
            frames: scene.anims.generateFrameNames(MAP2_DRAGON_WALK_KEY, {
                prefix: DRAGON_WALK_PREFIX,
                start: 0,
                end: 99,
                suffix: '.png',
                zeroPad: 2,
            }),
            frameRate: 14,
            repeat: -1,
        });
    }
    if (
        scene.textures.exists(MAP2_DRAGON_ATTACK_KEY) &&
        !scene.anims.exists(MAP2_DRAGON_ATTACK_ANIM_KEY)
    ) {
        scene.anims.create({
            key: MAP2_DRAGON_ATTACK_ANIM_KEY,
            frames: scene.anims.generateFrameNames(MAP2_DRAGON_ATTACK_KEY, {
                prefix: 'dragon_attack_',
                start: 0,
                end: 99,
                suffix: '.png',
                zeroPad: 2,
            }),
            frameRate: DRAGON_ATTACK_FPS,
            repeat: 0,
        });
    }
    if (
        scene.textures.exists(MAP2_DRAGON_ATTACK_FX_KEY) &&
        !scene.anims.exists(MAP2_DRAGON_ATTACK_FX_ANIM_KEY)
    ) {
        const fxFrames = scene.textures
            .get(MAP2_DRAGON_ATTACK_FX_KEY)
            .getFrameNames()
            .filter((name) => name.startsWith('attack_effect/dragon_attack_effect_'))
            .sort((a, b) => {
                const na = Number(a.replace(/\D+/g, ''));
                const nb = Number(b.replace(/\D+/g, ''));
                return na - nb;
            })
            .map((frame) => ({ key: MAP2_DRAGON_ATTACK_FX_KEY, frame }));
        if (fxFrames.length === 0) {
            return;
        }
        scene.anims.create({
            key: MAP2_DRAGON_ATTACK_FX_ANIM_KEY,
            frames: fxFrames,
            frameRate: 28,
            repeat: 0,
        });
    }
    if (
        scene.textures.exists(MAP2_DRAGON_ATTACK_FX_KEY) &&
        !scene.anims.exists(MAP2_DRAGON_FIREBALL_LOOP_ANIM_KEY)
    ) {
        const fxLoopFramesAll = scene.textures
            .get(MAP2_DRAGON_ATTACK_FX_KEY)
            .getFrameNames()
            .filter((name) => name.startsWith('attack_effect/dragon_attack_effect_'))
            .sort((a, b) => {
                const na = Number(a.replace(/\D+/g, ''));
                const nb = Number(b.replace(/\D+/g, ''));
                return na - nb;
            })
            .map((frame) => ({ key: MAP2_DRAGON_ATTACK_FX_KEY, frame }));
        if (fxLoopFramesAll.length === 0) {
            return;
        }
        const startIdx = Math.max(0, fxLoopFramesAll.length - 3);
        const fxLoopFrames = fxLoopFramesAll.slice(startIdx);
        scene.anims.create({
            key: MAP2_DRAGON_FIREBALL_LOOP_ANIM_KEY,
            frames: fxLoopFrames,
            frameRate: 22,
            repeat: -1,
        });
    }
    if (
        scene.textures.exists(MAP2_CLASH_KEY) &&
        !scene.anims.exists(MAP2_CLASH_ANIM_KEY)
    ) {
        const clashFrames = scene.textures
            .get(MAP2_CLASH_KEY)
            .getFrameNames()
            .filter((name) => name.startsWith('clash/clash_animation_'))
            .sort((a, b) => {
                const na = Number(a.replace(/\D+/g, ''));
                const nb = Number(b.replace(/\D+/g, ''));
                return na - nb;
            })
            .map((frame) => ({ key: MAP2_CLASH_KEY, frame }));
        if (clashFrames.length > 0) {
            scene.anims.create({
                key: MAP2_CLASH_ANIM_KEY,
                frames: clashFrames,
                frameRate: 24,
                repeat: 0,
            });
        }
    }
    if (!scene.anims.exists(MAP2_CAT_SUPER_HOLD_ANIM_KEY)) {
        scene.anims.create({
            key: MAP2_CAT_SUPER_HOLD_ANIM_KEY,
            frames: scene.anims.generateFrameNames(MAP2_PLAYER2_KEY, {
                prefix: 'cat_super_',
                start: 0,
                end: 7,
                suffix: '.png',
                zeroPad: 2,
            }),
            frameRate: 14,
            repeat: -1,
        });
    }
    if (!scene.anims.exists(MAP2_CAT_SUPER_RELEASE_ANIM_KEY)) {
        scene.anims.create({
            key: MAP2_CAT_SUPER_RELEASE_ANIM_KEY,
            frames: scene.anims.generateFrameNames(MAP2_PLAYER2_KEY, {
                prefix: 'cat_super_',
                start: 8,
                end: 14,
                suffix: '.png',
                zeroPad: 2,
            }),
            frameRate: 16,
            repeat: 0,
        });
    }
    if (!scene.anims.exists('cat_normal_run')) {
        scene.anims.create({
            key: 'cat_normal_run',
            frames: scene.anims.generateFrameNames(MAP2_PLAYER2_KEY, {
                prefix: 'cat_normal_',
                start: 0,
                end: 13,
                suffix: '.png',
                zeroPad: 2,
            }),
            frameRate: 14,
            repeat: -1,
        });
    }
    if (
        scene.textures.exists(MAP2_PLAYER2_IDLE_KEY) &&
        !scene.anims.exists(MAP2_PLAYER2_IDLE_ANIM_KEY)
    ) {
        scene.anims.create({
            key: MAP2_PLAYER2_IDLE_ANIM_KEY,
            frames: scene.anims.generateFrameNames(MAP2_PLAYER2_IDLE_KEY, {
                prefix: 'cat_idle/cat_idle_',
                start: 0,
                end: 3,
                suffix: '.png',
                zeroPad: 2,
            }),
            frameRate: 8,
            repeat: -1,
        });
    }
    if (
        scene.textures.exists(MAP2_PLAYER2_WALK_KEY) &&
        !scene.anims.exists(MAP2_PLAYER2_WALK_ANIM_KEY)
    ) {
        scene.anims.create({
            key: MAP2_PLAYER2_WALK_ANIM_KEY,
            frames: scene.anims.generateFrameNames(MAP2_PLAYER2_WALK_KEY, {
                prefix: 'cat_walk/cat_walk_',
                start: 0,
                end: 3,
                suffix: '.png',
                zeroPad: 2,
            }),
            frameRate: 10,
            repeat: -1,
        });
    }
    if (
        scene.textures.exists(MAP2_PLAYER2_JUMP_KEY) &&
        !scene.anims.exists(MAP2_PLAYER2_JUMP_ANIM_KEY)
    ) {
        scene.anims.create({
            key: MAP2_PLAYER2_JUMP_ANIM_KEY,
            frames: scene.anims.generateFrameNames(MAP2_PLAYER2_JUMP_KEY, {
                prefix: 'cat_jump/cat_jump_',
                start: 0,
                end: 11,
                suffix: '.png',
                zeroPad: 2,
            }),
            frameRate: 16,
            repeat: -1,
        });
    }
}
