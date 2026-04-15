import Phaser from 'phaser';
import type { HandData } from '../core/handle.trackhand.js';

const PLAYER_TEXTURE_KEY = 'player';
const PLAYER_FIRST_FRAME = 'ninja cat/run/ninja-run_00.png';
const PLAYER_SLASH_FIRST_FRAME = 'ninja cat/slash/ninja-slash_00.png';
const PLAYER_SCALE = 0.11;
const BIRD_TEXTURE_KEY = 'bird_atlas';
const BIRD_FIRST_FRAME = 'bird/map1_bird_fly_00.png';
const BIRD_LERP = 0.12;

/** Mèo ninja trên mặt đất — neo X cố định, nhảy khi nắm tay + chạm đất */
export class NinjaCat {
    readonly sprite: Phaser.Physics.Arcade.Sprite;
    private readonly scene: Phaser.Scene;
    private readonly jumpSoundKey?: string;
    private readonly slashSoundKey?: string;
    private prevOneGesture = false;
    private slashing = false;
    private slashCooldownUntil = 0;
    private slashLockUntil = 0;

    constructor(
        scene: Phaser.Scene,
        fixedX: number,
        groundY: number,
        jumpSoundKey?: string,
        slashSoundKey?: string,
    ) {
        this.scene = scene;
        this.jumpSoundKey = jumpSoundKey;
        this.slashSoundKey = slashSoundKey;
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

        this.sprite.on('animationcomplete', (anim: Phaser.Animations.Animation) => {
            if (anim.key !== 'ninja_slash') {
                return;
            }
            this.slashing = false;
            this.slashLockUntil = 0;
            this.slashCooldownUntil = this.scene.time.now + 650;
            const body = this.sprite.body as Phaser.Physics.Arcade.Body;
            if (body.blocked.down) {
                this.sprite.play('ninja_run', true);
            } else if (this.sprite.anims.exists('ninja_jump')) {
                this.sprite.play('ninja_jump', true);
            }
        });
    }

    isSlashing(): boolean {
        return this.slashing;
    }

    isSlashDamageActive(nowMs: number): boolean {
        return this.slashing && nowMs < this.slashLockUntil;
    }

    /**
     * Vùng chém mở rộng về phía phải (hướng quái tới), không đổi hitbox va chạm chết.
     * Scene sẽ chỉ áp damage cho enemy có `canSlash = true`.
     */
    getSlashOverlapRect(): Phaser.Geom.Rectangle {
        const b = this.sprite.getBounds();
        // Giảm tầm chém để chỉ trúng enemy gần mèo, tránh "quét sạch" lane.
        const extendRight = 160;
        const extendLeft = 30;
        const extendY = 30;
        return new Phaser.Geom.Rectangle(
            b.x - extendLeft,
            b.y - extendY,
            b.width + extendLeft + extendRight,
            b.height + extendY * 2,
        );
    }

    /** Tay trái giơ **số 1** (cạnh lên) → `ninja_slash`. */
    updateSlashGesture(handData: HandData): void {
        if (!handData.hasLeftHand) {
            this.prevOneGesture = false;
            return;
        }
        const edge = handData.isOneGesture && !this.prevOneGesture;
        this.prevOneGesture = handData.isOneGesture;

        if (
            !edge ||
            this.slashing ||
            this.scene.time.now < this.slashCooldownUntil ||
            !this.scene.anims.exists('ninja_slash')
        ) {
            return;
        }

        this.slashing = true;
        this.slashLockUntil = this.scene.time.now + 140;
        if (
            this.slashSoundKey &&
            this.scene.cache.audio.exists(this.slashSoundKey)
        ) {
            this.scene.sound.play(this.slashSoundKey, { volume: 0.6 });
        }

        // Đoạn này có thể không cần thiết, cứ để Phaser tự lo
        // this.sprite.anims.stop();

        if (this.sprite.texture.key === PLAYER_TEXTURE_KEY) {
            this.sprite.setFrame(PLAYER_SLASH_FIRST_FRAME);
        }
        this.sprite.play('ninja_slash', true);
    }

    /** Chỉ tay trái nắm → nhảy. @returns trạng thái nắm tay trái frame này (prevGrab ở scene) */
    updateFromHand(handData: HandData, prevGrab: boolean): boolean {
        const body = this.sprite.body as Phaser.Physics.Arcade.Body;

        if (!handData.hasLeftHand) {
            return false;
        }

        if (this.slashing || this.scene.time.now < this.slashLockUntil) {
            return prevGrab;
        }

        const nextGrab = handData.isGrab;
        const justGrabbed = handData.isGrab && !prevGrab;

        if (justGrabbed && body.blocked.down) {
            this.sprite.setVelocityY(-400);
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
            !this.slashing &&
            this.sprite.anims.currentAnim?.key !== 'ninja_run' &&
            this.sprite.anims.currentAnim?.key !== 'ninja_slash'
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
