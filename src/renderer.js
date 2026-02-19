import { NOTES } from './constants.js';

export class Renderer {
    constructor() {
        this.canvas = document.getElementById('notation-canvas');
        this.ctx = this.canvas.getContext('2d');
        this.width = 0;
        this.height = 0;

        // Config
        this.staffY = 0;
        this.lineSpacing = 16; // space between staff lines
        this.noteRadius = this.lineSpacing / 2 - 1;
    }

    init() {
        this.resize();
        window.addEventListener('resize', () => this.resize());
    }

    resize() {
        const parent = this.canvas.parentElement;
        this.canvas.width = parent.clientWidth;
        this.canvas.height = parent.clientHeight;
        this.width = this.canvas.width;
        this.height = this.canvas.height;

        // Center staff vertically
        this.staffY = this.height / 2;
        this.lineSpacing = Math.max(14, this.height / 15); // Dynamic spacing
        this.noteRadius = this.lineSpacing * 0.45;

        this.render(); // Re-render on resize
    }

    // Clear and redraw everything
    render(currentNote = null, activeNotes = []) {
        this.ctx.clearRect(0, 0, this.width, this.height);

        this.drawStaff();
        this.drawClef();

        if (currentNote) {
            // Draw target note (Practice mode)
            this.drawNote(currentNote, true);
        }

        if (activeNotes && activeNotes.length > 0) {
            // Draw played notes (Free mode or feedback)
            activeNotes.forEach(n => this.drawNote(n, false, '#3b82f6'));
        }
    }

    drawStaff() {
        const ctx = this.ctx;
        ctx.strokeStyle = '#000';
        ctx.lineWidth = 1.5;

        const halfStaff = 2 * this.lineSpacing; // 5 lines -> 4 spaces. center is between line 3.
        // Actually, G clef staff lines: E, G, B, D, F
        // Center line is B4. 
        // Let's treat valid area as C4 to C6.

        // Draw 5 lines
        // Center of staff is y = this.staffY
        // Lines at -2, -1, 0, 1, 2 * spacing? No.
        // Standard staff has 5 lines.
        // Line 1 (bottom): E4
        // Line 2: G4
        // Line 3: B4 (center)
        // Line 4: D5
        // Line 5: F5

        const startY = this.staffY - (2 * this.lineSpacing); // Top line (F5)

        ctx.beginPath();
        for (let i = 0; i < 5; i++) {
            const y = startY + (i * this.lineSpacing);
            ctx.moveTo(20, y);
            ctx.lineTo(this.width - 20, y);
        }
        ctx.stroke();
    }

    drawClef() {
        const ctx = this.ctx;
        ctx.fillStyle = '#000';
        ctx.font = `${this.lineSpacing * 4}px serif`;
        ctx.textAlign = 'left';
        ctx.textBaseline = 'alphabetic'; // Base line of text
        // 𝄞 G-Clef unicode is U+1D11E, but support might vary.
        // Let's try 𝄞 first, fallback to 'G'.
        // G clef spirals around G line (2nd line from bottom).
        // B4 is center (3rd line). G4 is 2nd line (-1 spacing from center).

        // Position G clef.
        // It's quite tall. 
        const x = 30;
        const y = this.staffY + this.lineSpacing; // Roughly G4 line level for baseline?
        // G clef usually sits where the spiral center is on G4 line.

        // Fine-tuning unicode rendering is hard. SVG path is better but complex code.
        // Let's use simple text for now.
        ctx.fillText('𝄞', x, this.staffY + this.lineSpacing);
    }

    getNoteY(noteData) {
        // Return Y position for a given note.
        /*
          C4 is below staff.
          D4
          E4 (1st line)
          F4
          G4 (2nd line)
          A4
          B4 (3rd line / center)
          C5
          D5 (4th line)
          E5
          F5 (5th line)
          G5 (above)
          A5 (ledger)
          B5
          C6 (ledger)
        */
        // We map note index relative to center B4.
        // B4 is center.
        // Steps from B4:
        // C4 is 7 white steps down?
        // C4 D4 E4 F4 G4 A4 B4. 
        // C4 is lower by: B4(0), A4(-1), G4(-2), F4(-3), E4(-4), D4(-5), C4(-6).
        // Each step is 0.5 * lineSpacing.

        // Find index in standard major scale or just use NOTES index?
        // NOTES array has all semitones. We need only diatonic steps for Y position.

        // Helper to get diatonic step index from C4=0
        const diatonicScale = ['C', 'D', 'E', 'F', 'G', 'A', 'B'];
        const getDiatonicIndex = (note, octave) => {
            // Calculate total steps from C4.
            // C4 is octave 4, note index 0.
            const noteIdx = diatonicScale.indexOf(note);
            return (octave - 4) * 7 + noteIdx;
        };

        // B4 is index 6. (C4=0... B4=6)
        // Center Y is B4.
        // y = centerY - (diatonicIndex - 6) * (lineSpacing / 2)

        const diatonicIndex = getDiatonicIndex(noteData.note, noteData.octave);
        // B4 is center line.
        // index of B4 is 6.

        return this.staffY - (diatonicIndex - 6) * (this.lineSpacing / 2);
    }

    drawNote(noteData, isTarget = false, color = '#000') {
        if (!noteData) return;

        const ctx = this.ctx;
        const x = this.width / 2 + (isTarget ? 0 : 40); // Shift if multiple? For now just center.
        const y = this.getNoteY(noteData);

        ctx.fillStyle = color;
        ctx.strokeStyle = color;
        ctx.lineWidth = 1;

        // Draw Note Head (Ellipse)
        ctx.beginPath();
        ctx.ellipse(x, y, this.noteRadius * 1.2, this.noteRadius * 0.8, -0.2, 0, Math.PI * 2);
        ctx.fill();

        // Draw Stem
        // B4 and above: Stem Down (left side). Below B4: Stem Up (right side).
        // B4 can be either, usually Down.
        const isStemDown = (noteData.octave > 4) || (noteData.octave === 4 && ['B', 'A'].includes(noteData.note) === false);
        // Wait, B4 is center. Standard: B4 down.
        // Let's use > B4 or >= B4.
        const diatonicIndex = (noteData.octave - 4) * 7 + ['C', 'D', 'E', 'F', 'G', 'A', 'B'].indexOf(noteData.note);
        // B4 is index 6.
        const stemDirection = diatonicIndex >= 6 ? 'down' : 'up';

        const stemHeight = this.lineSpacing * 3.5;
        ctx.beginPath();
        if (stemDirection === 'up') {
            ctx.moveTo(x + this.noteRadius * 1.1, y);
            ctx.lineTo(x + this.noteRadius * 1.1, y - stemHeight);
        } else {
            ctx.moveTo(x - this.noteRadius * 1.1, y);
            ctx.lineTo(x - this.noteRadius * 1.1, y + stemHeight);
        }
        ctx.stroke();

        // Draw Accidental (Sharp)
        if (noteData.type === 'black') {
            ctx.font = `${this.lineSpacing * 1.5}px sans-serif`;
            ctx.fillText('♯', x - this.lineSpacing * 1.5, y + this.lineSpacing * 0.4);
        }

        // Draw Ledger Lines
        // C4 (index 0). Line 1 is E4 (index 2).
        // Ledger needed for C4, A5, B5(no), C6.
        // Staff lines are indexes 2, 4, 6, 8, 10. (E4, G4, B4, D5, F5)
        // Center B4 is 6.

        // If index <= 0 (C4 below), we need line at 0 (C4).
        // If index >= 12 (C6 above), need line at 12 (A5 is 11, line at 12).

        // C4: index 0. Lower than E4 (2). Need line at 0.
        if (diatonicIndex <= 0) {
            // Draw line at index 0
            this.drawLedgerLine(x, this.staffY - (0 - 6) * (this.lineSpacing / 2));
        }

        // A5: index 12. Staff top is F5 (10). Next space G5 (11). Line A5 needs ledger? 
        // Upper lines: A5 (12) -> Line. C6 (14) -> Line.
        if (diatonicIndex >= 12) {
            // A5
            this.drawLedgerLine(x, this.staffY - (12 - 6) * (this.lineSpacing / 2));
        }
        if (diatonicIndex >= 14) {
            // C6
            this.drawLedgerLine(x, this.staffY - (14 - 6) * (this.lineSpacing / 2));
        }
    }

    drawLedgerLine(x, y) {
        const ctx = this.ctx;
        ctx.beginPath();
        ctx.moveTo(x - 14, y);
        ctx.lineTo(x + 14, y);
        ctx.stroke();
    }
}
