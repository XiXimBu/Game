import Phaser from 'phaser';
import {
    NINJA_MANA_MAX,
    VERSUS_HP_MAX,
} from './handle.map2.constants.js';

export type Map2VersusUiRefs = {
    uiHpDragonFill: Phaser.GameObjects.Rectangle | null;
    uiHpNinjaFill: Phaser.GameObjects.Rectangle | null;
    uiManaNinjaFill: Phaser.GameObjects.Rectangle | null;
};

export function map2CreateVersusUi(
    scene: Phaser.Scene,
    width: number,
    refs: Map2VersusUiRefs,
): void {
    if (refs.uiHpDragonFill) {
        return;
    }
    const barH = 16;
    const barW = width * 0.34;
    const top = 22;
    const pad = 14;
    scene.add
        .rectangle(pad + barW / 2, top, barW, barH, 0x1e293b, 0.92)
        .setScrollFactor(0)
        .setDepth(5000)
        .setStrokeStyle(2, 0x64748b);
    refs.uiHpDragonFill = scene.add
        .rectangle(pad + 2, top, barW - 4, barH - 4, 0xe11d48)
        .setOrigin(0, 0.5)
        .setScrollFactor(0)
        .setDepth(5001);
    scene.add
        .text(pad + 4, top - 18, 'Rồng', {
            fontSize: '13px',
            color: '#fecdd3',
        })
        .setScrollFactor(0)
        .setDepth(5002);

    const rightX = width - pad - barW;
    scene.add
        .rectangle(rightX + barW / 2, top, barW, barH, 0x1e293b, 0.92)
        .setScrollFactor(0)
        .setDepth(5000)
        .setStrokeStyle(2, 0x64748b);
    refs.uiHpNinjaFill = scene.add
        .rectangle(rightX + 2, top, barW - 4, barH - 4, 0x2563eb)
        .setOrigin(0, 0.5)
        .setScrollFactor(0)
        .setDepth(5001);
    scene.add
        .text(rightX + 4, top - 18, 'Mèo', {
            fontSize: '13px',
            color: '#dbeafe',
        })
        .setScrollFactor(0)
        .setDepth(5002);

    const manaTop = top + 28;
    const manaH = 10;
    scene.add
        .rectangle(rightX + barW / 2, manaTop, barW, manaH, 0x1e293b, 0.92)
        .setScrollFactor(0)
        .setDepth(5000)
        .setStrokeStyle(1, 0x64748b);
    refs.uiManaNinjaFill = scene.add
        .rectangle(rightX + 2, manaTop, barW - 4, manaH - 4, 0x22c55e)
        .setOrigin(0, 0.5)
        .setScrollFactor(0)
        .setDepth(5001);
    scene.add
        .text(rightX + 4, manaTop - 16, 'Ki', {
            fontSize: '11px',
            color: '#bbf7d0',
        })
        .setScrollFactor(0)
        .setDepth(5002);
}

export function map2RefreshVersusUi(
    scene: Phaser.Scale.ScaleManager,
    refs: Map2VersusUiRefs,
    hp: { dragonHp: number; ninjaHp: number; ninjaMana: number },
): void {
    const w = scene.width;
    const barW = w * 0.34 - 4;
    if (refs.uiHpDragonFill) {
        refs.uiHpDragonFill.width = Math.max(
            0,
            barW * (hp.dragonHp / VERSUS_HP_MAX),
        );
    }
    if (refs.uiHpNinjaFill) {
        refs.uiHpNinjaFill.width = Math.max(
            0,
            barW * (hp.ninjaHp / VERSUS_HP_MAX),
        );
    }
    if (refs.uiManaNinjaFill) {
        refs.uiManaNinjaFill.width = Math.max(
            0,
            barW * (hp.ninjaMana / NINJA_MANA_MAX),
        );
    }
}

export function map2ShowVersusKoOverlay(
    scene: Phaser.Scene,
    label: string,
    onDone: () => void,
): void {
    const { width: w, height: h } = scene.scale;
    scene.add
        .text(w / 2, h * 0.42, label, {
            fontSize: '38px',
            color: '#fef08a',
            fontStyle: 'bold',
        })
        .setOrigin(0.5)
        .setScrollFactor(0)
        .setDepth(6000)
        .setShadow(2, 2, '#0f172a', 4, true, true);
    scene.time.delayedCall(2800, onDone);
}
