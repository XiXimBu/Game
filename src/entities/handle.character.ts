import Phaser from 'phaser';
import type { HandData } from '../core/handle.trackhand.js';

const PLAYER_TEXTURE_KEY = 'player';
const PLAYER_FIRST_FRAME = 'ninja cat/run/ninja-run_00.png';
const PLAYER_SCALE = 0.2;
const BIRD_TEXTURE_KEY = 'bird_atlas';
const BIRD_FIRST_FRAME = 'bird/map1_bird_fly_00.png';
const BIRD_LERP = 0.12;

/** Mèo ninja trên mặt đất — neo X cố định, nhảy khi nắm tay + chạm đất */
export class NinjaCat {
    readonly sprite: Phaser.Physics.Arcade.Sprite;
    private readonly scene: Phaser.Scene;
    private readonly jumpSoundKey?: string;

    constructor(
        scene: Phaser.Scene,
        fixedX: number,
        groundY: number,
        jumpSoundKey?: string,
    ) {
        this.scene = scene;
        this.jumpSoundKey = jumpSoundKey;
        this.sprite = scene.physics.add.sprite(
            fixedX,
            groundY,
            PLAYER_TEXTURE_KEY,
            PLAYER_FIRST_FRAME,
        );
        this.sprite.setScale(PLAYER_SCALE);
        this.sprite.setOrigin(0.5, 1);
        this.sprite.setDepth(45);
        this.sprite.setCollideWorldBounds(true);
        this.sprite.setGravityY(1200);
        this.sprite.play('ninja_run');
    }

    /** Chỉ tay trái nắm → nhảy. @returns trạng thái nắm tay trái frame này (prevGrab ở scene) */
    updateFromHand(handData: HandData, prevGrab: boolean): boolean {
        const body = this.sprite.body as Phaser.Physics.Arcade.Body;

        if (!handData.hasLeftHand) {
            return false;
        }

        const nextGrab = handData.isGrab;
        const justGrabbed = handData.isGrab && !prevGrab;

        if (justGrabbed && body.blocked.down) {
            this.sprite.setVelocityY(-600);
            if (this.sprite.anims.exists('ninja_jump')) {
                this.sprite.play('ninja_jump', true);
            }
            if (
                this.jumpSoundKey &&
                this.scene.cache.audio.exists(this.jumpSoundKey)
            ) {
                this.scene.sound.play(this.jumpSoundKey, { volume: 0.55 });
            }
        } else if (
            body.blocked.down &&
            this.sprite.anims.currentAnim?.key !== 'ninja_run'
        ) {
            this.sprite.play('ninja_run', true);
        }

        return nextGrab;
    }
}

/** Chim điều khiển bằng tay phải: nội suy mượt theo tọa độ chuẩn hóa từ HandTracker */
export class Bird {
    readonly sprite: Phaser.GameObjects.Sprite;
    private readonly scene: Phaser.Scene;

    constructor(scene: Phaser.Scene, x = 200, y = 100) {
        this.scene = scene;
        this.sprite = scene.add.sprite(x, y, BIRD_TEXTURE_KEY, BIRD_FIRST_FRAME);
        this.sprite.setOrigin(0.5, 0.5);
        this.sprite.setDepth(50);
        this.sprite.play('bird_fly');
    }

    updateFromHand(handData: HandData): void {
        if (!handData.hasRightHand) {
            return;
        }
        const { width, height } = this.scene.scale;
        const tx = handData.normX * width;
        const ty = handData.normY * height;
        this.sprite.x = Phaser.Math.Linear(this.sprite.x, tx, BIRD_LERP);
        this.sprite.y = Phaser.Math.Linear(this.sprite.y, ty, BIRD_LERP);
    }
}
