import Phaser from 'phaser';
import { Bird, NinjaCat } from '../entities/handle.character.js';
import type { HandTracker } from '../core/handle.trackhand.js';
import { CAT_FIXED_X, GROUND_MARGIN } from './map1-enemy.config.js';

const MAP2_BG_KEY = 'bg_map2';

export class Map2Scene extends Phaser.Scene {
    private ninja!: NinjaCat;
    private bird!: Bird;
    private tracker!: HandTracker;
    private groundY = 0;
    private inCutscene = false;
    private prevGrab = false;

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
        // Reuse player atlas (MainScene cũng load, nhưng preload ở đây để scene chạy độc lập).
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
        this.inCutscene = false;
        this.prevGrab = false;

        this.groundY = height - GROUND_MARGIN;
        this.physics.world.setBounds(0, 0, width, this.groundY);

        const bg = this.add.image(width / 2, height / 2, MAP2_BG_KEY);
        bg.setOrigin(0.5, 0.5);
        bg.setDepth(0);
        // Fit nền theo màn.
        if (bg.width > 0 && bg.height > 0) {
            const sx = width / bg.width;
            const sy = height / bg.height;
            bg.setScale(sx, sy);
        }

        // Anim cơ bản để “hành động như map1”
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
        if (!this.anims.exists('bird_fly')) {
            this.anims.create({
                key: 'bird_fly',
                frames: this.anims.generateFrameNames('bird_atlas', {
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

        this.ninja = new NinjaCat(
            this,
            CAT_FIXED_X,
            this.groundY,
            'ninja_jump_sfx',
            'ninja_slash_sfx',
        );
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

        // Hook cutscene: về sau chỉ cần set inCutscene=true và điều khiển camera/tween.
        this.cameras.main.fadeIn(420, 0, 0, 0);
    }

    update(time: number) {
        if (this.inCutscene) {
            return;
        }
        const hd = this.tracker.handData;
        this.bird.updateFromHand(hd);
        this.ninja.updateSlashGesture(hd);
        this.prevGrab = this.ninja.updateFromHand(hd, this.prevGrab);
        this.ninja.sprite.setVelocityX(0);
        this.ninja.sprite.x = CAT_FIXED_X;
    }

    startCutscene(): void {
        this.inCutscene = true;
    }
}

