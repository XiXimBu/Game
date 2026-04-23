import { Hands, HAND_CONNECTIONS, type Results } from '@mediapipe/hands';
import { Camera } from '@mediapipe/camera_utils';
import { drawConnectors, drawLandmarks } from '@mediapipe/drawing_utils';

export type HandData = {
    /** Tay phải — ngón trỏ điều khiển chim (độc lập với tay trái) */
    hasRightHand: boolean;
    normX: number;
    normY: number;
    tiltDeg: number;
    span: number;
    isRightGrab: boolean;

    /** Tay trái — nắm tay = ninja nhảy (không dùng cho chim) */
    hasLeftHand: boolean;
    isGrab: boolean;
    /**
     * Tay trái giơ **số 1** (trỏ duỗi, ba ngón cụp, cái gập) → slash NinjaCat.
     */
    isOneGesture: boolean;

    /**
     * Điều khiển rồng (Map2): cùng tay “chim” — có ngón trỏ trong frame.
     * `normX`/`normY` là vị trí ngón trỏ; `dragonHandSpeed` là |d(normX)/dt| (đơn vị norm/giây).
     */
    hasDragonControlHand: boolean;
    dragonHandSpeed: number;
    /** Một frame: lia nhanh từ phải → trái (tip.x giảm mạnh), để lật hướng rồng. */
    dragonSwipeRightToLeft: boolean;

    /**
     * Map2 đối kháng 1v1 — nhãn **MediaPipe** (không sort theo màn hình như Map1).
     * Tay trái: rồng; tay phải: ninja mèo.
     */
    hasPhysicalLeftForMap2: boolean;
    hasPhysicalRightForMap2: boolean;
    /** Tay trái: mở bàn tay → rồng tiến. */
    map2DragonWalkForward: boolean;
    /** Tay trái: số 1 → rồng lùi. */
    map2DragonWalkBack: boolean;
    /** Tay trái: nắm tay (giữ) — dùng cạnh lên để bắn chưởng. */
    map2DragonFist: boolean;
    /** Tay phải: nắm → nhảy ninja Map2. */
    map2RightGrab: boolean;
    /** Tay phải: số 1 → chém Map2. */
    map2RightOne: boolean;
    /** Tay phải: số 1 → mèo lùi lại trong Map2 đối kháng. */
    map2RightBack: boolean;
    /** Tay phải: mở bàn tay → mèo tiến trong Map2 đối kháng. */
    map2RightWalkForward: boolean;
    /** Tay phải: số 2 → mèo nhảy trong Map2 đối kháng. */
    map2RightJump: boolean;

    /**
     * Tay trái (nhãn MediaPipe Left): cử chỉ **số 1** — debug / test nhánh bắn.
     * (Cùng điều kiện với `map2DragonWalkBack`.)
     */
    isOneGestureLeft: boolean;
};

function radToDeg(rad: number): number {
    return (rad * 180) / Math.PI;
}

function dist2(
    a: { x: number; y: number },
    b: { x: number; y: number },
): number {
    const dx = a.x - b.x;
    const dy = a.y - b.y;
    return Math.hypot(dx, dy);
}

type FingerStates = [boolean, boolean, boolean, boolean, boolean];

/**
 * Trạng thái 5 ngón: [thumb, index, middle, ring, pinky]
 * true = duỗi, false = gập.
 */
function getFingerStates(
    lm: { x: number; y: number }[],
    handTag: 'Left' | 'Right',
): FingerStates {
    void handTag;
    // Thumb mở theo trục ngang tốt hơn các ngón còn lại.
    const thumbUp = dist2(lm[4], lm[17]) > dist2(lm[3], lm[17]) * 1.2;
    const indexUp = dist2(lm[0], lm[8]) > dist2(lm[0], lm[6]);
    const middleUp = dist2(lm[0], lm[12]) > dist2(lm[0], lm[10]);
    const ringUp = dist2(lm[0], lm[16]) > dist2(lm[0], lm[14]);
    const pinkyUp = dist2(lm[0], lm[20]) > dist2(lm[0], lm[18]);
    return [thumbUp, indexUp, middleUp, ringUp, pinkyUp];
}

/** Nắm tay: 4 ngón chính cùng gập. */
function isGrabGesture(states: FingerStates): boolean {
    const [, indexUp, middleUp, ringUp, pinkyUp] = states;
    return !indexUp && !middleUp && !ringUp && !pinkyUp;
}

/** Số 1: chỉ trỏ duỗi, giữa/áp út/út gập. */
function isOneGesture(states: FingerStates): boolean {
    const [, indexUp, middleUp, ringUp, pinkyUp] = states;
    return indexUp && !middleUp && !ringUp && !pinkyUp;
}

/** Số 2: trỏ + giữa duỗi, áp út + út gập. */
function isTwoGesture(states: FingerStates): boolean {
    const [, indexUp, middleUp, ringUp, pinkyUp] = states;
    return indexUp && middleUp && !ringUp && !pinkyUp;
}

/** Bàn tay mở: 4 ngón chính cùng duỗi. */
function isOpenPalmGesture(states: FingerStates): boolean {
    const [, indexUp, middleUp, ringUp, pinkyUp] = states;
    return indexUp && middleUp && ringUp && pinkyUp;
}

/** Wrapper giữ tương thích với logic hiện có của scene. */
function leftHandGrabForJump(lm: { x: number; y: number }[]): boolean {
    return isGrabGesture(getFingerStates(lm, 'Left'));
}

/** Wrapper giữ tương thích với logic hiện có của scene. */
function oneGestureFromLandmarks(lm: { x: number; y: number }[]): boolean {
    return isOneGesture(getFingerStates(lm, 'Left'));
}

/** Mở tay để tiến: loại trừ số 1 / số 2 / nắm. */
function openPalmFromLandmarks(lm: { x: number; y: number }[]): boolean {
    const states = getFingerStates(lm, 'Left');
    return (
        !isGrabGesture(states) &&
        !isOneGesture(states) &&
        !isTwoGesture(states) &&
        isOpenPalmGesture(states)
    );
}

type TaggedHand = {
    lm: { x: number; y: number }[];
    tag: 'Left' | 'Right';
};

/**
 * Gán tay trái / tay phải **theo vị trí cổ tay** trên ảnh MediaPipe (`selfieMode`),
 * không tin tuyệt đối nhãn Left/Right (dễ lệch với preview lật gương).
 * Selfie: tay trái người thường ở nửa trái khung (x nhỏ hơn), tay phải ở nửa phải (x lớn hơn).
 */
function pickNinjaAndBirdHands(
    items: TaggedHand[],
): { ninja: TaggedHand | null; bird: TaggedHand | null } {
    if (items.length === 0) {
        return { ninja: null, bird: null };
    }
    const sorted = [...items].sort((a, b) => a.lm[0].x - b.lm[0].x);
    if (items.length >= 2) {
        return {
            ninja: sorted[0],
            bird: sorted[sorted.length - 1],
        };
    }
    const one = sorted[0];
    if (
        oneGestureFromLandmarks(one.lm) ||
        leftHandGrabForJump(one.lm)
    ) {
        return { ninja: one, bird: null };
    }
    const wx = one.lm[0].x;
    if (wx < 0.45) {
        return { ninja: one, bird: null };
    }
    if (wx > 0.55) {
        return { ninja: null, bird: one };
    }
    return one.tag === 'Left'
        ? { ninja: one, bird: null }
        : { ninja: null, bird: one };
}

/**
 * Landmark khi `selfieMode: true` là theo ảnh đã lật trong graph; video/canvas
 * dùng bitmap gốc rồi `#webcam-wrap` mới `scaleX(-1)` — cần đưa x về không gian
 * bitmap để khớp từng pixel với video (tay trái/phải trùng hình).
 */
/** Phải trùng `selfieMode` trong `hands.setOptions` — nếu tắt selfie, overlay không cần đảo x. */
const MEDIAPIPE_SELFIE_MODE = true;

function landmarksForOverlayIfSelfie(
    lm: { x: number; y: number; z?: number }[],
): { x: number; y: number; z?: number }[] {
    if (!MEDIAPIPE_SELFIE_MODE) {
        return lm;
    }
    return lm.map((p) => ({ ...p, x: 1 - p.x }));
}

/**
 * Webcam → MediaPipe: tối đa 2 tay; phải = chim, trái = nhảy.
 * Preview cam trước gương: CSS `scaleX(-1)` trên `#webcam-wrap` (video + skeleton cùng lật).
 * Với `selfieMode`, MediaPipe trả x theo ảnh đã lật trong graph — overlay phải đảo x về bitmap gốc
 * (`landmarksForOverlayIfSelfie`) để khớp pixel với video.
 */
export class HandTracker {
    readonly handData: HandData = {
        hasRightHand: false,
        normX: 0.5,
        normY: 0.5,
        tiltDeg: 0,
        span: 0,
        isRightGrab: false,
        hasLeftHand: false,
        isGrab: false,
        isOneGesture: false,
        hasDragonControlHand: false,
        dragonHandSpeed: 0,
        dragonSwipeRightToLeft: false,
        hasPhysicalLeftForMap2: false,
        hasPhysicalRightForMap2: false,
        map2DragonWalkForward: false,
        map2DragonWalkBack: false,
        map2DragonFist: false,
        map2RightGrab: false,
        map2RightOne: false,
        map2RightBack: false,
        map2RightWalkForward: false,
        map2RightJump: false,
        isOneGestureLeft: false,
    };

    private readonly hands: Hands;
    private camera: Camera | null = null;
    private readonly overlayCanvas: HTMLCanvasElement | null;
    private handSkeletonDebug = false;

    /** Theo dõi tay điều khiển rồng (cùng cử chỉ chim). */
    private dragonPrevTipX: number | null = null;
    private dragonPrevNormX: number | null = null;
    private dragonPrevTimeMs = 0;
    private dragonLastSwipeAtMs = 0;

    constructor(private readonly video: HTMLVideoElement) {
        this.hands = new Hands({
            locateFile: (file) =>
                `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`,
        });
        const el = document.getElementById('webcam-overlay');
        this.overlayCanvas =
            el instanceof HTMLCanvasElement ? el : null;
    }

    private resetDragonHandState(): void {
        this.handData.hasDragonControlHand = false;
        this.handData.dragonHandSpeed = 0;
        this.dragonPrevTipX = null;
        this.dragonPrevNormX = null;
    }

    setHandSkeletonDebug(on: boolean): void {
        this.handSkeletonDebug = on;
        const wrap = this.video.closest('#webcam-wrap');
        wrap?.classList.toggle('webcam-debug-skeleton', on);
        if (!on && this.overlayCanvas) {
            const ctx = this.overlayCanvas.getContext('2d');
            if (ctx && this.overlayCanvas.width > 0) {
                ctx.clearRect(
                    0,
                    0,
                    this.overlayCanvas.width,
                    this.overlayCanvas.height,
                );
            }
        }
    }

    private attachPreview(): void {
        const wrap = this.video.closest('#webcam-wrap');
        if (wrap) {
            wrap.classList.add('webcam-preview');
        } else {
            this.video.classList.add('webcam-preview');
        }
    }

    private drawHandOverlay(results: Results): void {
        const canvas = this.overlayCanvas;
        if (!canvas) {
            return;
        }
        const ctx = canvas.getContext('2d');
        if (!ctx) {
            return;
        }

        const vw = this.video.videoWidth || 640;
        const vh = this.video.videoHeight || 480;
        if (canvas.width !== vw || canvas.height !== vh) {
            canvas.width = vw;
            canvas.height = vh;
        }

        ctx.clearRect(0, 0, vw, vh);

        if (!this.handSkeletonDebug) {
            return;
        }

        const list = results.multiHandLandmarks;
        const labels = results.multiHandedness;
        if (!list?.length) {
            return;
        }

        ctx.font = '600 18px system-ui, Segoe UI, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'bottom';

        for (let i = 0; i < list.length; i++) {
            const lm = list[i];
            const tag = labels?.[i]?.label;
            if (!tag) {
                continue;
            }

            const lmDraw = landmarksForOverlayIfSelfie(lm);

            const isRight = tag === 'Right';
            const lineColor = isRight ? '#22d3ee' : '#e879f9';
            const pointColor = isRight ? '#a5f3fc' : '#f5d0fe';

            drawConnectors(ctx, lmDraw, HAND_CONNECTIONS, {
                color: lineColor,
                lineWidth: 2,
            });
            drawLandmarks(ctx, lmDraw, {
                color: pointColor,
                lineWidth: 1,
                radius: 2.5,
            });

            if (isRight && lmDraw[8]) {
                const ix = lmDraw[8].x * vw;
                const iy = lmDraw[8].y * vh;
                ctx.beginPath();
                ctx.arc(ix, iy, 7, 0, Math.PI * 2);
                ctx.strokeStyle = '#fef08a';
                ctx.lineWidth = 2;
                ctx.stroke();
                ctx.beginPath();
                ctx.arc(ix, iy, 3, 0, Math.PI * 2);
                ctx.fillStyle = '#fef9c3';
                ctx.fill();
            }

            const wx = lmDraw[0].x * vw;
            const wy = lmDraw[0].y * vh;
            const hint = isRight
                ? 'Chim: ngón trỏ'
                : oneGestureFromLandmarks(lm)
                    ? 'SỐ 1 → CHÉM'
                    : leftHandGrabForJump(lm)
                        ? 'NẮM TAY → NHẢY'
                        : 'MỞ TAY';

            const padX = 10;
            const textY = wy - 12;
            const metrics = ctx.measureText(hint);
            const boxW = Math.min(metrics.width + padX * 2, vw - 8);
            const boxH = 28;
            const boxX = Math.max(4, Math.min(wx - boxW / 2, vw - boxW - 4));

            ctx.save();
            ctx.fillStyle = 'rgba(15, 23, 42, 0.82)';
            ctx.strokeStyle = isRight
                ? 'rgba(34, 211, 238, 0.55)'
                : 'rgba(232, 121, 249, 0.55)';
            ctx.lineWidth = 1;
            const boxTop = textY - boxH - 4;
            ctx.fillRect(boxX, boxTop, boxW, boxH + 6);
            ctx.strokeRect(boxX, boxTop, boxW, boxH + 6);
            ctx.fillStyle = '#f8fafc';
            /* #webcam-wrap có scaleX(-1): lật chữ một lần trên canvas để sau khi CSS lật vẫn đọc được */
            const textCx = boxX + boxW / 2;
            const textBaseY = textY + 3;
            ctx.translate(textCx, textBaseY);
            ctx.scale(-1, 1);
            ctx.translate(-textCx, -textBaseY);
            ctx.fillText(hint, textCx, textBaseY);
            ctx.restore();
        }
    }

    async start(): Promise<void> {
        this.attachPreview();

        this.hands.setOptions({
            maxNumHands: 2,
            modelComplexity: 1,
            selfieMode: MEDIAPIPE_SELFIE_MODE,
            minDetectionConfidence: 0.5,
            minTrackingConfidence: 0.5,
        });

        this.hands.onResults((results) => {
            const list = results.multiHandLandmarks;
            const labels = results.multiHandedness;

            this.handData.hasRightHand = false;
            this.handData.hasLeftHand = false;
            this.handData.isRightGrab = false;
            this.handData.isGrab = false;
            this.handData.isOneGesture = false;
            this.handData.dragonSwipeRightToLeft = false;
            this.handData.hasPhysicalLeftForMap2 = false;
            this.handData.hasPhysicalRightForMap2 = false;
            this.handData.map2DragonWalkForward = false;
            this.handData.map2DragonWalkBack = false;
            this.handData.map2DragonFist = false;
            this.handData.map2RightGrab = false;
            this.handData.map2RightOne = false;
            this.handData.map2RightBack = false;
            this.handData.map2RightWalkForward = false;
            this.handData.map2RightJump = false;
            this.handData.isOneGestureLeft = false;

            if (!list?.length) {
                this.resetDragonHandState();
                this.drawHandOverlay(results);
                return;
            }

            const tagged: TaggedHand[] = [];
            for (let i = 0; i < list.length; i++) {
                const lm = list[i];
                const raw = labels?.[i]?.label;
                if (raw !== 'Left' && raw !== 'Right') {
                    continue;
                }
                tagged.push({ lm, tag: raw });
            }

            // Map2: tách luồng tay theo nhãn MediaPipe để tránh lẫn trái/phải.
            const map2LeftHand = tagged.find((h) => h.tag === 'Left') ?? null;
            const map2RightHand = tagged.find((h) => h.tag === 'Right') ?? null;

            for (const th of tagged) {
                const lm = th.lm;
                if (th === map2LeftHand) {
                    this.handData.hasPhysicalLeftForMap2 = true;
                    this.handData.map2DragonFist = leftHandGrabForJump(lm);
                    this.handData.map2DragonWalkBack = oneGestureFromLandmarks(lm);
                    this.handData.isOneGestureLeft = this.handData.map2DragonWalkBack;
                    this.handData.map2DragonWalkForward =
                        !this.handData.map2DragonFist &&
                        !this.handData.map2DragonWalkBack &&
                        openPalmFromLandmarks(lm);
                } else if (th === map2RightHand) {
                    this.handData.hasPhysicalRightForMap2 = true;
                    this.handData.map2RightGrab = leftHandGrabForJump(lm);
                    this.handData.map2RightOne = oneGestureFromLandmarks(lm);
                    this.handData.map2RightBack = this.handData.map2RightOne;
                    this.handData.map2RightWalkForward =
                        !this.handData.map2RightGrab &&
                        !this.handData.map2RightBack &&
                        openPalmFromLandmarks(lm);
                    this.handData.map2RightJump = isTwoGesture(
                        getFingerStates(lm, 'Right'),
                    );
                }
            }

            const { ninja, bird } = pickNinjaAndBirdHands(tagged);

            if (bird) {
                const lm = bird.lm;
                const p0 = lm[0];
                const p9 = lm[9];
                const tipIndex = lm[8];
                const dx = p9.x - p0.x;
                const dy = p9.y - p0.y;

                this.handData.hasRightHand = true;
                this.handData.tiltDeg = radToDeg(Math.atan2(dy, dx));
                this.handData.span = Math.hypot(dx, dy);
                /** Khớp cảm giác “gương”: tay phải trên màn hình ↔ chim bay cùng phía */
                this.handData.normX = 1 - tipIndex.x;
                this.handData.normY = tipIndex.y;
                this.handData.isRightGrab = leftHandGrabForJump(lm);
            }

            if (ninja) {
                const lm = ninja.lm;
                this.handData.hasLeftHand = true;
                /** Nhảy chỉ khi nắm thật. */
                this.handData.isGrab = leftHandGrabForJump(lm);
                /** Slash: tay trái — số 1. */
                if (oneGestureFromLandmarks(lm)) {
                    this.handData.isOneGesture = true;
                }
            }

            /** Rồng Map2: ưu tiên tay “chim”, không có chim thì dùng tay còn lại (ngón trỏ). */
            const dragonLm = bird?.lm ?? ninja?.lm ?? null;
            if (dragonLm) {
                const tipIndex = dragonLm[8];
                const tipX = tipIndex.x;
                const normX = 1 - tipIndex.x;
                if (!bird) {
                    this.handData.normX = normX;
                    this.handData.normY = tipIndex.y;
                }
                const now = performance.now();
                if (
                    this.dragonPrevNormX !== null &&
                    this.dragonPrevTimeMs > 0
                ) {
                    const dtSec = Math.max(
                        (now - this.dragonPrevTimeMs) / 1000,
                        1 / 120,
                    );
                    this.handData.dragonHandSpeed =
                        Math.abs(normX - this.dragonPrevNormX) / dtSec;
                } else {
                    this.handData.dragonHandSpeed = 0;
                }
                if (
                    this.dragonPrevTipX !== null &&
                    this.dragonPrevTimeMs > 0
                ) {
                    const dtSec = Math.max(
                        (now - this.dragonPrevTimeMs) / 1000,
                        1 / 120,
                    );
                    const vxTip = (tipX - this.dragonPrevTipX) / dtSec;
                    const SWIPE_VX = 2.1;
                    const SWIPE_COOLDOWN_MS = 480;
                    if (
                        now - this.dragonLastSwipeAtMs >= SWIPE_COOLDOWN_MS &&
                        this.dragonPrevTipX > 0.48 &&
                        vxTip < -SWIPE_VX
                    ) {
                        this.handData.dragonSwipeRightToLeft = true;
                        this.dragonLastSwipeAtMs = now;
                    }
                }
                this.handData.hasDragonControlHand = true;
                this.dragonPrevTipX = tipX;
                this.dragonPrevNormX = normX;
                this.dragonPrevTimeMs = now;
            } else {
                this.resetDragonHandState();
            }

            this.drawHandOverlay(results);
        });

        await this.hands.initialize();

        this.camera = new Camera(this.video, {
            onFrame: async () => {
                await this.hands.send({ image: this.video });
            },
            width: 640,
            height: 480,
            facingMode: 'user',
        });

        await this.camera.start();
    }
}
