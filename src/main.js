import { audio } from './audio.js';
import { Renderer } from './renderer.js';
import { InputHandler } from './input.js';
import { Game } from './game.js';

// Initialize
const renderer = new Renderer();
const game = new Game(renderer, new InputHandler());

// Start
window.addEventListener('load', () => {
    // Audio context requires user interaction to start.
    // We can init it on first click.
    const startAudio = () => {
        audio.init();
        document.body.removeEventListener('click', startAudio);
        document.body.removeEventListener('keydown', startAudio);
    };
    document.body.addEventListener('click', startAudio);
    document.body.addEventListener('keydown', startAudio);

    game.init();
});
