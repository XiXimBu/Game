import type { Scene } from 'phaser';

/** Làn spawn: high = bay trái + physics; bottom = đất; none = khác (vd. bullet2) */
export type Map1EnemyAnimLane = 'high' | 'bottom' | 'none';

export type Map1EnemyAnimsResult = {
    /** Các key đã `anims.create` — dùng với `sprite.play(key)` */
    animKeys: string[];
    laneOf: (animKey: string) => Map1EnemyAnimLane;
};

/** Sắp xếp frame theo số đuôi `_01.png` hoặc spike A→D */
function sortEnemyFrames(frames: string[]): string[] {
    return [...frames].sort((a, b) => {
        const na = a.match(/_(\d+)\.png$/);
        const nb = b.match(/_(\d+)\.png$/);
        if (na && nb) {
            return parseInt(na[1], 10) - parseInt(nb[1], 10);
        }
        const sa = a.match(/spike([A-D])\.png$/i);
        const sb = b.match(/spike([A-D])\.png$/i);
        if (sa && sb) {
            return sa[1].localeCompare(sb[1]);
        }
        return a.localeCompare(b);
    });
}

/**
 * Gộp các frame cùng “họ” trong map1_enemy.json thành `Phaser.Animations.Animation`.
 * Gọi trong `create()` sau khi atlas `m1_enemies` đã load.
 */
export function registerMap1EnemyAnims(
    scene: Scene,
    atlasKey: string,
): Map1EnemyAnimsResult {
    const all = scene.textures.get(atlasKey).getFrameNames();
    const animKeys: string[] = [];
    const laneByKey = new Map<string, Map1EnemyAnimLane>();

    const byPrefix = (prefix: string) =>
        sortEnemyFrames(all.filter((n) => n.startsWith(prefix)));

    const addAnim = (
        key: string,
        frameNames: string[],
        lane: Map1EnemyAnimLane,
        frameRate: number,
    ): void => {
        if (frameNames.length === 0) {
            return;
        }
        if (scene.anims.exists(key)) {
            animKeys.push(key);
            laneByKey.set(key, lane);
            return;
        }
        const multi = frameNames.length > 1;
        scene.anims.create({
            key,
            frames: frameNames.map((f) => ({ key: atlasKey, frame: f })),
            frameRate,
            repeat: multi ? -1 : 0,
        });
        animKeys.push(key);
        laneByKey.set(key, lane);
    };

    addAnim(
        'm1_bird_enemy',
        sortEnemyFrames(
            all.filter(
                (n) =>
                    n.startsWith('enemy/high/bird-enemie/') ||
                    n.startsWith('enemy/high/bird-enemy/'),
            ),
        ),
        'high',
        12,
    );
    /** Đạn không gộp animation — chỉ dùng từng frame khi bắn kèm air/ufo */
    addAnim('m1_mushroom', byPrefix('enemy/bottom/mushroom/'), 'bottom', 10);
    addAnim('m1_limbo', byPrefix('enemy/bottom/limbo/'), 'bottom', 12);
    /** Spike: từng frame riêng (không gộp anim), giống đạn */

    addAnim(
        'm1_air',
        all.filter((n) => n.includes('enemy/high/air/')),
        'high',
        1, 
    );
    addAnim(
        'm1_ufo',
        all.filter((n) => n.includes('enemy/high/ufo/')),
        'high',
        1,
    );

    return {
        animKeys,
        laneOf: (k) => laneByKey.get(k) ?? 'none',
    };
}

/** Frame đầu của animation — để khởi tạo sprite đúng ảnh */
export function firstFrameOfAnim(
    scene: Scene,
    animKey: string,
): string | number | undefined {
    const anim = scene.anims.get(animKey);
    if (!anim || anim.frames.length === 0) {
        return undefined;
    }
    return anim.getFrameAt(0).textureFrame;
}

/** Mọi frame đạn đơn (bullet1 + bullet2) — dùng spawn đạn vật lý, không tạo Anim */
export function getBulletSingleFrameNames(
    scene: Scene,
    atlasKey: string,
): string[] {
    const all = scene.textures.get(atlasKey).getFrameNames();
    return sortEnemyFrames(
        all.filter(
            (n) =>
                n.startsWith('enemy/high/bullet1/') ||
                n.startsWith('enemy/bullet2/'),
        ),
    );
}

/** Spike A–D — từng frame, không gộp anim */
export function getSpikeSingleFrameNames(
    scene: Scene,
    atlasKey: string,
): string[] {
    const all = scene.textures.get(atlasKey).getFrameNames();
    return sortEnemyFrames(all.filter((n) => n.includes('enemy/bottom/spike/')));
}
