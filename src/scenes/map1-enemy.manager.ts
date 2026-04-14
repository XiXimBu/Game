import Phaser from 'phaser';

type EnemySpawnManagerOptions = {
    scene: Phaser.Scene;
    speedPxPerSec: number;
    jumpTimeSec: number;
    pickFrame: () => string;
    spawnOne: (frameName: string, speedPxPerSec: number) => void;
};

/**
 * Quản lý spawn obstacle theo "đợt" 2-3 con.
 *
 * Physics gap:
 * D > V_game * T_jump
 * - V_game: tốc độ obstacle (px/s, trị tuyệt đối)
 * - T_jump: thời gian mèo ở trên không (s)
 *
 * Manager sẽ đổi gap (px) -> delay (ms) bằng delay = gap / V.
 */
export class Map1EnemyManager {
    private readonly scene: Phaser.Scene;
    private readonly speedPxPerSec: number;
    private readonly jumpTimeSec: number;
    private readonly pickFrame: () => string;
    private readonly spawnOne: (frameName: string, speedPxPerSec: number) => void;
    private readonly slowStartDurationMs = 20000;
    private readonly slowStartFactor = 0.7;
    private readonly tryHardChance = 0.08;

    private nextSpawnAtMs = 0;
    private spawnLeftInBatch = 0;

    constructor(opts: EnemySpawnManagerOptions) {
        this.scene = opts.scene;
        this.speedPxPerSec = Math.max(1, Math.abs(opts.speedPxPerSec));
        this.jumpTimeSec = Math.max(0.1, opts.jumpTimeSec);
        this.pickFrame = opts.pickFrame;
        this.spawnOne = opts.spawnOne;
        // Cho batch đầu xuất hiện sớm để tránh khoảng trống ~5s khi mới vào game.
        this.planFirstBatchStart(0);
    }

    update(nowMs: number): void {
        if (nowMs < this.nextSpawnAtMs) {
            return;
        }

        const frame = this.pickFrame();
        const speedNow = this.currentSpeedPxPerSec(nowMs);
        this.spawnOne(frame, speedNow);
        this.spawnLeftInBatch -= 1;

        if (this.spawnLeftInBatch > 0) {
            this.nextSpawnAtMs = nowMs + this.msForNextInBatch(speedNow);
            return;
        }

        this.planNextBatchStart(nowMs);
    }

    private planNextBatchStart(nowMs: number): void {
        this.spawnLeftInBatch = Phaser.Math.Between(2, 3);
        const betweenBatchesMs = Phaser.Math.Between(1300, 2200);
        this.nextSpawnAtMs = nowMs + betweenBatchesMs;
    }

    private planFirstBatchStart(nowMs: number): void {
        this.spawnLeftInBatch = Phaser.Math.Between(1, 2);
        const firstSpawnDelayMs = Phaser.Math.Between(450, 900);
        this.nextSpawnAtMs = nowMs + firstSpawnDelayMs;
    }

    private currentSpeedPxPerSec(nowMs: number): number {
        const t = Phaser.Math.Clamp(nowMs / this.slowStartDurationMs, 0, 1);
        const factor = Phaser.Math.Linear(this.slowStartFactor, 1, t);
        return this.speedPxPerSec * factor;
    }

    private msForNextInBatch(speedNow: number): number {
        const isTryHard = Phaser.Math.FloatBetween(0, 1) < this.tryHardChance;

        // 1) Phản xạ đã bao gồm độ trễ webcam/MediaPipe.
        const reactionTimeSec = isTryHard ? 0.35 : 0.52;

        // 2) Bù bề ngang hitbox mèo + quái.
        const hitboxPaddingPx = isTryHard ? 180 : 230;

        // 3) Công thức vật lý: D_min = V * (T_jump + T_reaction) + hitboxPadding.
        const minGapPxByPhysics =
            (speedNow * (this.jumpTimeSec + reactionTimeSec)) + hitboxPaddingPx;

        // 4) Chặn min/max để nhịp game ổn định.
        const hardMinGapPx = isTryHard ? 520 : 620;
        const minGapPx = Math.max(hardMinGapPx, minGapPxByPhysics);
        const maxGapPx = minGapPx + Phaser.Math.Between(
            isTryHard ? 120 : 180,
            isTryHard ? 220 : 320,
        );

        const gapPx = Phaser.Math.FloatBetween(minGapPx, maxGapPx);
        // 5) Đổi khoảng cách (px) -> thời gian (ms).
        return Math.round((gapPx / speedNow) * 1000);
    }
}
