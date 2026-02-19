import { NOTES } from './constants.js';

export class InputHandler {
    constructor(game) {
        this.game = game;
        this.container = document.getElementById('keyboard-container');
        this.isMouseDown = false;
    }

    init() {
        this.renderKeys();
        this.attachListeners();
        // Ensure positioning happens after layout
        requestAnimationFrame(() => this.positionBlackKeys());
    }

    renderKeys() {
        this.container.innerHTML = '';

        // Group keys by index to find position
        let whiteKeyIndex = 0;

        NOTES.forEach((noteData, index) => {
            const key = document.createElement('div');
            key.dataset.index = index;
            key.dataset.note = noteData.note;
            key.dataset.octave = noteData.octave;
            key.className = `key ${noteData.type}`;

            if (noteData.type === 'white') {
                key.textContent = this.game.showNoteNames ? `${noteData.note}${noteData.octave}` : '';
                this.container.appendChild(key);
                // Store reference for black key positioning if needed,
                // but here we might need to know the left offset of this white key.
                // Since we are using flex for white keys, their position is automatic.
                whiteKeyIndex++;
            } else {
                // Black key.
                // It should be placed between the previous white key and the next.
                // Visually, a black key is usually centered on the border of two white keys.
                // We can append it to container and set left % or px in JS after render, or use specific CSS.
                // Let's append it now and position it later or use a different structure.
                this.container.appendChild(key);
            }
        });

        // After appending, we need to position black keys
        this.positionBlackKeys();

        // Handle window resize to reposition
        window.addEventListener('resize', () => this.positionBlackKeys());
    }

    positionBlackKeys() {
        const whiteKeys = Array.from(this.container.querySelectorAll('.key.white'));
        // We iterate NOTES to match black keys to their preceding white key
        // NOTES contains all keys in order.

        // Map black key index to white key index it comes after.
        // C# is after C (0th white key). D# is after D (1st white key).

        let whiteKeyCount = 0;
        NOTES.forEach((noteData, index) => {
            if (noteData.type === 'white') {
                whiteKeyCount++;
            } else {
                // Black key at 'index'
                // Corresponds to white key at 'whiteKeyCount - 1' (the one before this black key)
                const targetWhiteKey = whiteKeys[whiteKeyCount - 1];
                const blackKey = this.container.querySelector(`.key.black[data-index="${index}"]`);

                if (targetWhiteKey && blackKey) {
                    const left = targetWhiteKey.offsetLeft + targetWhiteKey.offsetWidth - (blackKey.offsetWidth / 2);
                    blackKey.style.left = `${left}px`;
                    blackKey.textContent = '';
                }
            }
        });
    }

    updateKeyLabels() {
        const whiteKeys = this.container.querySelectorAll('.key.white');
        whiteKeys.forEach(key => {
            const idx = key.dataset.index;
            const note = NOTES[idx];
            key.textContent = this.game.showNoteNames ? `${note.note}${note.octave}` : '';
        });
    }

    attachListeners() {
        // Mouse/Touch events on container
        const handleStart = (e) => {
            // Prevent default to stop scrolling/selection
            if (e.cancelable) e.preventDefault();
            this.isMouseDown = true;
            const key = e.target.closest('.key');
            if (key) {
                // e.target might be the key or child. 
                this.triggerKey(key);
            }
        };

        const handleEnd = (e) => {
            this.isMouseDown = false;
            // Stop all sounds or decay? Application spec says decay/stop on release.
            // But for "game" mode we might want just a tap.
            // For free mode, hold to play?
            // Spec: "鍵盤押下時の発音", "離鍵...消音"

            // If we support polyphony/hold, we need to know which key was released.
            // For simplicity in this version, we might just let audio decay naturally or stop all if we don't track pointers.
            // But let's try to be precise if possible. 
            // With mouse, only one cursor. With touch, multiple.

            // For now, let's just handle "tap" logic for gameplay mostly, 
            // but ensure we stop sound on release for better feel.
        };

        const handleMove = (e) => {
            if (!this.isMouseDown) return;
            // For glissando? 
            // This is tricky with simple events. 
            // Let's stick to simple click/tap for v1 as per spec focus on "correct key"
        };

        // Use pointer events for unified mouse/touch
        this.container.addEventListener('pointerdown', (e) => {
            this.isMouseDown = true;
            const key = e.target.closest('.key');
            if (key) {
                key.releasePointerCapture(e.pointerId); // Allow sliding interaction if we want, or just press
                this.triggerKey(key);
            }
        });

        this.container.addEventListener('pointerup', (e) => {
            this.isMouseDown = false;
            const key = e.target.closest('.key');
            if (key) {
                this.releaseKey(key);
            }
        });

        this.container.addEventListener('pointerout', (e) => {
            const key = e.target.closest('.key');
            if (key && this.isMouseDown) {
                this.releaseKey(key);
            }
        });
    }

    triggerKey(keyElement) {
        if (keyElement.classList.contains('active')) return;

        keyElement.classList.add('active');
        const index = parseInt(keyElement.dataset.index);
        this.game.handleInput(index);
    }

    releaseKey(keyElement) {
        keyElement.classList.remove('active');
        const index = parseInt(keyElement.dataset.index);
        this.game.handleRelease(index);
    }
}
