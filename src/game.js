import { NOTES, CONFIG } from './constants.js';
import { audio } from './audio.js';

export class Game {
    constructor(renderer, inputHandler) {
        this.renderer = renderer;
        this.inputHandler = inputHandler;

        this.score = 0;
        this.streak = 0;
        this.mode = CONFIG.GAME_MODE.PRACTICE;
        this.currentNoteIndex = null;
        this.isProcessing = false;

        this.showNoteNames = false;

        // DOM Elements
        this.scoreEl = document.getElementById('score');
        this.streakEl = document.getElementById('streak');
        this.feedbackEl = document.getElementById('feedback-message');
    }

    init() {
        this.renderer.init();
        this.inputHandler.game = this; // Bind game to input
        this.inputHandler.init(); // Renders keys

        // Setup controls
        document.getElementById('mode-toggle').addEventListener('click', () => this.toggleMode());
        document.getElementById('mute-toggle').addEventListener('click', (e) => {
            const isMuted = audio.toggleMute();
            e.target.textContent = isMuted ? '🔇' : '🔊';
        });

        document.getElementById('show-note-names').addEventListener('change', (e) => {
            this.showNoteNames = e.target.checked;
            this.inputHandler.updateKeyLabels();
        });

        this.startPractice();
    }

    toggleMode() {
        this.mode = this.mode === CONFIG.GAME_MODE.PRACTICE ? CONFIG.GAME_MODE.FREE : CONFIG.GAME_MODE.PRACTICE;
        document.getElementById('mode-toggle').textContent = this.mode === CONFIG.GAME_MODE.PRACTICE ? 'フリーモード' : '練習モード';

        // Reset state
        this.score = 0;
        this.streak = 0;
        this.updateUI();
        this.isProcessing = false;
        this.renderer.render(); // Clear

        if (this.mode === CONFIG.GAME_MODE.PRACTICE) {
            this.startPractice();
        } else {
            this.feedbackEl.innerText = "Free Play";
            this.feedbackEl.style.opacity = 1;
            setTimeout(() => this.feedbackEl.style.opacity = 0, 1000);
        }
    }

    startPractice() {
        this.nextQuestion();
    }

    nextQuestion() {
        if (this.mode !== CONFIG.GAME_MODE.PRACTICE) return;

        // Random note
        const index = Math.floor(Math.random() * NOTES.length);
        this.currentNoteIndex = index;
        this.isProcessing = false;

        this.renderer.render(NOTES[index]);
    }

    handleInput(noteIndex) {
        const note = NOTES[noteIndex];

        // Play sound in both modes
        audio.playTone(note.freq);

        if (this.mode === CONFIG.GAME_MODE.FREE) {
            // Just visualize in free mode
            this.renderer.render(null, [note]);
            return;
        }

        // Practice Mode Logic
        if (this.isProcessing) return; // Prevent double taps during transition

        if (noteIndex === this.currentNoteIndex) {
            // Correct
            this.handleCorrect();
        } else {
            // Incorrect
            this.handleIncorrect();
        }
    }

    handleRelease(noteIndex) {
        const note = NOTES[noteIndex];
        audio.stopTone(note.freq);
        if (this.mode === CONFIG.GAME_MODE.FREE) {
            // Clear note on release in free mode? Or keep passing?
            // Maybe just re-render last state or clear extra notes.
            // For now, let's just clear the active note visualization if needed
            // But we usually want to keep staff clean.
            this.renderer.render();
        }
    }

    handleCorrect() {
        this.isProcessing = true;
        this.score += 10;
        this.streak += 1;
        this.updateUI();

        this.showFeedback('正解！', 'correct');
        audio.playSuccessSound();

        setTimeout(() => {
            this.nextQuestion();
        }, CONFIG.NEXT_QUESTION_DELAY);
    }

    handleIncorrect() {
        this.streak = 0;
        this.updateUI();

        this.showFeedback('惜しい！', 'incorrect');
        audio.playErrorSound();

        // Do not advance question
    }

    showFeedback(text, type) {
        this.feedbackEl.textContent = text;
        this.feedbackEl.className = `feedback-${type}`;
        this.feedbackEl.style.opacity = 1;

        setTimeout(() => {
            this.feedbackEl.style.opacity = 0;
        }, 800);
    }

    updateUI() {
        this.scoreEl.textContent = this.score;
        this.streakEl.textContent = this.streak;
    }
}
