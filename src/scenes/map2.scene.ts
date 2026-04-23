import Phaser from 'phaser';
import { Bird, NinjaCat } from '../entities/handle.character.js';
import type { HandData, HandTracker } from '../core/handle.trackhand.js';
import { CAT_FIXED_X } from './map1-enemy.config.js';
import { registerMap2Anims } from './map2/handle.map2.anims.js';
import { scrollForWorldCenter } from './map2/handle.map2.camera.js';
import {
    BIRD_FOCUS_DURATION_MS,
    BIRD_FOCUS_ZOOM,
    BIRD_RUNIN_DURATION_MS,
    BIRD_START_OFFSET_X,
    BIRD_START_OFFSET_Y,
    CAT_SUPER_FOOT_OFFSET_Y,
    CAT_SUPER_MAX_X_MARGIN,
    CAT_SUPER_MIN_X_MARGIN,
    CAT_SUPER_OFFSET_X,
    CAT_SUPER_OFFSET_Y,
    CAT_SUPER_SCALE,
    CAT_SUPER_ZOOM,
    CAT_SUPER_ZOOM_DURATION_MS,
    CAT_EFFECT_PROJECTILE_SPEED_PX_PER_SEC,
    DRAGON_BASE_HEIGHT_PX,
    DRAGON_BASE_WIDTH_PX,
    DRAGON_FOOT_OFFSET_Y,
    DRAGON_HEIGHT_RATIO,
    DRAGON_IDLE_BATTLE_PREFIX,
    DRAGON_ROAR_PREFIX,
    DRAGON_ROAR_REQUIRED_TEXTURE_SIZE,
    DRAGON_WIDTH_RATIO,
    DRAGON_BACK_PX_PER_SEC,
    DRAGON_FIGHT_X_MAX_FRAC,
    DRAGON_FIGHT_X_MIN_FRAC,
    DRAGON_WALK_PX_PER_SEC,
    EFFECT_FRAME_SWAP_MS,
    EFFECT_HIT_OFFSET_X,
    EFFECT_HIT_OFFSET_Y,
    EFFECT_OFFSET_X,
    EFFECT_OFFSET_Y,
    EFFECT_SCALE,
    EFFECT_SPEED_PX_PER_SEC,
    EFFECT_TRACK_ZOOM,
    FIGHT_DRAGON_X_FRAC,
    FIGHT_CAT_EFFECT_SCALE,
    FIGHT_CAT_HITBOX_HEIGHT,
    FIGHT_CAT_EFFECT_SPAWN_X_BIAS,
    FIGHT_CAT_EFFECT_SPAWN_Y_BIAS,
    FIGHT_CAT_MOVE_DEADZONE,
    FIGHT_CAT_MOVE_PX_PER_SEC,
    FIGHT_CAT_FOOT_OFFSET_Y,
    FIGHT_CAT_HITBOX_OFFSET_X,
    FIGHT_CAT_HITBOX_OFFSET_Y,
    FIGHT_CAT_HITBOX_WIDTH,
    FIGHT_CAT_JUMP_Y_ADJUST,
    FIGHT_CAT_SUPER_Y_ADJUST,
    FIGHT_CAT_X_MAX_FRAC,
    FIGHT_CAT_X_MIN_FRAC,
    FIGHT_NINJA_X_FRAC,
    FIREBALL_COOLDOWN_MS,
    FIREBALL_DAMAGE,
    FIREBALL_SPEED_PX_PER_SEC,
    MAP2_BG_KEY,
    MAP2_DRAGON_ATTACK_ANIM_KEY,
    MAP2_DRAGON_ATTACK_FX_ANIM_KEY,
    MAP2_DRAGON_ATTACK_FX_KEY,
    MAP2_CLASH_ANIM_KEY,
    MAP2_CLASH_KEY,
    MAP2_DRAGON_FIREBALL_SCALE,
    MAP2_DRAGON_MIN_SPAWN_INTERVAL_MS,
    MAP2_DRAGON_FIREBALL_LOOP_ANIM_KEY,
    MAP2_DRAGON_ATTACK_KEY,
    MAP2_DRAGON_FIREBALL_HITBOX_SIZE,
    MAP2_DRAGON_FIREBALL_LIFETIME_MS,
    MAP2_DRAGON_KEY,
    MAP2_DRAGON_IDLE_KEY,
    MAP2_DRAGON_WALK_ANIM_KEY,
    MAP2_DRAGON_WALK_KEY,
    MAP2_GROUND_RATIO,
    MAP2_CAT_SUPER_HOLD_ANIM_KEY,
    MAP2_CAT_SUPER_RELEASE_ANIM_KEY,
    MAP2_PLAYER2_KEY,
    MAP2_PLAYER2_IDLE_ANIM_KEY,
    MAP2_PLAYER2_IDLE_KEY,
    MAP2_PLAYER2_JUMP_ANIM_KEY,
    MAP2_PLAYER2_JUMP_KEY,
    MAP2_PLAYER2_WALK_ANIM_KEY,
    MAP2_PLAYER2_WALK_KEY,
    MAP2_UI_KEY,
    NINJA_FOOT_OFFSET_Y,
    NINJA_INTRO_DURATION_MS,
    NINJA_INTRO_ZOOM,
    NINJA_MANA_MAX,
    NINJA_MANA_REGEN_PER_SEC,
    NINJA_RUNIN_DURATION_MS,
    NINJA_FOCUS_EXTRA_Y,
    RUNIN_CAMERA_TRACK_BIAS_Y,
    RUNIN_EASE,
    RUN_ANIM_FALLBACK_MS,
    SHOW_GROUND_DEBUG_LINE,
    UI_BASE_SIZE_PX,
    UI_HEIGHT_RATIO,
    UI_WIDTH_RATIO,
    VERSUS_HP_MAX,
    WHITE_FLASH_IN_MS,
    WHITE_FLASH_OUT_MS,
} from './map2/handle.map2.constants.js';
import {
    applyMap2DragonBattleFacing,
    applyMap2Player2CatFacing,
    getMap2DragonAttackFxWorldXY,
    getMap2DragonProjectileDirX,
    getMap2DragonProjectileSpawnXY,
    getMap2ProjectileOffscreenTargetX,
} from './map2/handle.map2.facing.js';
import {
    map2CreateVersusUi,
    map2RefreshVersusUi,
    map2ShowVersusKoOverlay,
    type Map2VersusUiRefs,
} from './map2/handle.map2.ui.js';

export class Map2Scene extends Phaser.Scene {
    /** Chỉ cho rồng chạy khi giữ cử chỉ đủ thời gian này (ms). */
    private static readonly DRAGON_WALK_GESTURE_HOLD_MS = 120;
    private ninja!: NinjaCat;
    private bird!: Bird;
    private tracker!: HandTracker;
    private groundY = 0;
    private inCutscene = false;
    private ninjaDefeated = false;
    private prevGrab = false;
    private dragonSprite: Phaser.GameObjects.Sprite | null = null;
    /** Rồng Map2: vị trí X trên võ đài (tiến/lùi). */
    private dragonFixedX: number | null = null;
    private blinkTween: Phaser.Tweens.Tween | null = null;
    private fightCatSprite: Phaser.Physics.Arcade.Sprite | null = null;
    private versusBegun = false;
    private versusEnded = false;
    private dragonHp = VERSUS_HP_MAX;
    private ninjaHp = VERSUS_HP_MAX;
    private ninjaMana = NINJA_MANA_MAX;
    private readonly map2VersusUi: Map2VersusUiRefs = {
        uiHpDragonFill: null,
        uiHpNinjaFill: null,
        uiManaNinjaFill: null,
    };
    private prevMap2DragonFist = false;
    private prevMap2RightGrab = false;
    private prevMap2RightJump = false;
    private dragonAttackPlaying = false;
    private fireballReadyAt = 0;
    private dragonLastSpawnAt = -Infinity;
    /** Va chạm đạn–cat: dùng bounds của Arcade body (không dùng getBounds sprite — quá lớn). */
    private readonly fireballHitRect = new Phaser.Geom.Rectangle();
    private readonly catHitTmpRect = new Phaser.Geom.Rectangle();
    private readonly catEffectHitRect = new Phaser.Geom.Rectangle();
    private readonly dragonHitTmpRect = new Phaser.Geom.Rectangle();
    private dragonProjectiles: Phaser.Physics.Arcade.Group | null = null;
    private catProjectiles: Phaser.Physics.Arcade.Group | null = null;
    private catSuperSprite: Phaser.GameObjects.Sprite | null = null;
    private dragonFramePrefix = DRAGON_ROAR_PREFIX;
    private dragonAnimKey = 'dragon_roar_once';
    private dragonIdleAnimKey = 'dragon_battle_loop';
    private dragonMoveCommand: 'forward' | 'back' | null = null;
    private walkHoldTimer = 0;
    private dragonVelocityX = 0;
    /** Khóa state khi đang phát cat_super_release (tránh idle/walk đè anim). */
    private catReleasingSuper = false;
    private catJumpTween: Phaser.Tweens.Tween | null = null;
    /** Debug combat Map2: bật để soi spam/projectile/hit/clash/state. */
    private readonly map2CombatDebug = true;
    private dragonSpawnCount = 0;
    private catSpawnCount = 0;
    private projectileSerial = 0;
    constructor() {
        super({ key: 'Map2Scene' });
    }

    init(data: { tracker: HandTracker }) {
        this.tracker = data.tracker;
    }

    preload() {
        this.load.image(
            MAP2_BG_KEY,
            new URL('../assets/map2/background/bg_map2.PNG', import.meta.url).href,
        );
        this.load.atlas(
            'player',
            new URL('../assets/common/player/player.png', import.meta.url).href,
            new URL('../assets/common/player/player.json', import.meta.url).href,
        );
        this.load.atlas(
            'bird_atlas',
            new URL('../assets/map1/bird/map1_bird.png', import.meta.url).href,
            new URL('../assets/map1/bird/map1_bird.json', import.meta.url).href,
        );
        this.load.atlas(
            MAP2_PLAYER2_KEY,
            new URL('../assets/map2/player2/player2.png', import.meta.url).href,
            new URL('../assets/map2/player2/player2.json', import.meta.url).href,
        );
        this.load.atlas(
            MAP2_PLAYER2_IDLE_KEY,
            new URL('../assets/map2/player2/cat_idle/texture.png', import.meta.url).href,
            new URL('../assets/map2/player2/cat_idle/texture.json', import.meta.url).href,
        );
        this.load.atlas(
            MAP2_PLAYER2_WALK_KEY,
            new URL('../assets/map2/player2/cat_walk/texture.png', import.meta.url).href,
            new URL('../assets/map2/player2/cat_walk/texture.json', import.meta.url).href,
        );
        this.load.atlas(
            MAP2_PLAYER2_JUMP_KEY,
            new URL('../assets/map2/player2/cat_jump/texture.png', import.meta.url).href,
            new URL('../assets/map2/player2/cat_jump/texture.json', import.meta.url).href,
        );
        this.load.atlas(
            MAP2_UI_KEY,
            new URL('../assets/common/ui/spritesheet.png', import.meta.url).href,
            new URL('../assets/common/ui/spritesheet.json', import.meta.url).href,
        );
        const useRoarAtlas = this.canUseRoarAtlas();
        this.dragonFramePrefix = useRoarAtlas
            ? DRAGON_ROAR_PREFIX
            : DRAGON_IDLE_BATTLE_PREFIX;
        this.dragonAnimKey = useRoarAtlas
            ? 'dragon_roar_once'
            : 'dragon_battle_once';
        const dragonBasePath = useRoarAtlas
            ? '../assets/map2/player/dragon/roar/texture'
            : '../assets/map2/player/dragon/idle_battle/spritesheet';
        this.load.atlas(
            MAP2_DRAGON_KEY,
            new URL(`${dragonBasePath}.png`, import.meta.url).href,
            new URL(`${dragonBasePath}.json`, import.meta.url).href,
        );
        this.load.atlas(
            MAP2_DRAGON_IDLE_KEY,
            new URL('../assets/map2/player/dragon/idle_battle/spritesheet.png', import.meta.url)
                .href,
            new URL('../assets/map2/player/dragon/idle_battle/spritesheet.json', import.meta.url)
                .href,
        );
        this.load.atlas(
            MAP2_DRAGON_WALK_KEY,
            new URL('../assets/map2/player/dragon/walking/spritesheet.png', import.meta.url).href,
            new URL('../assets/map2/player/dragon/walking/spritesheet.json', import.meta.url).href,
        );
        this.load.atlas(
            MAP2_DRAGON_ATTACK_KEY,
            new URL('../assets/map2/player/dragon/attack/spritesheet.png', import.meta.url).href,
            new URL('../assets/map2/player/dragon/attack/spritesheet.json', import.meta.url).href,
        );
        this.load.atlas(
            MAP2_DRAGON_ATTACK_FX_KEY,
            new URL('../assets/map2/player/dragon/attack-effect/texture.png', import.meta.url).href,
            new URL('../assets/map2/player/dragon/attack-effect/texture.json', import.meta.url).href,
        );
        this.load.atlas(
            MAP2_CLASH_KEY,
            new URL('../assets/map2/clash/texture.png', import.meta.url).href,
            new URL('../assets/map2/clash/texture.json', import.meta.url).href,
        );
        this.load.audio(
            'ninja_jump_sfx',
            new URL('../assets/common/music/jump.mp3', import.meta.url).href,
        );
        this.load.audio(
            'ninja_slash_sfx',
            new URL('../assets/common/music/slash.mp3', import.meta.url).href,
        );
    }

    create() {
        const { width, height } = this.scale;
        this.physics.resume();
        this.dragonProjectiles = this.physics.add.group({
            allowGravity: false,
            immovable: true,
        });
        this.catProjectiles = this.physics.add.group({
            allowGravity: false,
            immovable: true,
        });
        this.inCutscene = true;
        this.ninjaDefeated = false;
        this.prevGrab = false;
        this.dragonSprite = null;
        this.dragonFixedX = null;
        this.fightCatSprite = null;
        this.versusBegun = false;
        this.versusEnded = false;
        this.prevMap2DragonFist = false;
        this.prevMap2RightGrab = false;
        this.prevMap2RightJump = false;
        this.dragonAttackPlaying = false;
        this.dragonHp = VERSUS_HP_MAX;
        this.ninjaHp = VERSUS_HP_MAX;
        this.ninjaMana = NINJA_MANA_MAX;
        this.catJumpTween = null;

        this.groundY = height * MAP2_GROUND_RATIO;
        this.physics.world.setBounds(0, 0, width, this.groundY);

        const bg = this.add.image(width / 2, height / 2, MAP2_BG_KEY);
        bg.setOrigin(0.5, 0.5);
        bg.setDepth(0);
        if (bg.width > 0 && bg.height > 0) {
            bg.setScale(width / bg.width, height / bg.height);
        }
        if (SHOW_GROUND_DEBUG_LINE) {
            const groundLine = this.add.graphics();
            groundLine.setDepth(2200);
            groundLine.lineStyle(2, 0xffcc00, 0.95);
            groundLine.beginPath();
            groundLine.moveTo(0, this.groundY);
            groundLine.lineTo(width, this.groundY);
            groundLine.strokePath();
        }

        this.registerMap2Anims();

        this.ninja = new NinjaCat(
            this,
            CAT_FIXED_X,
            this.groundY + NINJA_FOOT_OFFSET_Y,
            'ninja_jump_sfx',
            'ninja_slash_sfx',
        );
        this.ninja.sprite.setOrigin(0.5, 1);
        this.ninja.sprite.y = this.groundY + NINJA_FOOT_OFFSET_Y;
        this.ninja.sprite.anims.stop();
        this.ninja.sprite.setFrame('ninja cat/idle active/ninja-idle active_00.png');
        this.bird = new Bird(
            this,
            CAT_FIXED_X + BIRD_START_OFFSET_X,
            this.groundY + BIRD_START_OFFSET_Y,
        );
        this.physics.add.existing(this.bird.sprite);
        const birdBody = this.bird.sprite.body as Phaser.Physics.Arcade.Body;
        birdBody.setAllowGravity(false);
        birdBody.setImmovable(true);
        birdBody.setSize(
            this.bird.sprite.displayWidth * 0.7,
            this.bird.sprite.displayHeight * 0.7,
            true,
        );

        this.lockCutsceneBodies();

        this.cameras.main.fadeIn(420, 0, 0, 0);
        this.cameras.main.once(
            Phaser.Cameras.Scene2D.Events.FADE_IN_COMPLETE,
            () => {
                this.runMap2IntroCutscene();
            },
        );
        this.input.keyboard?.on('keydown-H', () => {
            this.skipMap2CutsceneForDebug();
        });
    }

    private skipMap2CutsceneForDebug(): void {
        if (!this.inCutscene) {
            return;
        }
        const { width: w, height: h } = this.scale;
        this.tweens.killAll();
        this.cameras.main.stopFollow();
        this.cameras.main.setScroll(0, 0);
        this.cameras.main.setZoom(1);
        if (this.ninja?.sprite?.active) {
            this.ninja.sprite.destroy();
        }
        if (this.bird?.sprite?.active) {
            this.bird.sprite.destroy();
        }
        if (this.catSuperSprite?.active) {
            this.catSuperSprite.destroy();
            this.catSuperSprite = null;
        }
        if (!this.dragonSprite?.active && this.textures.exists(MAP2_DRAGON_KEY)) {
            const dScale = Math.min(
                (w * DRAGON_WIDTH_RATIO) / DRAGON_BASE_WIDTH_PX,
                (h * DRAGON_HEIGHT_RATIO) / DRAGON_BASE_HEIGHT_PX,
            );
            this.dragonFixedX = w * FIGHT_DRAGON_X_FRAC;
            this.dragonSprite = this.add.sprite(
                this.dragonFixedX,
                this.groundY + DRAGON_FOOT_OFFSET_Y,
                MAP2_DRAGON_KEY,
            );
            this.dragonSprite.setOrigin(0.5, 1);
            this.dragonSprite.setDepth(55);
            this.dragonSprite.setScale(dScale);
            applyMap2DragonBattleFacing(this.dragonSprite);
            if (this.anims.exists(this.dragonIdleAnimKey)) {
                this.dragonSprite.play(this.dragonIdleAnimKey, true);
            }
        }
        this.inCutscene = false;
        this.beginVersusMode(w);
    }

    private registerMap2Anims(): void {
        registerMap2Anims(this, {
            dragonFramePrefix: this.dragonFramePrefix,
            dragonAnimKey: this.dragonAnimKey,
            dragonIdleAnimKey: this.dragonIdleAnimKey,
        });
    }

    private lockCutsceneBodies(): void {
        const nb = this.ninja.sprite.body as Phaser.Physics.Arcade.Body;
        nb.setVelocity(0, 0);
        nb.setAllowGravity(false);
        nb.setImmovable(true);
        const bb = this.bird.sprite.body as Phaser.Physics.Arcade.Body;
        bb.setAllowGravity(false);
        bb.setImmovable(true);
    }

    private runMap2IntroCutscene(): void {
        const cam = this.cameras.main;
        const { width: w, height: h } = this.scale;
        const nx = this.ninja.sprite.x;
        const ninjaCenterY =
            this.ninja.sprite.y -
            this.ninja.sprite.displayHeight / 2 +
            NINJA_FOCUS_EXTRA_Y;
        const rawCatSuperX = nx + CAT_SUPER_OFFSET_X;
        const catSuperX = Phaser.Math.Clamp(
            rawCatSuperX,
            CAT_SUPER_MIN_X_MARGIN,
            w - CAT_SUPER_MAX_X_MARGIN,
        );
        const catSuperY =
            this.groundY + CAT_SUPER_OFFSET_Y + CAT_SUPER_FOOT_OFFSET_Y;

        this.catSuperSprite = this.add.sprite(
            catSuperX,
            catSuperY,
            MAP2_PLAYER2_KEY,
            'cat_super_00.png',
        );
        this.catSuperSprite.setOrigin(0.5, 1);
        this.catSuperSprite.setDepth(82);
        this.catSuperSprite.setScale(CAT_SUPER_SCALE);
        applyMap2Player2CatFacing(this.catSuperSprite);
        this.catSuperSprite.play(MAP2_CAT_SUPER_HOLD_ANIM_KEY);
        const catSuperFocusY =
            this.catSuperSprite.y -
            this.catSuperSprite.displayHeight / 2 +
            NINJA_FOCUS_EXTRA_Y;
        const ninjaFinalX = CAT_FIXED_X;
        const birdFinalX = CAT_FIXED_X + BIRD_START_OFFSET_X;
        const runInStartX = -Math.max(
            w * 0.55,
            this.ninja.sprite.displayWidth * 1.8,
            this.bird.sprite.displayWidth * 2.2,
            260,
        );
        this.ninja.sprite.x = runInStartX - 50;
        this.ninja.sprite.y = this.groundY + NINJA_FOOT_OFFSET_Y;
        this.bird.sprite.x = runInStartX - 120;
        this.bird.sprite.y = this.groundY + BIRD_START_OFFSET_Y;
        const hasIntroRunAnim = this.anims.exists('ninja_run_intro_once');
        if (hasIntroRunAnim) {
            // Force restart để tránh trường hợp animation đang ở trạng thái cũ.
            this.ninja.sprite.play('ninja_run_intro_once', false);
        } else if (this.anims.exists('ninja_run')) {
            this.ninja.sprite.play('ninja_run', true);
        }

        const onCatSuper = scrollForWorldCenter(
            cam,
            catSuperX,
            catSuperFocusY,
            CAT_SUPER_ZOOM,
        );
        const runInDuration = Math.max(
            NINJA_RUNIN_DURATION_MS,
            BIRD_RUNIN_DURATION_MS,
            NINJA_INTRO_DURATION_MS,
        );
        const trackRunInCamera = () => {
            const midX = (this.ninja.sprite.x + this.bird.sprite.x) / 2;
            const focusY =
                this.ninja.sprite.y -
                this.ninja.sprite.displayHeight / 2 +
                RUNIN_CAMERA_TRACK_BIAS_Y;
            const focus = scrollForWorldCenter(cam, midX, focusY, NINJA_INTRO_ZOOM);
            cam.setZoom(NINJA_INTRO_ZOOM);
            cam.setScroll(focus.scrollX, focus.scrollY);
        };
        trackRunInCamera();

        let runMoveDone = false;
        let runAnimDone = false;
        let zoomStarted = false;
        const startZoomToCat = () => {
            if (!runMoveDone || !runAnimDone || zoomStarted) {
                return;
            }
            zoomStarted = true;
            this.ninja.sprite.anims.stop();
            this.ninja.sprite.setFrame(
                'ninja cat/idle active/ninja-idle active_00.png',
            );
            this.tweens.add({
                targets: cam,
                scrollX: onCatSuper.scrollX,
                scrollY: onCatSuper.scrollY,
                zoom: CAT_SUPER_ZOOM,
                duration: CAT_SUPER_ZOOM_DURATION_MS,
                ease: 'Power2.easeInOut',
                onComplete: () => {
                    this.cutsceneProjectileAndCatDie();
                },
            });
        };
        if (hasIntroRunAnim) {
            this.ninja.sprite.once(
                Phaser.Animations.Events.ANIMATION_COMPLETE,
                (anim: Phaser.Animations.Animation) => {
                    if (anim.key !== 'ninja_run_intro_once') {
                        return;
                    }
                    runAnimDone = true;
                    startZoomToCat();
                },
            );
            // Fallback: nếu event animationcomplete bị miss, vẫn tiếp tục cutscene.
            this.time.delayedCall(RUN_ANIM_FALLBACK_MS, () => {
                if (!runAnimDone) {
                    runAnimDone = true;
                    startZoomToCat();
                }
            });
        } else {
            runAnimDone = true;
        }

        this.tweens.add({
            targets: this.ninja.sprite,
            x: ninjaFinalX,
            duration: NINJA_RUNIN_DURATION_MS,
            ease: RUNIN_EASE,
            onComplete: () => {
                runMoveDone = true;
                startZoomToCat();
            },
        });
        this.tweens.add({
            targets: this.bird.sprite,
            x: birdFinalX,
            duration: BIRD_RUNIN_DURATION_MS,
            ease: RUNIN_EASE,
        });
        this.tweens.addCounter({
            from: 0,
            to: 1,
            duration: runInDuration,
            ease: RUNIN_EASE,
            onUpdate: trackRunInCamera,
        });
    }

    private cutsceneProjectileAndCatDie(): void {
        const nx = this.ninja.sprite.x;
        const ny = this.ninja.sprite.y;
        const catX = this.catSuperSprite?.x ?? nx;
        const catY = this.catSuperSprite?.y ?? ny;
        const startX = catX + EFFECT_OFFSET_X;
        const startY = this.catSuperSprite
            ? catY + EFFECT_OFFSET_Y
            : ny - 100;
        const hitX = nx + EFFECT_HIT_OFFSET_X;
        const hitY = ny + EFFECT_HIT_OFFSET_Y;

        const proj = this.add.sprite(
            startX,
            startY,
            MAP2_PLAYER2_KEY,
            'cat_effect_super_00.png',
        );
        proj.setOrigin(0.5, 0.5);
        proj.setDepth(72);
        proj.setScale(EFFECT_SCALE);
        applyMap2Player2CatFacing(proj);

        let superFrame = 0;
        const flip = this.time.addEvent({
            delay: EFFECT_FRAME_SWAP_MS,
            loop: true,
            callback: () => {
                superFrame = superFrame === 0 ? 1 : 0;
                proj.setFrame(
                    superFrame === 0
                        ? 'cat_effect_super_00.png'
                        : 'cat_effect_super_01.png',
                );
            },
        });

        let effectResolved = false;
        let effectMidLogged = false;
        const resolveAfterEffect = () => {
            if (effectResolved) {
                return;
            }
            effectResolved = true;
            if (flip && !flip.hasDispatched) {
                flip.destroy();
            }
            if (proj.active) {
                proj.destroy();
            }

            this.ninja.sprite.anims.stop();
            this.ninja.sprite.play('ninja_die', true);
            this.ninja.sprite.once(
                Phaser.Animations.Events.ANIMATION_COMPLETE,
                (anim: Phaser.Animations.Animation) => {
                    if (anim.key !== 'ninja_die') {
                        return;
                    }
                    this.ninjaDefeated = true;
                    this.cutsceneBirdUiAndDragon();
                },
            );
        };

        const distance = Phaser.Math.Distance.Between(startX, startY, hitX, hitY);
        const dynamicDuration = Math.max(
            1,
            (distance / EFFECT_SPEED_PX_PER_SEC) * 1000,
        );

        this.tweens.add({
            targets: proj,
            x: hitX,
            y: hitY,
            duration: dynamicDuration,
            ease: 'Linear',
            onUpdate: () => {
                const focus = scrollForWorldCenter(
                    this.cameras.main,
                    proj.x,
                    proj.y - proj.displayHeight * 0.22,
                    EFFECT_TRACK_ZOOM,
                );
                this.cameras.main.setZoom(EFFECT_TRACK_ZOOM);
                this.cameras.main.setScroll(focus.scrollX, focus.scrollY);
                if (!effectMidLogged && Math.abs(proj.x - startX) > Math.abs(hitX - startX) * 0.5) {
                    effectMidLogged = true;
                }
            },
            onComplete: () => {
                resolveAfterEffect();
            },
        });
        // Fallback chống kẹt nếu tween không bắn onComplete vì thay đổi state khác.
        this.time.delayedCall(dynamicDuration + 220, () => {
            resolveAfterEffect();
        });
    }

    private cutsceneBirdUiAndDragon(): void {
        const cam = this.cameras.main;
        const { width: w, height: h } = this.scale;
        const bx = this.bird.sprite.x;
        const by = this.bird.sprite.y;
        const ninjaDieX = this.ninja.sprite.x;
        const birdFocusY = by - this.bird.sprite.displayHeight * 0.2;
        const onBird = scrollForWorldCenter(cam, bx, birdFocusY, BIRD_FOCUS_ZOOM);

        this.tweens.add({
            targets: cam,
            scrollX: onBird.scrollX,
            scrollY: onBird.scrollY,
            zoom: BIRD_FOCUS_ZOOM,
            duration: BIRD_FOCUS_DURATION_MS,
            ease: 'Sine.easeInOut',
            onComplete: () => {
                this.blinkTween = this.tweens.add({
                    targets: this.bird.sprite,
                    alpha: 0.28,
                    duration: 100,
                    yoyo: true,
                    repeat: -1,
                });

                const ui = this.add.sprite(bx, by, MAP2_UI_KEY, 'hoi_sinh_00.png');
                ui.setOrigin(0.5, 0.5);
                ui.setDepth(160);
                const uiScale = Math.min(
                    (w * UI_WIDTH_RATIO) / UI_BASE_SIZE_PX,
                    (h * UI_HEIGHT_RATIO) / UI_BASE_SIZE_PX,
                );
                ui.setScale(uiScale);
                ui.play('hoi_sinh_cutscene');

                ui.once(Phaser.Animations.Events.ANIMATION_COMPLETE, () => {
                    if (this.blinkTween) {
                        this.blinkTween.stop();
                        this.blinkTween = null;
                    }
                    this.bird.sprite.setAlpha(1);

                    const white = this.add
                        .rectangle(w / 2, h / 2, w + 4, h + 4, 0xffffff)
                        .setScrollFactor(0)
                        .setDepth(2500)
                        .setAlpha(0);

                    this.tweens.add({
                        targets: white,
                        alpha: 1,
                        duration: WHITE_FLASH_IN_MS,
                        ease: 'Quad.easeIn',
                        onComplete: () => {
                            ui.destroy();
                            this.ninja.sprite.destroy();

                            cam.setScroll(0, 0);
                            cam.setZoom(1);

                            const dScale = Math.min(
                                (w * DRAGON_WIDTH_RATIO) / DRAGON_BASE_WIDTH_PX,
                                (h * DRAGON_HEIGHT_RATIO) / DRAGON_BASE_HEIGHT_PX,
                            );
                            if (this.textures.exists(MAP2_DRAGON_KEY)) {
                                this.dragonFixedX = w * FIGHT_DRAGON_X_FRAC;
                                this.dragonSprite = this.add.sprite(
                                    this.dragonFixedX,
                                    this.groundY + DRAGON_FOOT_OFFSET_Y,
                                    MAP2_DRAGON_KEY,
                                );
                                this.dragonSprite.setOrigin(0.5, 1);
                                this.dragonSprite.setDepth(55);
                                this.dragonSprite.setScale(dScale);
                                applyMap2DragonBattleFacing(this.dragonSprite);
                                const endCutsceneAndStartVersus = () => {
                                    this.inCutscene = false;
                                    this.beginVersusMode(w);
                                };
                                if (this.anims.exists(this.dragonAnimKey)) {
                                    this.dragonSprite.play(this.dragonAnimKey);
                                    this.dragonSprite.once(
                                        Phaser.Animations.Events.ANIMATION_COMPLETE,
                                        (anim: Phaser.Animations.Animation) => {
                                            if (anim.key !== this.dragonAnimKey) {
                                                return;
                                            }
                                            if (this.anims.exists(this.dragonIdleAnimKey)) {
                                                this.dragonSprite?.play(
                                                    this.dragonIdleAnimKey,
                                                    true,
                                                );
                                            }
                                            endCutsceneAndStartVersus();
                                        },
                                    );
                                } else {
                                    if (this.anims.exists(this.dragonIdleAnimKey)) {
                                        this.dragonSprite.play(this.dragonIdleAnimKey, true);
                                    }
                                    endCutsceneAndStartVersus();
                                }
                            }
                            if (this.bird?.sprite?.active) {
                                this.bird.sprite.destroy();
                            }
                            if (this.catSuperSprite) {
                                this.catSuperSprite.setFrame('cat_normal_00.png');
                                if (this.anims.exists('cat_normal_run')) {
                                    this.catSuperSprite.play('cat_normal_run');
                                }
                                this.catSuperSprite.setDepth(70);
                            }

                            this.tweens.add({
                                targets: white,
                                alpha: 0,
                                duration: WHITE_FLASH_OUT_MS,
                                ease: 'Quad.easeOut',
                                onComplete: () => {
                                    white.destroy();
                                },
                            });
                        },
                    });
                });
            },
        });
    }

    update(_time: number, delta: number) {
        if (this.inCutscene) {
            return;
        }
        const hd = this.tracker.handData;

        if (!this.ninjaDefeated) {
            this.ninja.updateSlashGesture(hd);
            this.prevGrab = this.ninja.updateFromHand(hd, this.prevGrab);
            this.ninja.sprite.setVelocityX(0);
            this.ninja.sprite.x = CAT_FIXED_X;
        }
        if (this.bird?.sprite?.active) {
            this.bird.updateFromHand(hd);
        }
        if (
            this.versusBegun &&
            !this.versusEnded &&
            this.fightCatSprite?.active &&
            this.dragonSprite?.active
        ) {
            this.updateDragonVersus(hd, delta);
            this.updateCatVersus(hd, delta);
            this.refreshFightUi();
            this.runVersusKoIfNeeded();
        }
    }

    private beginVersusMode(width: number): void {
        if (this.versusBegun) {
            return;
        }
        this.versusBegun = true;
        const dx = width * FIGHT_DRAGON_X_FRAC;
        const nx = width * FIGHT_NINJA_X_FRAC;
        this.dragonFixedX = dx;
        if (this.dragonSprite) {
            this.dragonSprite.x = dx;
            applyMap2DragonBattleFacing(this.dragonSprite);
        }
        if (this.catSuperSprite) {
            this.catSuperSprite.setVisible(false);
        }
        this.spawnFightCat(nx);
        this.setupProjectileCollision();
        map2CreateVersusUi(this, width, this.map2VersusUi);
        this.refreshFightUi();
    }

    private setupProjectileCollision(): void {
        if (!this.dragonProjectiles || !this.catProjectiles) {
            return;
        }
        if (this.map2CombatDebug) {
            console.log(
                '[Map2Debug] Register overlap: dragonProjectiles<->cat + dragonProjectiles<->catProjectiles',
            );
        }
        if (this.fightCatSprite?.body) {
            this.physics.add.overlap(
                this.dragonProjectiles,
                this.fightCatSprite,
                (dragonBullet, catObj) => {
                    this.handleDragonProjectileHitCat(
                        dragonBullet as Phaser.Physics.Arcade.Sprite,
                        catObj as Phaser.Physics.Arcade.Sprite,
                    );
                },
                undefined,
                this,
            );
        }
        this.physics.add.overlap(
            this.dragonProjectiles,
            this.catProjectiles,
            (dragonBullet, catBullet) => {
                this.handleProjectileClash(
                    dragonBullet as Phaser.Physics.Arcade.Sprite,
                    catBullet as Phaser.Physics.Arcade.Sprite,
                );
            },
            undefined,
            this,
        );
    }

    private handleDragonProjectileHitCat(
        dragonBullet: Phaser.Physics.Arcade.Sprite,
        catObj: Phaser.Physics.Arcade.Sprite,
    ): void {
        if (!dragonBullet.active || !catObj.active) {
            return;
        }
        if (dragonBullet === this.fightCatSprite) {
            if (this.map2CombatDebug) {
                console.log('[Map2Debug][Damage] Ignore invalid overlap: bullet is cat sprite');
            }
            return;
        }
        const hpBefore = this.ninjaHp;
        const bulletId = (() => {
            const fromData = dragonBullet.getData('debugId') as string | undefined;
            if (fromData) {
                return fromData;
            }
            const fromName = dragonBullet.name;
            if (fromName) {
                return fromName;
            }
            return 'dragon-unknown';
        })();
        this.ninjaHp = Math.max(0, this.ninjaHp - FIREBALL_DAMAGE);
        if (this.map2CombatDebug) {
            console.log(
                `[Map2Debug][Damage] Dragon bullet ${bulletId} hit Cat | hp ${hpBefore} -> ${this.ninjaHp} | catActive=${this.fightCatSprite?.active ?? false} | sameCatRef=${catObj === this.fightCatSprite}`,
            );
        }
        dragonBullet.destroy();
        this.refreshFightUi();
        this.runVersusKoIfNeeded();
    }

    private spawnProjectileClashEffect(x: number, y: number): void {
        const clashEffect = this.add.sprite(
            x,
            y,
            MAP2_CLASH_KEY,
            'clash/clash_animation_00.png',
        );
        clashEffect.setDepth(9999);
        clashEffect.setScale(0.6);
        if (this.anims.exists(MAP2_CLASH_ANIM_KEY)) {
            clashEffect.play(MAP2_CLASH_ANIM_KEY);
            clashEffect.once(Phaser.Animations.Events.ANIMATION_COMPLETE, () => {
                clashEffect.destroy();
            });
            return;
        }
        this.time.delayedCall(220, () => {
            if (clashEffect.active) {
                clashEffect.destroy();
            }
        });
    }

    private handleProjectileClash(
        dragonBullet: Phaser.Physics.Arcade.Sprite,
        catBullet: Phaser.Physics.Arcade.Sprite,
    ): void {
        if (!dragonBullet.active || !catBullet.active) {
            return;
        }
        const dragonId =
            (dragonBullet.getData('debugId') as string | undefined) ?? 'dragon-unknown';
        const catId =
            (catBullet.getData('debugId') as string | undefined) ?? 'cat-unknown';
        const clashX = (dragonBullet.x + catBullet.x) * 0.5;
        const clashY = (dragonBullet.y + catBullet.y) * 0.5;
        if (this.map2CombatDebug) {
            console.log(
                `[Map2Debug][Clash] ${dragonId} <-> ${catId} at (${Math.round(clashX)}, ${Math.round(clashY)}) | catSpriteActive=${this.fightCatSprite?.active ?? false}`,
            );
        }
        this.spawnProjectileClashEffect(clashX, clashY);
        dragonBullet.destroy();
        catBullet.destroy();
    }

    private spawnFightCat(x: number): void {
        if (this.fightCatSprite?.active) {
            return;
        }
        const cat = this.physics.add.sprite(
            x,
            this.groundY + FIGHT_CAT_FOOT_OFFSET_Y,
            MAP2_PLAYER2_IDLE_KEY,
            'cat_idle/cat_idle_00.png',
        );
        cat.setOrigin(0.5, 1);
        cat.setDepth(70);
        cat.setScale(CAT_SUPER_SCALE);
        applyMap2Player2CatFacing(cat);
        if (this.anims.exists(MAP2_PLAYER2_IDLE_ANIM_KEY)) {
            cat.play(MAP2_PLAYER2_IDLE_ANIM_KEY, true);
        }
        const catBody = cat.body as Phaser.Physics.Arcade.Body;
        catBody.setAllowGravity(false);
        catBody.setImmovable(true);
        catBody.setSize(FIGHT_CAT_HITBOX_WIDTH, FIGHT_CAT_HITBOX_HEIGHT);
        catBody.setOffset(
            FIGHT_CAT_HITBOX_OFFSET_X,
            FIGHT_CAT_HITBOX_OFFSET_Y,
        );
        cat.refreshBody();
        this.fightCatSprite = cat;
    }

    private refreshFightUi(): void {
        map2RefreshVersusUi(this.scale, this.map2VersusUi, {
            dragonHp: this.dragonHp,
            ninjaHp: this.ninjaHp,
            ninjaMana: this.ninjaMana,
        });
    }

    private updateCatVersus(hd: HandData, delta: number): void {
        const cat = this.fightCatSprite;
        if (!cat?.active || !this.dragonSprite?.active) {
            return;
        }
        const catBody = cat.body as Phaser.Physics.Arcade.Body;
        const baseCatY = this.groundY + FIGHT_CAT_FOOT_OFFSET_Y;

        const prevRightGrab = this.prevMap2RightGrab;
        const isGrab = hd.hasPhysicalRightForMap2 && hd.map2RightGrab;
        const justReleased = !isGrab && prevRightGrab;
        const justGrabbed = isGrab && !prevRightGrab;

        const animKey = cat.anims.currentAnim?.key ?? 'none';
        const isSuperLoop = animKey === MAP2_CAT_SUPER_HOLD_ANIM_KEY;
        const isReleasingAnim = animKey === MAP2_CAT_SUPER_RELEASE_ANIM_KEY;
        const inReleasePlayback =
            this.catReleasingSuper || isReleasingAnim;

        /** Gồng + xả chiêu: giữ neo lơ lửng (super) cho đến khi spawn đạn xong. */
        const useSuperVerticalAnchor =
            isGrab ||
            isSuperLoop ||
            isReleasingAnim ||
            this.catReleasingSuper;

        cat.y = useSuperVerticalAnchor
            ? baseCatY + FIGHT_CAT_SUPER_Y_ADJUST
            : baseCatY;
        cat.refreshBody();

        if (inReleasePlayback) {
            // Lock super state during release animation to ignore hand-detection jitter.
            catBody.setVelocity(0, 0);
            this.prevMap2RightGrab = isGrab;
            this.prevMap2RightJump = false;
            return;
        }

        if (justReleased) {
            catBody.setVelocityY(0);
            catBody.setAllowGravity(false);

            this.catReleasingSuper = true;

            if (this.anims.exists(MAP2_CAT_SUPER_RELEASE_ANIM_KEY)) {
                cat.play(MAP2_CAT_SUPER_RELEASE_ANIM_KEY, true);
                cat.once(Phaser.Animations.Events.ANIMATION_COMPLETE, (anim) => {
                    if (anim.key !== MAP2_CAT_SUPER_RELEASE_ANIM_KEY) {
                        return;
                    }
                    this.spawnCatEffectProjectile(cat);
                    this.catReleasingSuper = false;
                    catBody.setAllowGravity(false);
                    /** Chỉ hạ chân xuống mặt đất sau khi đã spawn đạn. */
                    cat.y = this.groundY + FIGHT_CAT_FOOT_OFFSET_Y;
                    cat.refreshBody();
                    if (
                        this.anims.exists(MAP2_PLAYER2_IDLE_ANIM_KEY) &&
                        cat.active
                    ) {
                        cat.play(MAP2_PLAYER2_IDLE_ANIM_KEY, true);
                    }
                });
            } else {
                cat.anims.stop();
                cat.setFrame('cat_super_08.png');
                this.spawnCatEffectProjectile(cat);
                this.catReleasingSuper = false;
                cat.y = this.groundY + FIGHT_CAT_FOOT_OFFSET_Y;
                cat.refreshBody();
            }
            this.prevMap2RightGrab = isGrab;
            this.prevMap2RightJump = false;
            return;
        }

        if (isGrab) {
            if (justGrabbed && this.anims.exists(MAP2_CAT_SUPER_HOLD_ANIM_KEY)) {
                cat.play(MAP2_CAT_SUPER_HOLD_ANIM_KEY, true);
            } else if (
                cat.anims.currentAnim?.key !== MAP2_CAT_SUPER_HOLD_ANIM_KEY &&
                this.anims.exists(MAP2_CAT_SUPER_HOLD_ANIM_KEY)
            ) {
                cat.play(MAP2_CAT_SUPER_HOLD_ANIM_KEY, true);
            }
            cat.refreshBody();
            this.ninjaMana = Math.min(
                NINJA_MANA_MAX,
                this.ninjaMana + (NINJA_MANA_REGEN_PER_SEC * delta) / 1000,
            );
            this.prevMap2RightGrab = isGrab;
            this.prevMap2RightJump = false;
            return;
        }

        const rightActive = hd.hasPhysicalRightForMap2;
        const isJump = rightActive && hd.map2RightJump;
        const justJumped = isJump && !this.prevMap2RightJump;
        let moveDir = 0;
        if (rightActive && !isJump) {
            if (hd.map2RightBack) {
                moveDir = -1;
            } else if (hd.map2RightWalkForward) {
                moveDir = 1;
            } else if (hd.normX < 0.5 - FIGHT_CAT_MOVE_DEADZONE) {
                moveDir = -1;
            } else if (hd.normX > 0.5 + FIGHT_CAT_MOVE_DEADZONE) {
                moveDir = 1;
            }
        }
        const w = this.scale.width;
        const minX = w * FIGHT_CAT_X_MIN_FRAC;
        const maxX = w * FIGHT_CAT_X_MAX_FRAC;
        const vx = moveDir * FIGHT_CAT_MOVE_PX_PER_SEC;
        cat.x = Phaser.Math.Clamp(cat.x + (vx * delta) / 1000, minX, maxX);
        if (justJumped && !this.catJumpTween) {
            this.catJumpTween = this.tweens.add({
                targets: cat,
                y: baseCatY + FIGHT_CAT_JUMP_Y_ADJUST,
                duration: 190,
                ease: 'Sine.easeOut',
                yoyo: true,
                hold: 40,
                onComplete: () => {
                    this.catJumpTween = null;
                    if (cat.active) {
                        cat.y = baseCatY;
                        cat.refreshBody();
                    }
                },
            });
        }
        cat.refreshBody();

        if (isJump && this.anims.exists(MAP2_PLAYER2_JUMP_ANIM_KEY)) {
            if (cat.anims.currentAnim?.key !== MAP2_PLAYER2_JUMP_ANIM_KEY) {
                cat.play(MAP2_PLAYER2_JUMP_ANIM_KEY, true);
            }
            this.prevMap2RightGrab = isGrab;
            this.prevMap2RightJump = isJump;
            return;
        }
        if (moveDir !== 0 && this.anims.exists(MAP2_PLAYER2_WALK_ANIM_KEY)) {
            if (cat.anims.currentAnim?.key !== MAP2_PLAYER2_WALK_ANIM_KEY) {
                cat.play(MAP2_PLAYER2_WALK_ANIM_KEY, true);
            }
            this.prevMap2RightGrab = isGrab;
            this.prevMap2RightJump = isJump;
            return;
        }
        if (
            this.anims.exists(MAP2_PLAYER2_IDLE_ANIM_KEY) &&
            cat.anims.currentAnim?.key !== MAP2_PLAYER2_IDLE_ANIM_KEY
        ) {
            cat.play(MAP2_PLAYER2_IDLE_ANIM_KEY, true);
        }
        this.prevMap2RightGrab = isGrab;
        this.prevMap2RightJump = isJump;
    }

    private spawnCatEffectProjectile(cat: Phaser.GameObjects.Sprite): void {
        if (!this.dragonSprite?.active) {
            return;
        }
        const manaCost = NINJA_MANA_MAX / 3;
        if (this.ninjaMana < manaCost) {
            return;
        }
        this.ninjaMana = Math.max(0, this.ninjaMana - manaCost);

        // Đạn của Cat đi ngang theo chiều ngược Dragon.
        const dragonDirX = getMap2DragonProjectileDirX();
        const dirX = dragonDirX >= 0 ? -1 : 1;
        const catBounds = cat.getBounds(this.catHitTmpRect);
        const isFlipped = cat.flipX;
        const catWidth = cat.displayWidth;
        const catHeight = cat.displayHeight;
        const catCenterX = catBounds.centerX;
        const catCenterY = catBounds.centerY;
        const forwardSign = isFlipped ? -1 : 1;
        const forwardBias = Math.abs(FIGHT_CAT_EFFECT_SPAWN_X_BIAS);

        const spawnX = catCenterX + forwardSign * forwardBias;
        const spawnY = catCenterY + FIGHT_CAT_EFFECT_SPAWN_Y_BIAS;

        const proj = this.physics.add.sprite(
            spawnX,
            spawnY,
            MAP2_PLAYER2_KEY,
            'cat_effect_super_08.png',
        );
        this.catSpawnCount += 1;
        this.projectileSerial += 1;
        const catProjId = `cat-${this.projectileSerial}`;
        proj.setOrigin(0.5, 0.5);
        proj.setDepth(72);
        proj.setScale(FIGHT_CAT_EFFECT_SCALE);
        proj.setDataEnabled();
        proj.setData('debugId', catProjId);
        const projBody = proj.body as Phaser.Physics.Arcade.Body;
        projBody.setAllowGravity(false);
        projBody.setImmovable(true);
        applyMap2Player2CatFacing(proj);
        this.catProjectiles?.add(proj);

        const targetX = getMap2ProjectileOffscreenTargetX(
            this.scale.width,
            dirX,
            Math.max(1, proj.displayWidth * 0.5),
        );
        const distance = Math.abs(targetX - spawnX);
        const duration = Math.max(
            900,
            (distance / CAT_EFFECT_PROJECTILE_SPEED_PX_PER_SEC) * 1000,
        );
        const damage = Math.max(8, Math.round(FIREBALL_DAMAGE * 0.9));
        const expectedVx = (targetX - spawnX) / (duration / 1000);
        projBody.setVelocity(expectedVx, 0);
        if (this.map2CombatDebug) {
            console.log(
                `[Map2Debug][CatSpawn #${this.catSpawnCount}] ${catProjId} | scale=${proj.scaleX.toFixed(2)} | spawn=(${Math.round(spawnX)}, ${Math.round(spawnY)}) | targetX=${Math.round(targetX)} | duration=${Math.round(duration)}ms`,
            );
            console.log(
                `\n🎯 [Cat Projectile Debug] BẮT ĐẦU SPAWN CHƯỞNG` +
                    `\n🐈 Trạng thái Cat: Bị lật (flipX) = ${isFlipped}` +
                    `\n📐 Kích thước Cat: Rộng(W) = ${Math.round(catWidth)}px | Cao(H) = ${Math.round(catHeight)}px` +
                    `\n📍 Tâm Cat hiện tại: X = ${Math.round(catCenterX)} | Y = ${Math.round(catCenterY)}` +
                    `\n💥 Vị trí Spawn Đạn: X = ${Math.round(spawnX)} (Nằm bên ${isFlipped ? 'TRÁI' : 'PHẢI'} của Mèo)` +
                    `\n📏 Khoảng cách lệch (Bias): ${FIGHT_CAT_EFFECT_SPAWN_X_BIAS}`,
            );
            console.log(
                `🚀 [Cat Projectile Debug] Đạn đã bay! Vận tốc X: ${Math.round(projBody.velocity.x)}, Y: ${Math.round(projBody.velocity.y)}`,
            );
        }

        const cleanup = () => {
            if (proj.active) {
                proj.destroy();
            }
        };

        this.tweens.add({
            targets: proj,
            x: targetX,
            duration,
            ease: 'Linear',
            onUpdate: () => {
                if (!proj.active || !this.dragonSprite?.active) {
                    return;
                }
                if (
                    Phaser.Geom.Intersects.RectangleToRectangle(
                        proj.getBounds(this.catEffectHitRect),
                        this.dragonSprite.getBounds(this.dragonHitTmpRect),
                    )
                ) {
                    this.dragonHp = Math.max(0, this.dragonHp - damage);
                    cleanup();
                    this.refreshFightUi();
                    this.runVersusKoIfNeeded();
                }
            },
            onComplete: cleanup,
        });
    }

    private updateDragonVersus(hd: HandData, delta: number): void {
        const spr = this.dragonSprite;
        if (!spr?.active || this.dragonFixedX == null) {
            return;
        }
        const w = this.scale.width;
        const minX = w * DRAGON_FIGHT_X_MIN_FRAC;
        const maxX = w * DRAGON_FIGHT_X_MAX_FRAC;

        const fistEdge = hd.map2DragonFist && !this.prevMap2DragonFist;
        this.prevMap2DragonFist = hd.map2DragonFist;

        if (
            fistEdge &&
            !this.dragonAttackPlaying &&
            this.time.now >= this.fireballReadyAt &&
            hd.hasPhysicalLeftForMap2 &&
            this.anims.exists(MAP2_DRAGON_ATTACK_ANIM_KEY)
        ) {
            this.dragonAttackPlaying = true;
            spr.play(MAP2_DRAGON_ATTACK_ANIM_KEY);
            spr.once(
                Phaser.Animations.Events.ANIMATION_COMPLETE,
                (anim: Phaser.Animations.Animation) => {
                    if (anim.key !== MAP2_DRAGON_ATTACK_ANIM_KEY) {
                        return;
                    }
                    this.spawnDragonFireballAfterAttack();
                    this.dragonAttackPlaying = false;
                    if (
                        this.anims.exists(this.dragonIdleAnimKey) &&
                        spr.active
                    ) {
                        spr.play(this.dragonIdleAnimKey, true);
                    }
                },
            );
            return;
        }

        if (this.dragonAttackPlaying) {
            return;
        }

        let x = this.dragonFixedX;
        this.dragonVelocityX = 0;
        if (hd.hasPhysicalLeftForMap2) {
            const dragonAnims = spr.anims;
            if (hd.map2DragonWalkForward || hd.map2DragonWalkBack) {
                this.walkHoldTimer = Math.min(
                    Map2Scene.DRAGON_WALK_GESTURE_HOLD_MS,
                    this.walkHoldTimer + delta,
                );
            } else {
                this.walkHoldTimer = 0;
                this.dragonMoveCommand = null;
            }
            if (hd.map2DragonWalkForward) {
                this.dragonMoveCommand = 'forward';
            } else if (hd.map2DragonWalkBack) {
                this.dragonMoveCommand = 'back';
            }
            const canWalk =
                this.walkHoldTimer >= Map2Scene.DRAGON_WALK_GESTURE_HOLD_MS;
            const walkForward = this.dragonMoveCommand === 'forward' && canWalk;
            const walkBack = this.dragonMoveCommand === 'back' && canWalk;
            if (walkForward && this.anims.exists(MAP2_DRAGON_WALK_ANIM_KEY)) {
                this.dragonVelocityX = DRAGON_WALK_PX_PER_SEC;
                if (
                    dragonAnims.currentAnim?.key !== MAP2_DRAGON_WALK_ANIM_KEY ||
                    dragonAnims.inReverse
                ) {
                    spr.play(MAP2_DRAGON_WALK_ANIM_KEY, true);
                }
            } else if (walkBack && this.anims.exists(MAP2_DRAGON_WALK_ANIM_KEY)) {
                this.dragonVelocityX = -DRAGON_BACK_PX_PER_SEC;
                if (
                    dragonAnims.currentAnim?.key !== MAP2_DRAGON_WALK_ANIM_KEY ||
                    !dragonAnims.inReverse
                ) {
                    dragonAnims.playReverse(MAP2_DRAGON_WALK_ANIM_KEY, true);
                }
            } else if (
                this.anims.exists(this.dragonIdleAnimKey) &&
                spr.anims.currentAnim?.key !== this.dragonIdleAnimKey
            ) {
                spr.play(this.dragonIdleAnimKey, true);
            }
        } else if (
            this.anims.exists(this.dragonIdleAnimKey) &&
            spr.anims.currentAnim?.key !== this.dragonIdleAnimKey
        ) {
            this.dragonMoveCommand = null;
            this.walkHoldTimer = 0;
            spr.play(this.dragonIdleAnimKey, true);
        }

        const nextX = x + (this.dragonVelocityX * delta) / 1000;
        x = Phaser.Math.Clamp(nextX, minX, maxX);
        this.dragonFixedX = x;
        spr.x = x;
    }

    private spawnDragonFireballAfterAttack(): void {
        const spr = this.dragonSprite;
        if (!spr?.active) {
            return;
        }
        const now = this.time.now;
        if (now < this.fireballReadyAt) {
            if (this.map2CombatDebug) {
                console.log(
                    `[Map2Debug][DragonSpawn BLOCKED] cooldown remaining=${Math.round(this.fireballReadyAt - now)}ms`,
                );
            }
            return;
        }
        if (now - this.dragonLastSpawnAt < MAP2_DRAGON_MIN_SPAWN_INTERVAL_MS) {
            if (this.map2CombatDebug) {
                console.log(
                    `[Map2Debug][DragonSpawn BLOCKED] interval lock ${Math.round(now - this.dragonLastSpawnAt)}ms < ${MAP2_DRAGON_MIN_SPAWN_INTERVAL_MS}ms`,
                );
            }
            return;
        }
        this.dragonLastSpawnAt = now;
        this.fireballReadyAt = now + FIREBALL_COOLDOWN_MS;
        this.dragonSpawnCount += 1;
        const w = this.scale.width;
        const facingDir = getMap2DragonProjectileDirX();
        const fxPos = getMap2DragonAttackFxWorldXY(spr);
        const spawn = getMap2DragonProjectileSpawnXY(spr);
        const cat = this.fightCatSprite;
        if (!cat?.active) {
            return;
        }
        const targetX = getMap2ProjectileOffscreenTargetX(
            w,
            facingDir,
            Math.max(1, spr.displayWidth * 0.06),
        );
        if (this.map2CombatDebug) {
            console.log(
                `[Map2Debug][DragonSpawn #${this.dragonSpawnCount}] trigger | attackPlaying=${this.dragonAttackPlaying} | cooldownReadyIn=${Math.max(0, Math.round(this.fireballReadyAt - this.time.now))}ms`,
            );
        }

        if (this.anims.exists(MAP2_DRAGON_ATTACK_FX_ANIM_KEY)) {
            const fx = this.add.sprite(
                fxPos.x,
                fxPos.y,
                MAP2_DRAGON_ATTACK_FX_KEY,
                'attack_effect/dragon_attack_effect_00.png',
            );
            fx.setDepth(58);
            const fs = Math.min(
                0.45,
                (w * 0.12) / Math.max(fx.width, 1),
            );
            fx.setScale(fs);
            fx.play(MAP2_DRAGON_ATTACK_FX_ANIM_KEY);
            fx.once(Phaser.Animations.Events.ANIMATION_COMPLETE, () => {
                fx.destroy();
            });
        }
        const proj = this.physics.add.sprite(
            spawn.x,
            spawn.y,
            MAP2_DRAGON_ATTACK_FX_KEY,
            'attack_effect/dragon_attack_effect_04.png',
        );
        this.projectileSerial += 1;
        const dragonProjId = `dragon-${this.projectileSerial}`;
        proj.setDepth(57);
        proj.setName(dragonProjId);
        const frameW = proj.width;
        const frameH = proj.height;
        proj.setScale(MAP2_DRAGON_FIREBALL_SCALE);
        proj.setDataEnabled();
        proj.setData('debugId', dragonProjId);
        const body = proj.body as Phaser.Physics.Arcade.Body;
        body.setAllowGravity(false);
        body.setImmovable(true);
        const hitW = MAP2_DRAGON_FIREBALL_HITBOX_SIZE;
        const hitH = MAP2_DRAGON_FIREBALL_HITBOX_SIZE;
        body.setSize(hitW, hitH);
        body.setOffset(
            (frameW - hitW) * 0.5,
            (frameH - hitH) * 0.5,
        );
        proj.refreshBody();
        if (this.anims.exists(MAP2_DRAGON_FIREBALL_LOOP_ANIM_KEY)) {
            proj.play(MAP2_DRAGON_FIREBALL_LOOP_ANIM_KEY);
        }
        this.dragonProjectiles?.add(proj);
        body.setAllowGravity(false);
        body.setVelocityY(0);
        const tx = targetX;
        const ty = proj.y;
        const dur = MAP2_DRAGON_FIREBALL_LIFETIME_MS;
        if (this.map2CombatDebug) {
            console.log(
                `[Map2Debug][DragonProjectile ${dragonProjId}] scale=${proj.scaleX.toFixed(2)} frame=${proj.frame.name} spawn=(${Math.round(spawn.x)}, ${Math.round(spawn.y)}) target=(${Math.round(tx)}, ${Math.round(ty)}) duration=${dur}ms allowGravity=${body.allowGravity} hitbox=${body.width}x${body.height}`,
            );
        }
        this.tweens.add({
            targets: proj,
            x: tx,
            y: ty,
            duration: dur,
            ease: 'Linear',
            onComplete: () => {
                if (proj.active) {
                    proj.destroy();
                }
            },
        });
    }

    private runVersusKoIfNeeded(): void {
        if (this.versusEnded) {
            return;
        }
        if (this.dragonHp > 0 && this.ninjaHp > 0) {
            return;
        }
        this.versusEnded = true;
        const label =
            this.dragonHp <= 0
                ? 'Mèo thắng'
                : this.ninjaHp <= 0
                  ? 'Rồng thắng'
                  : 'Hòa';
        map2ShowVersusKoOverlay(this, label, () => {
            this.goToStartMenu();
        });
    }

    private goToStartMenu(): void {
        this.scene.start('StartMenuScene', { tracker: this.tracker });
    }

    private canUseRoarAtlas(): boolean {
        const renderer = this.game.renderer as Phaser.Renderer.WebGL.WebGLRenderer & {
            gl?: WebGLRenderingContext;
        };
        const gl = renderer?.gl;
        if (!gl) {
            return false;
        }
        const maxTextureSize = gl.getParameter(gl.MAX_TEXTURE_SIZE) as number;
        return maxTextureSize >= DRAGON_ROAR_REQUIRED_TEXTURE_SIZE;
    }
}
