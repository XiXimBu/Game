import Phaser from 'phaser';
import { Bird, NinjaCat } from '../entities/handle.character.js';
import type { HandTracker } from '../core/handle.trackhand.js';
import { Map1EnemyManager } from './map1-enemy.manager.js';
import {
    firstFrameOfAnim,
    getBulletSingleFrameNames,
    registerMap1EnemyAnims,
} from './map1-enemy.anims.js';
import {
    BG_SCROLL_X,
    BIRD_ATLAS_KEY,
    BOTTOM_MOVE_SPEED_X,
    BOTTOM_SCALES,
    BOTTOM_SPAWN_OFFSCREEN_PX,
    CAT_FIXED_X,
    DEFAULT_BOTTOM_SCALE,
    DESTROY_OFFSCREEN_X,
    GROUND_MARGIN,
    LIMBO_SPAWN_TOKEN,
    MAP1_DISAPPEAR_SHEET_KEY,
    M1_ENEMIES_ATLAS_KEY,
    MAP1_LAYER_INDICES,
    MAX_HIGH_BODY_WIDTH_PX,
    MUSHROOM_SPAWN_TOKEN,
    NINJA_JUMP_AIR_TIME_SEC,
    SHOOTER_ENEMY_ANIM_KEYS,
    bottomFeetNudgePx,
    bottomTransparentPaddingSourcePx,
    inferBottomKindFromFrame,
} from './map1-enemy.config.js';

const ITEM_ATLAS_KEY = 'map1_item';
const ITEM_COLLECT_SFX_KEY = 'item_collect_sfx';
const HUD_HEALTH_ICON_KEY = 'hud_health_icon';
const HUD_MANA_ICON_KEY = 'hud_mana_icon';
const BIRD_SKILL_ATLAS_KEY = 'bird_skill_atlas';
const BIRD_SKILL_ANIM_KEY = 'bird_skill';
const BIRD_SKILL_FRAME_PREFIX = 'bird-skill_';

export class MainScene extends Phaser.Scene {
    private ninja!: NinjaCat;
    private bird!: Bird;
    private tracker!: HandTracker;
    private bgLayers: Phaser.GameObjects.TileSprite[] = [];
    private prevGrab = false;
    /** Mặt đất cố định (không dùng `ninja.sprite.y` — khi nhảy Y thay đổi). */
    private groundY = 0;
    private obstacleGroup!: Phaser.Physics.Arcade.Group;
    private itemGroup!: Phaser.Physics.Arcade.Group;
    private bottomObstacles: Phaser.Physics.Arcade.Sprite[] = [];
    private bottomItems: Phaser.Physics.Arcade.Sprite[] = [];
    private highEnemies: Phaser.Physics.Arcade.Sprite[] = [];
    private bottomEnemyManager: Map1EnemyManager | null = null;
    private itemSpawnBudgetLeft = 0;
    private isGameOver = false;
    private playerHealth = 2;
    private playerMana = 3;
    private firePassCount = 0;
    private lastEnemyDamageAtMs = -99999;
    private readonly enemyDamageCooldownMs = 1000;
    private map1ThemeMusic: Phaser.Sound.BaseSound | null = null;
    private hudHealthIcons: Phaser.GameObjects.Image[] = [];
    private hudManaIcons: Phaser.GameObjects.Image[] = [];
    private birdSkillProjectiles: Phaser.Physics.Arcade.Sprite[] = [];
    private birdSkillActiveUntilMs = 0;
    private birdSkillLastShotAtMs = -99999;
    private prevRightGrab = false;
    private readonly birdSkillDurationMs = 5000;
    private readonly birdSkillShotGapMs = 220;
    private readonly birdSkillManaCost = 3;
    private readonly birdSkillActiveScale = 1.2;
    private debugText!: Phaser.GameObjects.Text;
    private debugGraphics!: Phaser.GameObjects.Graphics;
    private debugConfig = {
        enabled: false,
        godMode: false,
        freezeSpawning: false,
        showHitboxes: false,
        timeScale: 1,
    };

    constructor() {
        super({ key: 'MainScene' });
    }

    init(data: { tracker: HandTracker }) {
        this.tracker = data.tracker;
    }

    preload() {
        this.load.atlas(
            'player',
            new URL('../assets/common/player/player.png', import.meta.url).href,
            new URL('../assets/common/player/player.json', import.meta.url).href,
        );
        this.load.atlas(
            BIRD_ATLAS_KEY,
            new URL('../assets/map1/bird/map1_bird.png', import.meta.url).href,
            new URL('../assets/map1/bird/map1_bird.json', import.meta.url).href,
        );
        this.load.atlas(
            BIRD_SKILL_ATLAS_KEY,
            new URL('../assets/common/bird/bird-skill.png', import.meta.url).href,
            new URL('../assets/common/bird/bird-skill.json', import.meta.url).href,
        );
        for (const idx of MAP1_LAYER_INDICES) {
            this.load.image(
                `bg_map1_layer${idx}`,
                new URL(
                    `../assets/map1/background/bg_map1_layer${idx}.png`,
                    import.meta.url,
                ).href,
            );
        }

        this.load.atlas(
            M1_ENEMIES_ATLAS_KEY,
            new URL('../assets/map1/enemy/map1_enemy.png', import.meta.url).href,
            new URL('../assets/map1/enemy/map1_enemy.json', import.meta.url).href,
        );
        this.load.atlas(
            ITEM_ATLAS_KEY,
            new URL('../assets/map1/item/item.png', import.meta.url).href,
            new URL('../assets/map1/item/item.json', import.meta.url).href,
        );
        this.load.image(
            'button_back',
            new URL('../assets/map1/background/button_back.png', import.meta.url)
                .href,
        );
        this.load.audio(
            'map1_theme',
            new URL('../assets/map1/music/map1_theme_music.wav', import.meta.url)
                .href,
        );
        this.load.audio(
            'ninja_jump_sfx',
            new URL('../assets/common/music/jump.mp3', import.meta.url).href,
        );
        this.load.audio(
            'ninja_slash_sfx',
            new URL('../assets/common/music/slash.mp3', import.meta.url).href,
        );
        this.load.audio(
            ITEM_COLLECT_SFX_KEY,
            new URL('../assets/common/music/item.mp3', import.meta.url).href,
        );
        this.load.image(
            HUD_HEALTH_ICON_KEY,
            new URL('../assets/common/sfx/health.png', import.meta.url).href,
        );
        this.load.image(
            HUD_MANA_ICON_KEY,
            new URL('../assets/common/sfx/mana.png', import.meta.url).href,
        );
        this.load.spritesheet(
            MAP1_DISAPPEAR_SHEET_KEY,
            new URL(
                '../assets/map1/disappear/map1_disappear.png',
                import.meta.url,
            ).href,
            { frameWidth: 256, frameHeight: 256 },
        );
    }

    create() {
        const { width, height } = this.scale;
        // Sau game over, Arcade world có thể vẫn đang pause — bắt buộc resume để ván mới chạy bình thường.
        this.physics.resume();
        this.isGameOver = false;
        this.playerHealth = 2;
        this.playerMana = 3;
        this.firePassCount = 0;
        this.lastEnemyDamageAtMs = -99999;
        this.birdSkillActiveUntilMs = 0;
        this.birdSkillLastShotAtMs = -99999;
        this.prevRightGrab = false;
        this.birdSkillProjectiles = [];
        this.groundY = height - GROUND_MARGIN;
        // Đặt đáy world physics trùng groundY để player không bị chìm xuống mép dưới canvas.
        this.physics.world.setBounds(0, 0, width, this.groundY);
        this.bgLayers = [];

        this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
            this.stopMap1ThemeMusic();
            this.tracker.setHandSkeletonDebug(false);
        });
        this.startMap1ThemeMusic();

        MAP1_LAYER_INDICES.forEach((idx, order) => {
            const tile = this.add.tileSprite(
                width / 2,
                height / 2,
                width,
                height,
                `bg_map1_layer${idx}`,
            );
            tile.setOrigin(0.5, 0.5);
            tile.setDepth(order);
            this.bgLayers.push(tile);
        });

        if (!this.anims.exists('ninja_run')) {
            this.anims.create({
                key: 'ninja_run',
                frames: this.anims.generateFrameNames('player', {
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

        if (!this.anims.exists('ninja_jump')) {
            this.anims.create({
                key: 'ninja_jump',
                frames: this.anims.generateFrameNames('player', {
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

        if (!this.anims.exists('ninja_die')) {
            this.anims.create({
                key: 'ninja_die',
                frames: this.anims.generateFrameNames('player', {
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

        if (!this.anims.exists('ninja_slash')) {
            this.anims.create({
                key: 'ninja_slash',
                frames: this.anims.generateFrameNames('player', {
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

        if (!this.anims.exists('map1_disappear_fx')) {
            this.anims.create({
                key: 'map1_disappear_fx',
                frames: this.anims.generateFrameNumbers(
                    MAP1_DISAPPEAR_SHEET_KEY,
                    { start: 0, end: 20 },
                ),
                frameRate: 24,
                repeat: 0,
            });
        }
        if (!this.anims.exists('m1_item_spin')) {
            this.anims.create({
                key: 'm1_item_spin',
                frames: this.anims.generateFrameNames(ITEM_ATLAS_KEY, {
                    prefix: 'map1_item_',
                    start: 0,
                    end: 3,
                    suffix: '.png',
                    zeroPad: 2,
                }),
                frameRate: 10,
                repeat: -1,
            });
        }

        if (!this.anims.exists('bird_fly')) {
            this.anims.create({
                key: 'bird_fly',
                frames: this.anims.generateFrameNames(BIRD_ATLAS_KEY, {
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

        if (!this.anims.exists('bird_die')) {
            this.anims.create({
                key: 'bird_die',
                frames: [
                    { key: BIRD_ATLAS_KEY, frame: 'bird/map1_bird_die.png' },
                ],
                frameRate: 1,
                repeat: 0,
            });
        }
        if (!this.anims.exists(BIRD_SKILL_ANIM_KEY)) {
            this.anims.create({
                key: BIRD_SKILL_ANIM_KEY,
                frames: this.anims.generateFrameNames(BIRD_SKILL_ATLAS_KEY, {
                    prefix: BIRD_SKILL_FRAME_PREFIX,
                    start: 0,
                    end: 15,
                    suffix: '.png',
                    zeroPad: 2,
                }),
                frameRate: 22,
                repeat: -1,
            });
        }

        this.ninja = new NinjaCat(
            this,
            CAT_FIXED_X,
            this.groundY,
            'ninja_jump_sfx',
            'ninja_slash_sfx',
        );
        this.tuneNinjaHitbox();
        this.bird = new Bird(this, 200, 100);
        this.physics.add.existing(this.bird.sprite);
        const birdBody = this.bird.sprite.body as Phaser.Physics.Arcade.Body;
        birdBody.setAllowGravity(false);
        birdBody.setImmovable(true);
        birdBody.setSize(
            this.bird.sprite.displayWidth * 0.7,
            this.bird.sprite.displayHeight * 0.7,
            true,
        );
        this.obstacleGroup = this.physics.add.group();
        this.itemGroup = this.physics.add.group();
        registerMap1EnemyAnims(this, M1_ENEMIES_ATLAS_KEY);
        this.setupHighEnemies();
        this.setupBottomEnemies();

        // Va chạm vật lý: player (mèo/chim) chạm obstacle thì game over.
        this.physics.add.overlap(
            this.ninja.sprite,
            this.obstacleGroup,
            (_cat, obj) => this.handlePlayerObstacleOverlap(obj as unknown),
            undefined,
            this,
        );
        this.physics.add.overlap(
            this.bird.sprite,
            this.obstacleGroup,
            (_bird, obj) => this.handlePlayerObstacleOverlap(obj as unknown),
            undefined,
            this,
        );
        this.physics.add.overlap(
            this.ninja.sprite,
            this.itemGroup,
            (_cat, obj) => this.collectBottomItem(obj as unknown),
            undefined,
            this,
        );

        this.createBackButton();
        this.createHud();
        this.setupDebugControls();
    }

    private setupHighEnemies(): void {
        const highAnimKeys = ['m1_bird_enemy', 'm1_air', 'm1_ufo'].filter((k) =>
            this.anims.exists(k),
        );
        if (highAnimKeys.length === 0) {
            return;
        }
        const bulletFrames = getBulletSingleFrameNames(this, M1_ENEMIES_ATLAS_KEY);

        this.time.addEvent({
            delay: 1600,
            loop: true,
            callback: () => {
                if (
                    this.isGameOver ||
                    this.physics.world.isPaused ||
                    this.debugConfig.freezeSpawning
                ) {
                    return;
                }
                const { width: w } = this.scale;
                const animKey = Phaser.Math.RND.pick(highAnimKeys);
                const first = firstFrameOfAnim(this, animKey);
                if (first === undefined) {
                    return;
                }
                const y = Phaser.Math.Between(70, Math.max(90, this.groundY - 160));
                const spr = this.physics.add.sprite(
                    w + 90,
                    y,
                    M1_ENEMIES_ATLAS_KEY,
                    first as string | number,
                );
                spr.setOrigin(0.5, 0.5);
                this.scaleHighEnemyByAnim(spr, animKey);
                if (animKey !== 'm1_ufo') {
                    spr.setFlipX(true);
                }
                spr.setDepth(80);
                this.obstacleGroup.add(spr);
                spr.setVelocityX(Phaser.Math.Between(-280, -360));
                spr.play(animKey, true);
                spr.setImmovable(true);
                (spr.body as Phaser.Physics.Arcade.Body).setAllowGravity(false);
                spr.setData('canHit', false);
                spr.setData('canSlash', true);
                this.highEnemies.push(spr);

                if (SHOOTER_ENEMY_ANIM_KEYS.has(animKey) && bulletFrames.length > 0) {
                    this.time.delayedCall(260, () => {
                        if (!spr.active) {
                            return;
                        }
                        this.spawnBulletVolleyFrom(spr, bulletFrames);
                    });
                }
            },
        });
    }

    private setupBottomEnemies(): void {
        const bottomFrames = this.textures
            .get(M1_ENEMIES_ATLAS_KEY)
            .getFrameNames()
            .filter((name) => name.includes('enemy/bottom/'));
        const limboFirstFrame = firstFrameOfAnim(this, 'm1_limbo');
        const mushroomFirstFrame = firstFrameOfAnim(this, 'm1_mushroom');
        const bottomSpawnPool = bottomFrames
            .filter(
                (name) =>
                    !name.includes('/limbo/') &&
                    !name.includes('/mushroom/'),
            )
            .concat(limboFirstFrame ? [LIMBO_SPAWN_TOKEN] : [])
            .concat(mushroomFirstFrame ? [MUSHROOM_SPAWN_TOKEN] : []);

        if (bottomSpawnPool.length === 0) {
            console.warn('m1_enemies: không có frame bottom để xem thử.');
            return;
        }
        const itemFrames = this.textures
            .get(ITEM_ATLAS_KEY)
            .getFrameNames()
            .filter((name) => name.endsWith('.png'));
        if (itemFrames.length === 0) {
            console.warn('map1_item: không có frame item để spawn.');
            return;
        }
        const resetItemBudget = (): void => {
            // Mỗi cụm enemy chỉ rải 1-3 item.
            this.itemSpawnBudgetLeft = Phaser.Math.Between(1, 3);
        };
        resetItemBudget();

        this.bottomEnemyManager = new Map1EnemyManager({
            scene: this,
            speedPxPerSec: Math.abs(BOTTOM_MOVE_SPEED_X),
            jumpTimeSec: NINJA_JUMP_AIR_TIME_SEC,
            pickFrame: () => Phaser.Math.RND.pick(bottomSpawnPool),
            spawnItemBetween: (speedPxPerSec: number, delayMs: number) => {
                if (this.itemSpawnBudgetLeft <= 0) {
                    resetItemBudget();
                    return;
                }
                const burstCount = Phaser.Math.Between(2, 3);
                const count = Math.min(burstCount, this.itemSpawnBudgetLeft);
                this.itemSpawnBudgetLeft -= count;
                const firstSpawnDelayMs = Math.max(120, delayMs);
                const burstGapMs = 130;
                for (let i = 0; i < count; i++) {
                    this.time.delayedCall(firstSpawnDelayMs + (i * burstGapMs), () => {
                        this.spawnBottomItem(speedPxPerSec, itemFrames);
                    });
                }
            },
            spawnOne: (pickedFrame: string, speedPxPerSec: number) => {
                const { width: w } = this.scale;
                const isLimboAnim = pickedFrame === LIMBO_SPAWN_TOKEN;
                const isMushroomAnim = pickedFrame === MUSHROOM_SPAWN_TOKEN;
                const frameName =
                    isLimboAnim && limboFirstFrame
                        ? String(limboFirstFrame)
                        : isMushroomAnim && mushroomFirstFrame
                            ? String(mushroomFirstFrame)
                            : pickedFrame;
                const spr = this.physics.add.sprite(
                    w + BOTTOM_SPAWN_OFFSCREEN_PX,
                    this.groundY,
                    M1_ENEMIES_ATLAS_KEY,
                    frameName,
                );
                spr.setOrigin(0.5, 1);

                const catHeight = this.ninja.sprite.displayHeight;
                const kind = isLimboAnim
                    ? 'm1_limbo'
                    : isMushroomAnim
                        ? 'm1_mushroom'
                        : inferBottomKindFromFrame(frameName);
                const ratio =
                    BOTTOM_SCALES[kind] ?? DEFAULT_BOTTOM_SCALE;
                const targetScale = (catHeight * ratio) / spr.height;
                spr.setScale(targetScale);

                const atlasFrame = this.textures
                    .get(M1_ENEMIES_ATLAS_KEY)
                    .get(frameName);
                const padSource =
                    bottomTransparentPaddingSourcePx(atlasFrame);
                const nudge = bottomFeetNudgePx(kind);
                const currentScale = Math.abs(spr.scaleY);
                spr.y = this.groundY;
                spr.y += (padSource + nudge) * currentScale;
                const MAX_SINK = 5;
                if (spr.y > this.groundY + MAX_SINK) {
                    spr.y = this.groundY + MAX_SINK;
                }
                if (isLimboAnim && this.anims.exists('m1_limbo')) {
                    spr.play('m1_limbo');
                }
                if (isMushroomAnim && this.anims.exists('m1_mushroom')) {
                    spr.play('m1_mushroom');
                }

                spr.setFlipX(true);
                spr.setDepth(44);
                this.obstacleGroup.add(spr);
                spr.setVelocityX(-Math.abs(speedPxPerSec));
                spr.setImmovable(true);
                (spr.body as Phaser.Physics.Arcade.Body).setAllowGravity(false);
                spr.setData('canHit', false);
                // Chỉ enemy có animation frame (limbo/mushroom) mới bị slash.
                // Bottom static (spike/tree...) bắt buộc người chơi phải nhảy qua.
                spr.setData('canSlash', isLimboAnim || isMushroomAnim);
                this.bottomObstacles.push(spr);
            },
        });
    }

    private spawnBottomItem(
        speedPxPerSec: number,
        itemFrames: string[],
    ): void {
        if (this.isGameOver || this.physics.world.isPaused || this.debugConfig.freezeSpawning) {
            return;
        }
        const frame = itemFrames.includes('map1_item_00.png')
            ? 'map1_item_00.png'
            : Phaser.Math.RND.pick(itemFrames);
        const { width: w } = this.scale;
        // Spawn từ mép phải như enemy bottom; timing delay sẽ đặt item vào khoảng giữa 2 enemy.
        const spawnX = w + BOTTOM_SPAWN_OFFSCREEN_PX;
        const item = this.physics.add.sprite(
            spawnX,
            this.groundY,
            ITEM_ATLAS_KEY,
            frame,
        );
        // Cùng logic xuất hiện như bottom enemy: neo đáy + scale theo chiều cao mèo.
        item.setOrigin(0.5, 1);
        const catHeight = Math.max(1, this.ninja.sprite.displayHeight);
        // Item atlas có vùng hiển thị thực tế rất nhỏ so với toàn frame 119x128,
        // nên ratio phải lớn hơn bottom-enemy thông thường để người chơi nhìn thấy rõ.
        const itemScaleRatio = 1.15;
        if (item.height > 0) {
            item.setScale((catHeight * itemScaleRatio) / item.height);
        }
        const atlasFrame = this.textures.get(ITEM_ATLAS_KEY).get(frame);
        const padSource = bottomTransparentPaddingSourcePx(atlasFrame);
        const currentScale = Math.abs(item.scaleY);
        item.y += padSource * currentScale;
        const MAX_SINK = 5;
        if (item.y > this.groundY + MAX_SINK) {
            item.y = this.groundY + MAX_SINK;
        }
        // Nhấc nhẹ khỏi mặt đất để phần flame không bị chìm và dễ quan sát.
        item.y -= Math.max(10, item.displayHeight * 0.12);
        item.setDepth(44);
        if (this.anims.exists('m1_item_spin')) {
            item.play('m1_item_spin', true);
        }
        this.itemGroup.add(item);
        // Sau khi add vào group, set lại body để tránh bị group default ghi đè.
        item.setVelocityX(-Math.abs(speedPxPerSec));
        item.setImmovable(true);
        const itemBody = item.body as Phaser.Physics.Arcade.Body;
        itemBody.setAllowGravity(false);
        itemBody.setSize(item.displayWidth * 0.5, item.displayHeight * 0.45, true);
        this.bottomItems.push(item);
        // // --- PASTE ĐOẠN DEBUG NÀY VÀO CUỐI HÀM ---
        // console.log('=== ITEM SPAWN DEBUG ===');
        // console.log(`Tọa độ (X, Y): (${item.x}, ${item.y})`);
        // console.log(
        //     `Kích thước (Width x Height): ${item.displayWidth} x ${item.displayHeight}`,
        // );
        // console.log(
        //     `Alpha: ${item.alpha}, Visible: ${item.visible}, Depth: ${item.depth}`,
        // );
        // console.log(
        //     'Gravity có bị ảnh hưởng không?',
        //     (item.body as Phaser.Physics.Arcade.Body).allowGravity,
        // );
        // console.log(
        //     `Velocity: (${item.body.velocity.x}, ${item.body.velocity.y})`,
        // );
        // console.log('=========================');
    }

    private collectBottomItem(obj: unknown): void {
        const item = obj as Phaser.Physics.Arcade.Sprite | undefined;
        if (!item || !item.active) {
            return;
        }
        this.bottomItems = this.bottomItems.filter((spr) => spr !== item);
        this.itemGroup.remove(item, true, true);
        if (this.cache.audio.exists(ITEM_COLLECT_SFX_KEY)) {
            this.sound.play(ITEM_COLLECT_SFX_KEY, { volume: 0.62 });
        }
        this.firePassCount += 1;
        if (this.firePassCount >= 3) {
            this.firePassCount = 0;
            this.playerMana += 1;
            this.refreshHud();
        }
    }

    /** Slash: vùng overlap lớn phía trước mèo; chỉ enemy có `canSlash` (không gồm đạn). */
    private applySlashHits(): void {
        const rect = this.ninja.getSlashOverlapRect();
        const hit = (spr: Phaser.Physics.Arcade.Sprite) => {
            if (!spr.active || !spr.getData('canSlash')) {
                return false;
            }
            return Phaser.Geom.Rectangle.Overlaps(rect, spr.getBounds());
        };
        const bottomHits = this.bottomObstacles.filter(hit);
        const highHits = this.highEnemies.filter(hit);
        for (const spr of bottomHits) {
            this.killEnemyWithDisappear(spr);
        }
        for (const spr of highHits) {
            this.killEnemyWithDisappear(spr);
        }
    }

    private killEnemyWithDisappear(enemy: Phaser.Physics.Arcade.Sprite): void {
        if (!enemy.active || enemy.getData('canSlash') !== true) {
            return;
        }
        const bounds = enemy.getBounds();
        const scale = Phaser.Math.Clamp(
            (enemy.displayWidth / 256) * 1.12,
            0.12,
            3.2,
        );

        this.bottomObstacles = this.bottomObstacles.filter((s) => s !== enemy);
        this.highEnemies = this.highEnemies.filter((s) => s !== enemy);
        this.obstacleGroup.remove(enemy, true, true);

        const vfx = this.add.sprite(
            bounds.centerX,
            bounds.centerY,
            MAP1_DISAPPEAR_SHEET_KEY,
            0,
        );
        vfx.setOrigin(0.5, 0.5);
        vfx.setDepth(220);
        vfx.setScale(scale);
        vfx.setAlpha(1);

        if (this.anims.exists('map1_disappear_fx')) {
            vfx.play('map1_disappear_fx');
            vfx.on(
                'animationupdate',
                (
                    _anim: Phaser.Animations.Animation,
                    frame: Phaser.Animations.AnimationFrame,
                ) => {
                    const idx = frame.index;
                    vfx.setAlpha(Math.max(0, 1 - idx / 21));
                },
            );
            vfx.once('animationcomplete', () => {
                vfx.destroy();
            });
        } else {
            this.tweens.add({
                targets: vfx,
                alpha: 0,
                duration: 700,
                ease: 'Cubic.easeIn',
                onComplete: () => {
                    vfx.destroy();
                },
            });
        }
    }

    update(time: number) {
        if (this.isGameOver) {
            return;
        }
        const hd = this.tracker.handData;

        for (let i = 0; i < this.bgLayers.length; i++) {
            this.bgLayers[i].tilePositionX += BG_SCROLL_X[i];
        }

        this.bird.updateFromHand(hd);
        this.updateBirdSkillByRightHand(time);

        this.ninja.updateSlashGesture(hd);
        this.prevGrab = this.ninja.updateFromHand(hd, this.prevGrab);

        this.ninja.sprite.setVelocityX(0);
        this.ninja.sprite.x = CAT_FIXED_X;
        if (!this.debugConfig.freezeSpawning) {
            this.bottomEnemyManager?.update(time);
        }
        if (this.ninja.isSlashDamageActive(time)) {
            this.applySlashHits();
        }
        // Chỉ bật hit cho obstacle khi đã tiến gần vùng chơi (tránh pause sớm ở mép phải).
        const armHitX = CAT_FIXED_X + 220;
        this.obstacleGroup.children.iterate((child) => {
            const spr = child as Phaser.Physics.Arcade.Sprite | null;
            if (!spr || !spr.active || spr.getData('canHit')) {
                return true;
            }
            if (spr.x <= armHitX) {
                spr.setData('canHit', true);
            }
            return true;
        });

        // Vật cản đất tự hủy khi chạy ra ngoài mép trái màn hình.
        this.bottomObstacles = this.bottomObstacles.filter((spr) => {
            if (!spr.active) {
                return false;
            }
            if (spr.x < DESTROY_OFFSCREEN_X) {
                spr.destroy();
                return false;
            }
            return true;
        });
        this.highEnemies = this.highEnemies.filter((spr) => {
            if (!spr.active) {
                return false;
            }
            if (spr.x < DESTROY_OFFSCREEN_X - 40) {
                spr.destroy();
                return false;
            }
            return true;
        });
        this.bottomItems = this.bottomItems.filter((spr) => {
            if (!spr.active) {
                return false;
            }
            if (spr.x < DESTROY_OFFSCREEN_X) {
                spr.destroy();
                return false;
            }
            return true;
        });
        this.updateBirdSkillProjectiles();

        this.updateDebugOverlay();
    }

    private updateBirdSkillByRightHand(nowMs: number): void {
        const rightGrab = this.tracker.handData.hasRightHand && this.tracker.handData.isRightGrab;
        const justGrabbed = rightGrab && !this.prevRightGrab;
        this.prevRightGrab = rightGrab;

        if (
            justGrabbed &&
            this.playerMana >= this.birdSkillManaCost &&
            nowMs >= this.birdSkillActiveUntilMs
        ) {
            this.playerMana -= this.birdSkillManaCost;
            this.refreshHud();
            this.birdSkillActiveUntilMs = nowMs + this.birdSkillDurationMs;
            this.birdSkillLastShotAtMs = nowMs - this.birdSkillShotGapMs;
        }

        const skillActive = nowMs < this.birdSkillActiveUntilMs;
        if (
            this.bird.sprite.active &&
            this.bird.sprite.anims.currentAnim?.key !== 'bird_die'
        ) {
            const animKey = skillActive ? BIRD_SKILL_ANIM_KEY : 'bird_fly';
            if (this.bird.sprite.anims.currentAnim?.key !== animKey && this.anims.exists(animKey)) {
                this.bird.sprite.play(animKey, true);
            }
            this.bird.sprite.setScale(skillActive ? this.birdSkillActiveScale : 1);
        }
        if (!skillActive) {
            return;
        }
        if (nowMs - this.birdSkillLastShotAtMs < this.birdSkillShotGapMs) {
            return;
        }
        const target = this.findNearestEnemyAheadOfBird();
        if (!target) {
            return;
        }
        this.spawnBirdSkillProjectile(target);
        this.birdSkillLastShotAtMs = nowMs;
    }

    private findNearestEnemyAheadOfBird(): Phaser.Physics.Arcade.Sprite | null {
        const candidates = [...this.highEnemies, ...this.bottomObstacles].filter((spr) => {
            if (!spr.active || spr.x <= this.bird.sprite.x - 12) {
                return false;
            }
            // Chỉ lock mục tiêu vào high enemy và bottom enemy có animation frame (canSlash=true).
            if (this.highEnemies.includes(spr)) {
                return true;
            }
            return spr.getData('canSlash') === true;
        });
        if (candidates.length === 0) {
            return null;
        }
        const byDistance = candidates.sort((a, b) => {
            const da = Phaser.Math.Distance.Between(this.bird.sprite.x, this.bird.sprite.y, a.x, a.y);
            const db = Phaser.Math.Distance.Between(this.bird.sprite.x, this.bird.sprite.y, b.x, b.y);
            return da - db;
        });
        return byDistance[0] ?? null;
    }

    private spawnBirdSkillProjectile(target: Phaser.Physics.Arcade.Sprite): void {
        const bullet = this.physics.add.sprite(
            this.bird.sprite.x + 14,
            this.bird.sprite.y,
            BIRD_SKILL_ATLAS_KEY,
            `${BIRD_SKILL_FRAME_PREFIX}00.png`,
        );
        bullet.setOrigin(0.5, 0.5);
        bullet.setDepth(115);
        const targetWidth = 26;
        if (bullet.width > 0) {
            bullet.setScale(targetWidth / bullet.width);
        }
        bullet.setData('targetEnemy', target);
        bullet.setVelocityX(420);
        bullet.setImmovable(true);
        const body = bullet.body as Phaser.Physics.Arcade.Body;
        body.setAllowGravity(false);
        body.setCircle(Math.max(4, bullet.displayWidth * 0.24), 0, 0);
        this.birdSkillProjectiles.push(bullet);
    }

    private updateBirdSkillProjectiles(): void {
        this.birdSkillProjectiles = this.birdSkillProjectiles.filter((bullet) => {
            if (!bullet.active) {
                return false;
            }
            let target = bullet.getData('targetEnemy') as Phaser.Physics.Arcade.Sprite | undefined;
            if (!target || !target.active) {
                target = this.findNearestEnemyAheadOfBird() ?? undefined;
                bullet.setData('targetEnemy', target);
            }
            if (target) {
                const angle = Phaser.Math.Angle.Between(
                    bullet.x,
                    bullet.y,
                    target.x,
                    target.y,
                );
                this.physics.velocityFromRotation(angle, 560, (bullet.body as Phaser.Physics.Arcade.Body).velocity);
                const hitRadius = Math.max(16, (target.displayWidth + target.displayHeight) * 0.2);
                if (Phaser.Math.Distance.Between(bullet.x, bullet.y, target.x, target.y) <= hitRadius) {
                    this.killEnemyWithDisappear(target);
                    bullet.destroy();
                    return false;
                }
            } else {
                bullet.setVelocityX(460);
            }
            if (
                bullet.x > this.scale.width + 60 ||
                bullet.x < DESTROY_OFFSCREEN_X - 60 ||
                bullet.y < -80 ||
                bullet.y > this.scale.height + 80
            ) {
                bullet.destroy();
                return false;
            }
            return true;
        });
    }

    /**
     * High: bird-enemy ngang bằng chim; air/ufo to hơn chim một chút (tối đa ~400px ngang).
     */
    private scaleHighEnemyByAnim(
        spr: Phaser.GameObjects.Sprite,
        animKey: string,
    ): void {
        const birdW = Math.max(1, this.bird.sprite.displayWidth);
        let targetW = birdW;
        if (animKey === 'm1_bird_enemy') {
            targetW = birdW;
        } else if (
            animKey === 'm1_air' ||
            animKey === 'm1_ufo' ||
            SHOOTER_ENEMY_ANIM_KEYS.has(animKey)
        ) {
            targetW = Math.min(birdW * 1.15, MAX_HIGH_BODY_WIDTH_PX);
        } else {
            targetW = Math.min(birdW, MAX_HIGH_BODY_WIDTH_PX);
        }
        if (spr.width > 0) {
            spr.setScale(targetW / spr.width);
        }
    }

    /**
     * Chướng ngại đất: chuẩn **chiều cao** mèo — `displayHeight` cản ≈ `ratio × catHeight`.
     * Tránh ép theo width (vật mỏng bị phóng to dọc).
     */
    private scaleBottomEnemyToNinjaCat(
        spr: Phaser.GameObjects.Sprite,
        bottomKind: string,
    ): void {
        const catHeight = Math.max(1, this.ninja.sprite.displayHeight);
        const ratio =
            BOTTOM_SCALES[bottomKind] ?? DEFAULT_BOTTOM_SCALE;
        if (spr.height <= 0) {
            return;
        }
        const targetScale = (catHeight * ratio) / spr.height;
        spr.setScale(targetScale);
    }

    /** Đạn nhỏ so với chim */
    private scaleBulletSprite(b: Phaser.GameObjects.Sprite): void {
        const targetW = Phaser.Math.Clamp(
            this.bird.sprite.displayWidth * 0.22,
            14,
            40,
        );
        if (b.width > 0) {
            b.setScale(targetW / b.width);
        }
    }

    /**
     * Đạn từng frame (không anim gộp), chỉ gọi kèm air/ufo — hơi lệch thời gian cho cảm giác bắn.
     */
    private spawnBulletVolleyFrom(
        shooter: Phaser.Physics.Arcade.Sprite,
        bulletFrames: string[],
    ): void {
        const count = Phaser.Math.Between(3, 6);
        for (let i = 0; i < count; i++) {
            this.time.delayedCall(i * 55, () => {
                if (!shooter.active) {
                    return;
                }
                const frame = Phaser.Math.RND.pick(bulletFrames);
                const b = this.physics.add.sprite(
                    shooter.x - 24,
                    shooter.y + Phaser.Math.Between(-20, 20),
                    M1_ENEMIES_ATLAS_KEY,
                    frame,
                );
                b.setOrigin(0.5, 0.5);
                this.scaleBulletSprite(b);
                b.setDepth(101);
                b.setFlipX(true);
                this.obstacleGroup.add(b);
                b.setVelocityX(Phaser.Math.Between(-400, -560));
                b.setImmovable(true);
                (b.body as Phaser.Physics.Arcade.Body).setAllowGravity(false);
                b.setData('canHit', false);
                b.setData('canSlash', false);
                this.time.delayedCall(2000, () => {
                    b.destroy();
                });
            });
        }
    }

    private handlePlayerObstacleOverlap(obj: unknown): void {
        const obstacle = obj as Phaser.Physics.Arcade.Sprite | undefined;
        if (this.isGameOver || this.physics.world.isPaused) {
            return;
        }
        if (!obstacle) {
            return;
        }
        // Tránh "chết từ trong trứng" khi obstacle còn ở ngoài màn phải.
        if (!obstacle.active || !obstacle.getData('canHit')) {
            return;
        }
        if (this.debugConfig.godMode) {
            this.ninja.sprite.setTint(0x65ff7f);
            this.bird.sprite.setTint(0x65ff7f);
            return;
        }
        const now = this.time.now;
        if (now - this.lastEnemyDamageAtMs < this.enemyDamageCooldownMs) {
            return;
        }
        this.lastEnemyDamageAtMs = now;
        this.playerHealth -= 1;
        this.refreshHud();
        if (this.playerHealth > 0) {
            this.ninja.sprite.setTintFill(0xff7f7f);
            this.bird.sprite.setTintFill(0xff7f7f);
            this.time.delayedCall(160, () => {
                if (!this.isGameOver) {
                    this.ninja.sprite.clearTint();
                    this.bird.sprite.clearTint();
                }
            });
            return;
        }

        this.isGameOver = true;
        this.birdSkillActiveUntilMs = 0;
        for (const bullet of this.birdSkillProjectiles) {
            bullet.destroy();
        }
        this.birdSkillProjectiles = [];
        this.physics.pause();
        this.stopMap1ThemeMusic();

        this.ninja.sprite.setVelocity(0, 0);
        if (this.anims.exists('ninja_die')) {
            this.ninja.sprite.play('ninja_die', true);
        }
        if (this.anims.exists('bird_die')) {
            this.bird.sprite.play('bird_die', true);
        }

        this.add
            .text(this.scale.width / 2, this.scale.height / 2, 'GAME OVER', {
                fontFamily: 'Arial',
                fontSize: '52px',
                color: '#ff4d4f',
                stroke: '#111',
                strokeThickness: 6,
            })
            .setOrigin(0.5)
            .setDepth(999);
        this.time.delayedCall(2000, () => {
            this.scene.start('StartMenuScene', { tracker: this.tracker });
        });
    }

    private createHud(): void {
        this.refreshHud();
    }

    private refreshHud(): void {
        for (const icon of this.hudHealthIcons) {
            icon.destroy();
        }
        for (const icon of this.hudManaIcons) {
            icon.destroy();
        }
        this.hudHealthIcons = [];
        this.hudManaIcons = [];

        const { width } = this.scale;
        const topY = 24;
        const gap = 30;
        const healthScale = 0.16;
        const manaScale = 0.14;
        const healthStartX = width - 22;
        const manaStartX = width - 22;
        const manaRowY = topY + 30;

        for (let i = 0; i < this.playerHealth; i++) {
            const icon = this.add
                .image(healthStartX - (i * gap), topY, HUD_HEALTH_ICON_KEY)
                .setOrigin(1, 0)
                .setScale(healthScale)
                .setDepth(1100)
                .setScrollFactor(0);
            this.hudHealthIcons.push(icon);
        }
        for (let i = 0; i < this.playerMana; i++) {
            const icon = this.add
                .image(manaStartX - (i * gap), manaRowY, HUD_MANA_ICON_KEY)
                .setOrigin(1, 0)
                .setScale(manaScale)
                .setDepth(1100)
                .setScrollFactor(0);
            this.hudManaIcons.push(icon);
        }
    }

    private createBackButton(): void {
        const backBtn = this.add
            .image(36, 36, 'button_back')
            .setOrigin(0, 0)
            .setDepth(1000)
            .setScrollFactor(0);
        const maxW = 66;
        const scale = backBtn.width > 0 ? maxW / backBtn.width : 1;
        backBtn.setScale(scale);
        backBtn.setInteractive({ useHandCursor: true });
        backBtn.on('pointerover', () => {
            backBtn.setAlpha(0.85);
        });
        backBtn.on('pointerout', () => {
            backBtn.setAlpha(1);
        });
        backBtn.on('pointerdown', () => {
            if (this.isGameOver) {
                return;
            }
            this.stopMap1ThemeMusic();
            this.scene.start('StartMenuScene', { tracker: this.tracker });
        });
    }

    private tuneNinjaHitbox(): void {
        const body = this.ninja.sprite.body as Phaser.Physics.Arcade.Body;
        const hitW = this.ninja.sprite.displayWidth * 0.44;
        const hitH = this.ninja.sprite.displayHeight * 0.8;
        body.setSize(hitW, hitH, true);
    }

    private setupDebugControls(): void {
        this.debugGraphics = this.add.graphics();
        this.debugGraphics.setDepth(1200).setVisible(false);
        this.debugText = this.add
            .text(10, 10, '', {
                fontFamily: 'Consolas, monospace',
                fontSize: '14px',
                color: '#7CFC00',
                backgroundColor: '#000000bb',
                padding: { x: 8, y: 6 },
            })
            .setDepth(1201)
            .setScrollFactor(0)
            .setVisible(false);

        this.input.keyboard?.on('keydown-H', () => {
            this.debugConfig.enabled = !this.debugConfig.enabled;
            this.debugText.setVisible(this.debugConfig.enabled);
            this.tracker.setHandSkeletonDebug(this.debugConfig.enabled);
            if (!this.debugConfig.enabled) {
                this.debugConfig.godMode = false;
                this.debugConfig.freezeSpawning = false;
                this.debugConfig.showHitboxes = false;
                this.debugConfig.timeScale = 1;
                this.ninja.sprite.clearTint();
                this.bird.sprite.clearTint();
                this.debugGraphics.clear();
                this.debugGraphics.setVisible(false);
            }
            this.applyDebugPhysicsTimeScale();
        });
        this.input.keyboard?.on('keydown-G', () => {
            if (!this.debugConfig.enabled) return;
            this.debugConfig.godMode = !this.debugConfig.godMode;
            if (!this.debugConfig.godMode) {
                this.ninja.sprite.clearTint();
                this.bird.sprite.clearTint();
            }
        });
        this.input.keyboard?.on('keydown-F', () => {
            if (!this.debugConfig.enabled) return;
            this.debugConfig.freezeSpawning = !this.debugConfig.freezeSpawning;
        });
        this.input.keyboard?.on('keydown-B', () => {
            if (!this.debugConfig.enabled) return;
            this.debugConfig.showHitboxes = !this.debugConfig.showHitboxes;
        });
        this.input.keyboard?.on('keydown-T', () => {
            if (!this.debugConfig.enabled) return;
            this.debugConfig.timeScale =
                this.debugConfig.timeScale >= 2.5
                    ? 1
                    : Number((this.debugConfig.timeScale + 0.5).toFixed(1));
            this.applyDebugPhysicsTimeScale();
        });
    }

    private applyDebugPhysicsTimeScale(): void {
        const scale = this.debugConfig.enabled ? this.debugConfig.timeScale : 1;
        this.physics.world.timeScale = scale;
    }

    private updateDebugOverlay(): void {
        if (!this.debugConfig.enabled) {
            return;
        }
        this.debugText.setText([
            'DEBUG MODE (H: OFF)',
            'G: GodMode  F: FreezeSpawn  B: Hitbox  T: TimeScale',
            'Webcam: 21 điểm + xương tay (MediaPipe)',
            `God Mode: ${this.debugConfig.godMode ? 'ON' : 'OFF'}`,
            `Freeze Spawning: ${this.debugConfig.freezeSpawning ? 'ON' : 'OFF'}`,
            `Show Hitboxes: ${this.debugConfig.showHitboxes ? 'ON' : 'OFF'}`,
            `Time Scale: ${this.physics.world.timeScale.toFixed(1)}x`,
            `Bottom Speed: ${BOTTOM_MOVE_SPEED_X} px/s`,
            `Active Obstacles: ${this.obstacleGroup.countActive(true)}`,
            `FPS: ${Math.round(this.game.loop.actualFps)}`,
        ]);

        this.debugGraphics.clear();
        if (!this.debugConfig.showHitboxes) {
            this.debugGraphics.setVisible(false);
            return;
        }
        this.debugGraphics.setVisible(true);
        this.drawBodyBox(this.ninja.sprite, 0x00ff66);
        this.drawBodyBox(this.bird.sprite, 0x00e5ff);
        this.obstacleGroup.children.iterate((child) => {
            const spr = child as Phaser.Physics.Arcade.Sprite | null;
            if (!spr || !spr.active) {
                return true;
            }
            this.drawBodyBox(spr, 0xff4444);
            return true;
        });
    }

    private drawBodyBox(
        obj: Phaser.GameObjects.GameObject,
        color: number,
    ): void {
        const withBody = obj as Phaser.GameObjects.GameObject & {
            body?: Phaser.Physics.Arcade.Body | Phaser.Physics.Arcade.StaticBody;
        };
        if (!withBody.body) {
            return;
        }
        const body = withBody.body as Phaser.Physics.Arcade.Body;
        this.debugGraphics.lineStyle(1.5, color, 0.95);
        this.debugGraphics.strokeRect(body.x, body.y, body.width, body.height);
    }

    private startMap1ThemeMusic(): void {
        this.stopMap1ThemeMusic();
        if (!this.cache.audio.exists('map1_theme')) {
            return;
        }
        this.map1ThemeMusic = this.sound.add('map1_theme', {
            loop: true,
            volume: 0.38,
        });
        this.map1ThemeMusic.play();
    }

    private stopMap1ThemeMusic(): void {
        if (this.map1ThemeMusic) {
            if (this.map1ThemeMusic.isPlaying) {
                this.map1ThemeMusic.stop();
            }
            this.map1ThemeMusic.destroy();
            this.map1ThemeMusic = null;
        }
    }
}
