import { CONFIG } from './constants.js';

class AudioEngine {
    constructor() {
        this.ctx = null;
        this.activeOscillators = new Map();
        this.isMuted = false;
    }

    init() {
        if (!this.ctx) {
            const AudioContext = window.AudioContext || window.webkitAudioContext;
            this.ctx = new AudioContext();
        }
    }

    playTone(frequency) {
        if (this.isMuted || !this.ctx) return;
        if (this.ctx.state === 'suspended') {
            this.ctx.resume();
        }

        // Stop existing tone for this frequency if any (monophonic per key)
        this.stopTone(frequency);

        const osc = this.ctx.createOscillator();
        const gainNode = this.ctx.createGain();

        osc.type = 'triangle'; // Smooth sound
        osc.frequency.setValueAtTime(frequency, this.ctx.currentTime);

        // Envelope
        gainNode.gain.setValueAtTime(0, this.ctx.currentTime);
        gainNode.gain.linearRampToValueAtTime(0.3, this.ctx.currentTime + 0.05); // Attack
        gainNode.gain.linearRampToValueAtTime(0.2, this.ctx.currentTime + 0.3); // Decay to Sustain

        osc.connect(gainNode);
        gainNode.connect(this.ctx.destination);

        osc.start();
        this.activeOscillators.set(frequency, { osc, gainNode });
    }

    stopTone(frequency) {
        if (!this.ctx) return;
        const active = this.activeOscillators.get(frequency);
        if (active) {
            const { osc, gainNode } = active;
            // Release
            const now = this.ctx.currentTime;
            gainNode.gain.cancelScheduledValues(now);
            gainNode.gain.setValueAtTime(gainNode.gain.value, now);
            gainNode.gain.exponentialRampToValueAtTime(0.001, now + CONFIG.FADE_OUT_DURATION);

            osc.stop(now + CONFIG.FADE_OUT_DURATION);
            setTimeout(() => {
                osc.disconnect();
                gainNode.disconnect();
            }, CONFIG.FADE_OUT_DURATION * 1000 + 100);

            this.activeOscillators.delete(frequency);
        }
    }

    playSuccessSound() {
        if (this.isMuted || !this.ctx) return;
        this.playTone(880); // A5
        setTimeout(() => this.playTone(1108), 100); // C#6 approx
        setTimeout(() => {
            this.stopTone(880);
            this.stopTone(1108);
        }, 300);
    }

    playErrorSound() {
        if (this.isMuted || !this.ctx) return;
        this.playTone(200);
        setTimeout(() => this.stopTone(200), 200);
    }

    toggleMute() {
        this.isMuted = !this.isMuted;
        if (this.isMuted && this.ctx) {
            this.ctx.suspend();
        } else if (this.ctx) {
            this.ctx.resume();
        }
        return this.isMuted;
    }
}

export const audio = new AudioEngine();
