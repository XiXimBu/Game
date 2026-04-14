import Phaser from 'phaser';
import type { HandTracker } from '../core/handle.trackhand.js';

export class StartMenuScene extends Phaser.Scene {
    private tracker: HandTracker | null = null;
    private bgLayers: Phaser.GameObjects.TileSprite[] = [];
    private menuMusic: Phaser.Sound.BaseSound | null = null;

    constructor() {
        super({ key: 'StartMenuScene' });
    }

    init(data: { tracker?: HandTracker }) {
        this.tracker = data.tracker ?? null;
    }

    preload() {
        for (let i = 1; i <= 5; i++) {
            this.load.image(
                `menu_bg_layer${i}`,
                new URL(`../assets/menu/background/bg_map1_layer${i}.png`, import.meta.url).href,
            );
        }
        this.load.audio(
            'menu_music',
            new URL('../assets/menu/music/menu_music.mp3', import.meta.url).href,
        );
    }

    create() {
        const { width, height } = this.scale;
        const uiCenterX = width * 0.5;

        // 1) Vẽ nền parallax
        const bgKeys = [1, 2, 3, 4, 5] as const;
        bgKeys.forEach((idx, order) => {
            const layer = this.add.tileSprite(
                width / 2, height / 2, width, height, `menu_bg_layer${idx}`
            );
            layer.setOrigin(0.5, 0.5);
            layer.setDepth(order);
            this.bgLayers.push(layer);
        });

        // 2) Tiêu đề game
        this.add.text(uiCenterX, height * 0.3, 'NINJA CAT & BIRD', {
            fontSize: '56px',
            color: '#ffffff',
            fontStyle: 'bold',
            stroke: '#1f1f1f',
            strokeThickness: 8,
        })
            .setOrigin(0.5)
            .setDepth(30);

        // 3) Không dùng button ở menu nữa: chạm/click bất kỳ để vào game.
        const startHint = this.add
            .text(uiCenterX, height * 0.72, 'CLICK / TAP TO START', {
                fontSize: '30px',
                color: '#ffffff',
                fontStyle: 'bold',
                stroke: '#1f1f1f',
                strokeThickness: 6,
            })
            .setOrigin(0.5)
            .setDepth(31);

        // Phát nhạc menu khi vào scene (loop nhẹ).
        if (!this.menuMusic) {
            this.menuMusic = this.sound.add('menu_music', {
                loop: true,
                volume: 0.45,
            });
        }
        if (!this.menuMusic.isPlaying) {
            this.menuMusic.play();
        }

        const startGame = () => {
            const tracker =
                this.tracker ??
                ((this.game as Phaser.Game & { tracker?: HandTracker }).tracker ??
                    null);
            if (!tracker) {
                console.warn('StartMenuScene: chưa có tracker để vào MainScene.');
                return;
            }
            if (this.menuMusic?.isPlaying) {
                this.menuMusic.stop();
            }
            this.scene.start('MainScene', { tracker });
        };

        this.input.once('pointerdown', startGame);
        this.input.keyboard?.once('keydown-SPACE', startGame);
        this.input.keyboard?.once('keydown-ENTER', startGame);

        this.tweens.add({
            targets: startHint,
            alpha: { from: 1, to: 0.5 },
            duration: 650,
            yoyo: true,
            repeat: -1,
        });
    }

    update() {
        const speeds = [0.12, 0.2, 0.34, 0.52, 0.72];
        for (let i = 0; i < this.bgLayers.length; i++) {
            this.bgLayers[i].tilePositionX += speeds[i] ?? 0.15;
        }
    }
}