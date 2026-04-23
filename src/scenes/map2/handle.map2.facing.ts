import Phaser from 'phaser';

/**
 * Rồng trái màn hình: sprite gốc thường quay mặt trái — cần flipX = true để nhìn sang phải (về phía cat).
 * Độc lập với flip của cat.
 */
export const MAP2_DRAGON_FACE_RIGHT_FLIP_X = true;

/**
 * Cat player2 (bên phải): nhìn sang trái (về phía rồng).
 * Dùng chung cho cat_super cutscene và cat đấu.
 */
export const MAP2_CAT_FACE_LEFT_FLIP_X = true;

export function applyMap2DragonBattleFacing(
    dragon: Phaser.GameObjects.Sprite,
): void {
    dragon.setFlipX(MAP2_DRAGON_FACE_RIGHT_FLIP_X);
}

export function applyMap2Player2CatFacing(
    cat: Phaser.GameObjects.Sprite,
): void {
    cat.setFlipX(MAP2_CAT_FACE_LEFT_FLIP_X);
}

/**
 * Chiều bay đạn theo trục X: +1 = sang phải màn hình (khi rồng đã set flip “nhìn phải”).
 */
export function getMap2DragonProjectileDirX(): number {
    return MAP2_DRAGON_FACE_RIGHT_FLIP_X ? 1 : -1;
}

/** Đẩy điểm miệng / spawn đạn xuống (world Y+): 48px như trước + thêm 30px. */
const MAP2_DRAGON_MOUTH_Y_BIAS_PX = 48 + 30;

function map2DragonProjectileWorldY(dragon: Phaser.GameObjects.Sprite): number {
    return dragon.y - dragon.displayHeight * 0.45 + MAP2_DRAGON_MOUTH_Y_BIAS_PX;
}

/**
 * Hiệu ứng / điểm phun: gần miệng (hơi lùi so với đạn).
 */
export function getMap2DragonAttackFxWorldXY(
    dragon: Phaser.GameObjects.Sprite,
): { x: number; y: number } {
    const dir = getMap2DragonProjectileDirX();
    const mouthAhead = Math.max(28, dragon.displayWidth * 0.36);
    return {
        x: dragon.x + dir * mouthAhead,
        y: map2DragonProjectileWorldY(dragon),
    };
}

/**
 * Đạn: **trước mặt** rồng (lệch thêm theo hướng bắn).
 */
export function getMap2DragonProjectileSpawnXY(
    dragon: Phaser.GameObjects.Sprite,
): { x: number; y: number } {
    const dir = getMap2DragonProjectileDirX();
    const ahead = Math.max(40, dragon.displayWidth * 0.46);
    return {
        x: dragon.x + dir * ahead,
        y: map2DragonProjectileWorldY(dragon),
    };
}

/** Điểm X ngoài mép màn (bay xuyên hết nền rồi hủy). */
export function getMap2ProjectileOffscreenTargetX(
    sceneWidth: number,
    facingDir: number,
    projectileHalfWidth: number,
): number {
    const pad = 96;
    if (facingDir > 0) {
        return sceneWidth + pad + projectileHalfWidth;
    }
    return -pad - projectileHalfWidth;
}
