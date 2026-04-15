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

    /** Tay trái — nắm tay = ninja nhảy (không dùng cho chim) */
    hasLeftHand: boolean;
    isGrab: boolean;
    /**
     * Tay trái giơ **số 1** (trỏ duỗi, ba ngón cụp, cái gập) → slash NinjaCat.
     */
    isOneGesture: boolean;
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

/** Heuristic “đầu ngón giữa gần cổ tay” — dùng chung, không đủ để phân biệt nắm vs số 1. */
function middleTipNearWrist(lm: { x: number; y: number }[]): boolean {
    return dist2(lm[0], lm[12]) < 0.19;
}

function grabFromLandmarks(lm: { x: number; y: number }[]): boolean {
    return middleTipNearWrist(lm);
}

/**
 * Trỏ đang duỗi (hình dạng số 1) — dùng để **không** coi là nắm tay:
 * khi cụp 3 ngón, đầu giữa cũng gần cổ tay nên chỉ `middleTipNearWrist` sẽ nhầm “chỉ trỏ” thành nắm.
 */
function leftIndexExtendedShape(lm: { x: number; y: number }[]): boolean {
    const d = (i: number, j: number) => dist2(lm[i], lm[j]);
    const ref = Math.max(d(0, 9), d(0, 5), d(0, 17) * 0.45, 0.032);
    return d(8, 6) > ref * 0.075 && d(0, 8) > d(0, 6) * 0.88;
}

/** Nắm tay thật → nhảy: gần như nắm **và** không phải tư thế trỏ duỗi. */
function leftHandGrabForJump(lm: { x: number; y: number }[]): boolean {
    return middleTipNearWrist(lm) && !leftIndexExtendedShape(lm);
}

/**
 * Ngón cụp (giữa/ápút/út): khoảng cách tip–PIP nhỏ **hoặc** (tay thẳng đứng) tip nằm
 * phía dưới PIP trên màn hình — heuristic 2D thuần hay lệch khi giơ số 1 thẳng lên.
 */
function fingerCurledForOne(
    lm: { x: number; y: number }[],
    ref: number,
    tip: number,
    pip: number,
): boolean {
    const d = (i: number, j: number) => dist2(lm[i], lm[j]);
    const byDist = d(tip, pip) < ref * 0.42;
    const byY = lm[tip].y > lm[pip].y - 0.012;
    return byDist || byY;
}

/**
 * Giơ **số 1** (slash): trỏ duỗi; giữa/ápút/út cụp; ngón cái không chọi trỏ.
 * (Chỉ tay trái được gán `isOneGesture` trong vòng onResults.)
 */
function oneGestureFromLandmarks(lm: { x: number; y: number }[]): boolean {
    const d = (i: number, j: number) => dist2(lm[i], lm[j]);
    const ref = Math.max(d(0, 9), d(0, 5), d(0, 17) * 0.45, 0.032);

    const indexExtended = leftIndexExtendedShape(lm);

    const thumbIpToTip = d(3, 4);
    const wristToThumbTip = d(0, 4);
    const wristToIndexTip = d(0, 8);
    const thumbFoldedLikeSide =
        thumbIpToTip < ref * 0.58 ||
        wristToThumbTip < wristToIndexTip * 0.92;

    return (
        indexExtended &&
        fingerCurledForOne(lm, ref, 12, 10) &&
        fingerCurledForOne(lm, ref, 16, 14) &&
        fingerCurledForOne(lm, ref, 20, 18) &&
        thumbFoldedLikeSide
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
        hasLeftHand: false,
        isGrab: false,
        isOneGesture: false,
    };

    private readonly hands: Hands;
    private camera: Camera | null = null;
    private readonly overlayCanvas: HTMLCanvasElement | null;
    private handSkeletonDebug = false;

    constructor(private readonly video: HTMLVideoElement) {
        this.hands = new Hands({
            locateFile: (file) =>
                `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`,
        });
        const el = document.getElementById('webcam-overlay');
        this.overlayCanvas =
            el instanceof HTMLCanvasElement ? el : null;
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
            this.handData.isGrab = false;
            this.handData.isOneGesture = false;

            if (!list?.length) {
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
