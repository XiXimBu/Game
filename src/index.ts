import Phaser from 'phaser';
import { MainScene } from './scenes/main.scene.js';
import { StartMenuScene } from './scenes/start.menu.js';
import { HandTracker } from './core/handle.trackhand.js';

async function main(): Promise<void> {
    const video = document.getElementById('webcam') as HTMLVideoElement | null;
    if (!video) {
        throw new Error('Khong tim thay the video#webcam trong index.html');
    }
    if (!navigator.mediaDevices?.getUserMedia) {
        throw new Error('Trinh duyet khong ho tro webcam API');
    }
    video.muted = true;
    video.playsInline = true;

    const tracker = new HandTracker(video);
    await tracker.start();

    const config: Phaser.Types.Core.GameConfig = {
        type: Phaser.AUTO,
        width: 800,
        height: 600,
        parent: 'game-container',
        physics: {
            default: 'arcade',
            arcade: {
                gravity: { x: 0, y: 0 },
                debug: false,
            },
        },
        scale: {
            mode: Phaser.Scale.FIT,
            autoCenter: Phaser.Scale.CENTER_BOTH,
        },
        scene: [],
    };

    const game = new Phaser.Game(config);
    // Lưu tracker để menu/main scene đều dùng lại được.
    (game as Phaser.Game & { tracker?: HandTracker }).tracker = tracker;
    // Đăng ký scene: vào menu trước, bấm New Game mới vào MainScene.
    game.scene.add('MainScene', MainScene, false);
    game.scene.add('StartMenuScene', StartMenuScene, true, { tracker });
}

main().catch((err) => {
    console.error(err);
});
