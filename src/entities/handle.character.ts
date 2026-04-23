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
    /** Map2: ninja đứng bên phải, chém về phía trái (rồng). */
    private facingLeft = false;

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

    setFacingLeft(left: boolean): void {
        this.facingLeft = left;
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
        const extendY = 24;
        const extendPrimary = 110;
        const extendBack = 18;
        if (this.facingLeft) {
            return new Phaser.Geom.Rectangle(
                b.x - extendPrimary,
                b.y - extendY,
                b.width + extendPrimary + extendBack,
                b.height + extendY * 2,
            );
        }
        return new Phaser.Geom.Rectangle(
            b.x - extendBack,
            b.y - extendY,
            b.width + extendBack + extendPrimary,
            b.height + extendY * 2,
        );
    }

    /**
     * Map1: tay trái số 1. Map2 đối kháng: `useMap2RightHand` — tay phải số 1.
     * `slashAllowed` false vẫn cập nhật edge để không trượt nhịp (mana).
     */
    updateSlashGesture(
        handData: HandData,
        useMap2RightHand = false,
        slashAllowed = true,
    ): void {
        const oneActive = useMap2RightHand
            ? handData.hasPhysicalRightForMap2 && handData.map2RightOne
            : handData.hasLeftHand && handData.isOneGesture;

        if (!useMap2RightHand && !handData.hasLeftHand) {
            this.prevOneGesture = false;
            return;
        }
        if (useMap2RightHand && !handData.hasPhysicalRightForMap2) {
            this.prevOneGesture = false;
            return;
        }

        const edge = oneActive && !this.prevOneGesture;
        this.prevOneGesture = oneActive;

        if (!slashAllowed) {
            return;
        }

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

    /** Map1: tay trái nắm. Map2: `useMap2RightHand` — tay phải nắm. */
    updateFromHand(
        handData: HandData,
        prevGrab: boolean,
        useMap2RightHand = false,
    ): boolean {
        const body = this.sprite.body as Phaser.Physics.Arcade.Body;

        const has = useMap2RightHand
            ? handData.hasPhysicalRightForMap2
            : handData.hasLeftHand;
        if (!has) {
            return false;
        }

        if (this.slashing || this.scene.time.now < this.slashLockUntil) {
            return prevGrab;
        }

        const nextGrab = useMap2RightHand
            ? handData.map2RightGrab
            : handData.isGrab;
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
