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

export class MainScene extends Phaser.Scene {
    private ninja!: NinjaCat;
    private bird!: Bird;
    private tracker!: HandTracker;
    private bgLayers: Phaser.GameObjects.TileSprite[] = [];
    private prevGrab = false;
    /** Mặt đất cố định (không dùng `ninja.sprite.y` — khi nhảy Y thay đổi). */
    private groundY = 0;
    private obstacleGroup!: Phaser.Physics.Arcade.Group;
    private bottomObstacles: Phaser.Physics.Arcade.Sprite[] = [];
    private highEnemies: Phaser.Physics.Arcade.Sprite[] = [];
    private bottomEnemyManager: Map1EnemyManager | null = null;
    private isGameOver = false;
    private map1ThemeMusic: Phaser.Sound.BaseSound | null = null;
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
    }

    create() {
        const { width, height } = this.scale;
        // Sau game over, Arcade world có thể vẫn đang pause — bắt buộc resume để ván mới chạy bình thường.
        this.physics.resume();
        this.isGameOver = false;
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

        this.ninja = new NinjaCat(this, CAT_FIXED_X, this.groundY, 'ninja_jump_sfx');
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

        this.createBackButton();
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

        this.bottomEnemyManager = new Map1EnemyManager({
            scene: this,
            speedPxPerSec: Math.abs(BOTTOM_MOVE_SPEED_X),
            jumpTimeSec: NINJA_JUMP_AIR_TIME_SEC,
            pickFrame: () => Phaser.Math.RND.pick(bottomSpawnPool),
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
                this.bottomObstacles.push(spr);
            },
        });
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

        this.prevGrab = this.ninja.updateFromHand(hd, this.prevGrab);

        this.ninja.sprite.setVelocityX(0);
        this.ninja.sprite.x = CAT_FIXED_X;
        if (!this.debugConfig.freezeSpawning) {
            this.bottomEnemyManager?.update(time);
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

        this.updateDebugOverlay();
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

        this.isGameOver = true;
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
