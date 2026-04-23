import Phaser from 'phaser';

/** Căn camera: điểm (wx, wy) nằm giữa khung hình với zoom z. */
export function scrollForWorldCenter(
    cam: Phaser.Cameras.Scene2D.Camera,
    wx: number,
    wy: number,
    z: number,
): { scrollX: number; scrollY: number } {
    return {
        scrollX: wx - cam.width / (2 * z),
        scrollY: wy - cam.height / (2 * z),
    };
}
