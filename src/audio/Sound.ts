// All sound is synthesised with the Web Audio API: no audio files needed.
// Cartoon effects plus a soft spooky ambience/chase loop per level.

export type Mood = 'cellar' | 'chase' | 'house' | 'title' | 'toys' | 'bath' | 'boss' | 'none';

const STORAGE_KEY = 'motr.muted';

class SoundEngine {
    private ctx: AudioContext | null = null;
    private master: GainNode | null = null;
    private musicBus: GainNode | null = null;
    private noiseBuf: AudioBuffer | null = null;
    private muted = false;
    private mood: Mood = 'none';
    private moodNodes: AudioNode[] = [];
    private moodTimer: number | null = null;
    private nextNoteTime = 0;
    private musicStep = 0;

    constructor() {
        try {
            this.muted = localStorage.getItem(STORAGE_KEY) === '1';
        } catch {
            this.muted = false;
        }
    }

    /** Must be called from a user gesture (browsers block audio until then). */
    unlock() {
        if (!this.ctx) {
            const Ctor = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
            if (!Ctor) return;
            this.ctx = new Ctor();
            this.master = this.ctx.createGain();
            this.master.gain.value = this.muted ? 0 : 0.6;
            this.master.connect(this.ctx.destination);
            this.musicBus = this.ctx.createGain();
            this.musicBus.gain.value = 0.5;
            this.musicBus.connect(this.master);
            const len = this.ctx.sampleRate;
            this.noiseBuf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
            const d = this.noiseBuf.getChannelData(0);
            for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
            const pending = this.mood;
            this.mood = 'none';
            if (pending !== 'none') this.setMood(pending);
        }
        if (this.ctx.state === 'suspended') void this.ctx.resume();
    }

    get isMuted() {
        return this.muted;
    }

    toggleMute(): boolean {
        this.muted = !this.muted;
        try {
            localStorage.setItem(STORAGE_KEY, this.muted ? '1' : '0');
        } catch {
            /* storage unavailable: fine */
        }
        if (this.master && this.ctx) this.master.gain.setTargetAtTime(this.muted ? 0 : 0.6, this.ctx.currentTime, 0.02);
        return this.muted;
    }

    // ───────────────────────────────────────── building blocks

    private tone(
        type: OscillatorType, f0: number, f1: number, dur: number,
        vol = 0.3, delay = 0, dest?: AudioNode,
    ) {
        const ctx = this.ctx;
        if (!ctx || !this.master) return;
        const t = ctx.currentTime + delay;
        const osc = ctx.createOscillator();
        const g = ctx.createGain();
        osc.type = type;
        osc.frequency.setValueAtTime(f0, t);
        osc.frequency.exponentialRampToValueAtTime(Math.max(f1, 1), t + dur);
        g.gain.setValueAtTime(0.0001, t);
        g.gain.exponentialRampToValueAtTime(vol, t + 0.01);
        g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
        osc.connect(g).connect(dest ?? this.master);
        osc.start(t);
        osc.stop(t + dur + 0.05);
    }

    private noise(dur: number, vol = 0.3, filterFreq = 2000, delay = 0, type: BiquadFilterType = 'lowpass') {
        const ctx = this.ctx;
        if (!ctx || !this.master || !this.noiseBuf) return;
        const t = ctx.currentTime + delay;
        const src = ctx.createBufferSource();
        src.buffer = this.noiseBuf;
        const f = ctx.createBiquadFilter();
        f.type = type;
        f.frequency.value = filterFreq;
        const g = ctx.createGain();
        g.gain.setValueAtTime(vol, t);
        g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
        src.connect(f).connect(g).connect(this.master);
        src.start(t);
        src.stop(t + dur + 0.05);
    }

    // ───────────────────────────────────────── effects

    jump() { this.tone('square', 280, 620, 0.13, 0.12); }
    climb() { this.tone('triangle', 900, 1100, 0.04, 0.06); }
    cheese() {
        this.tone('square', 880, 880, 0.07, 0.1);
        this.tone('square', 1320, 1320, 0.1, 0.1, 0.07);
    }
    pop() { this.tone('sine', 300, 900, 0.08, 0.2); }
    unpop() { this.tone('sine', 900, 300, 0.08, 0.15); }
    click() {
        this.noise(0.04, 0.3, 4000, 0, 'highpass');
        this.tone('square', 1800, 1200, 0.03, 0.06);
    }
    alert() {
        this.tone('square', 990, 990, 0.06, 0.1);
        this.tone('square', 1320, 1320, 0.1, 0.1, 0.08);
    }
    beep(high = false) { this.tone('square', high ? 1046 : 523, high ? 1046 : 523, 0.12, 0.1); }
    bloop() { this.tone('sine', 500, 160, 0.18, 0.18); }
    whoosh() { this.noise(0.5, 0.25, 900, 0, 'bandpass'); }
    step(vol = 0.5) {
        this.tone('sine', 90, 40, 0.18, 0.35 * vol);
        this.noise(0.08, 0.12 * vol, 300);
    }

    /** The big jump-scare: a cartoon "MRRROWW!" with a stinger chord. */
    scare() {
        const ctx = this.ctx;
        if (!ctx || !this.master) return;
        this.noise(0.25, 0.35, 1500);
        const t = ctx.currentTime;
        const osc = ctx.createOscillator();
        const lfo = ctx.createOscillator();
        const lfoGain = ctx.createGain();
        const g = ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(420, t);
        osc.frequency.linearRampToValueAtTime(760, t + 0.15);
        osc.frequency.exponentialRampToValueAtTime(180, t + 0.7);
        lfo.frequency.value = 18;
        lfoGain.gain.value = 30;
        lfo.connect(lfoGain).connect(osc.frequency);
        g.gain.setValueAtTime(0.0001, t);
        g.gain.exponentialRampToValueAtTime(0.25, t + 0.03);
        g.gain.exponentialRampToValueAtTime(0.0001, t + 0.75);
        osc.connect(g).connect(this.master);
        osc.start(t); lfo.start(t);
        osc.stop(t + 0.8); lfo.stop(t + 0.8);
        for (const f of [311, 440, 622]) this.tone('square', f, f * 0.97, 0.5, 0.05);
    }

    /** Losing: a slide-whistle down. Silly rather than sad. */
    oops() {
        this.tone('triangle', 900, 120, 0.5, 0.2);
        this.tone('square', 450, 60, 0.5, 0.05);
    }

    snap() {
        this.noise(0.08, 0.5, 3000, 0, 'highpass');
        this.tone('square', 2200, 600, 0.06, 0.15);
    }

    /** The giant yelps. */
    ouch() {
        const ctx = this.ctx;
        if (!ctx || !this.master) return;
        const t = ctx.currentTime;
        const osc = ctx.createOscillator();
        const g = ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(220, t);
        osc.frequency.linearRampToValueAtTime(330, t + 0.1);
        osc.frequency.exponentialRampToValueAtTime(110, t + 0.5);
        g.gain.setValueAtTime(0.2, t);
        g.gain.exponentialRampToValueAtTime(0.0001, t + 0.55);
        const f = ctx.createBiquadFilter();
        f.type = 'lowpass';
        f.frequency.value = 1200;
        osc.connect(f).connect(g).connect(this.master);
        osc.start(t);
        osc.stop(t + 0.6);
    }

    thud() {
        this.tone('sine', 120, 30, 0.6, 0.6);
        this.noise(0.4, 0.3, 400);
    }

    win() {
        [523, 659, 784, 1046, 784, 1046].forEach((f, i) => this.tone('square', f, f, 0.16, 0.1, i * 0.12));
        this.tone('triangle', 262, 262, 0.8, 0.15, 0.6);
    }

    keyGet() {
        [1046, 1318, 1568, 2093].forEach((f, i) => this.tone('triangle', f, f, 0.12, 0.12, i * 0.06));
    }

    boing() {
        this.tone('square', 180, 720, 0.2, 0.12);
        this.tone('triangle', 360, 1200, 0.25, 0.08, 0.03);
    }

    /** Jack-in-the-box: a little surprise fanfare */
    surprise() {
        this.tone('square', 784, 784, 0.06, 0.08);
        this.tone('square', 1046, 1046, 0.12, 0.08, 0.06);
        this.boing();
    }

    splash() {
        this.noise(0.5, 0.35, 1200);
        this.tone('sine', 300, 80, 0.4, 0.2);
    }

    bubblePop() { this.tone('sine', 800, 1400, 0.05, 0.12); }

    sizzle() { this.noise(0.35, 0.18, 5000, 0, 'highpass'); }

    /** Ghost "wooOOoo" */
    boo() {
        const ctx = this.ctx;
        if (!ctx || !this.master) return;
        const t = ctx.currentTime;
        const o = ctx.createOscillator();
        const lfo = ctx.createOscillator();
        const lg = ctx.createGain();
        const g = ctx.createGain();
        o.type = 'sine';
        o.frequency.setValueAtTime(300, t);
        o.frequency.linearRampToValueAtTime(520, t + 0.4);
        o.frequency.linearRampToValueAtTime(260, t + 0.9);
        lfo.frequency.value = 6;
        lg.gain.value = 25;
        lfo.connect(lg).connect(o.frequency);
        g.gain.setValueAtTime(0.0001, t);
        g.gain.exponentialRampToValueAtTime(0.2, t + 0.1);
        g.gain.exponentialRampToValueAtTime(0.0001, t + 0.95);
        o.connect(g).connect(this.master);
        o.start(t); lfo.start(t);
        o.stop(t + 1); lfo.stop(t + 1);
    }

    fuse() {
        this.click();
        this.tone('sawtooth', 60, 60, 0.6, 0.06, 0.05);
        [523, 784, 1046].forEach((f, i) => this.tone('triangle', f, f, 0.15, 0.1, 0.2 + i * 0.08));
    }

    squeak() {
        this.tone('square', 1500, 2200, 0.06, 0.06);
        this.tone('square', 1700, 2400, 0.06, 0.06, 0.09);
    }

    shh() { this.noise(0.6, 0.3, 3500, 0, 'highpass'); }

    jingle() {
        [2093, 2637, 2093, 2637].forEach((f, i) => this.tone('triangle', f, f * 1.01, 0.12, 0.08, i * 0.07));
    }

    purr() {
        for (let i = 0; i < 4; i++) this.noise(0.12, 0.12, 300, i * 0.15);
    }

    rocket() {
        this.noise(1.6, 0.35, 800);
        this.tone('sawtooth', 80, 400, 1.5, 0.1);
    }

    // ───────────────────────────────────────── background moods

    setMood(mood: Mood) {
        if (mood === this.mood) return;
        this.stopMood();
        this.mood = mood;
        const ctx = this.ctx;
        if (!ctx || !this.musicBus || mood === 'none') return;

        if (mood !== 'chase') {
            // low, slowly breathing drone
            const lp = ctx.createBiquadFilter();
            lp.type = 'lowpass';
            lp.frequency.value = 380;
            const g = ctx.createGain();
            g.gain.value = 0.0001;
            g.gain.exponentialRampToValueAtTime(0.18, ctx.currentTime + 2);
            lp.connect(g).connect(this.musicBus);
            const base = mood === 'house' ? 49 : mood === 'toys' ? 65 : mood === 'bath' ? 73 : 55;
            for (const f of [base, base * 1.498, base * 2.01]) {
                const o = ctx.createOscillator();
                o.type = 'triangle';
                o.frequency.value = f;
                o.connect(lp);
                o.start();
                this.moodNodes.push(o);
            }
            const lfo = ctx.createOscillator();
            const lfoG = ctx.createGain();
            lfo.frequency.value = 0.12;
            lfoG.gain.value = 160;
            lfo.connect(lfoG).connect(lp.frequency);
            lfo.start();
            this.moodNodes.push(lfo, lp, g);
        }

        this.nextNoteTime = ctx.currentTime + 0.1;
        this.musicStep = 0;
        this.moodTimer = window.setInterval(() => this.scheduleMusic(), 100);
    }

    private scheduleMusic() {
        const ctx = this.ctx;
        if (!ctx || !this.musicBus) return;
        while (this.nextNoteTime < ctx.currentTime + 0.3) {
            const t = this.nextNoteTime - ctx.currentTime;
            if (this.mood === 'chase' || this.mood === 'boss') {
                // driving minor bassline, 8th notes at ~150bpm
                const bass = this.mood === 'boss'
                    ? [98, 98, 117, 98, 131, 123, 117, 110]
                    : [110, 110, 131, 110, 147, 110, 131, 123];
                const f = bass[this.musicStep % 8];
                this.tone('square', f, f, 0.16, 0.08, t, this.musicBus);
                if (this.musicStep % 4 === 0) this.noise(0.05, 0.12, 6000, t, 'highpass');
                if (this.musicStep % 16 === 14) this.tone('square', 440, 466, 0.18, 0.04, t, this.musicBus);
                this.nextNoteTime += 0.2;
            } else {
                // sparse music-box notes in a spooky minor key
                const notes = this.mood === 'title'
                    ? [659, 622, 659, 494, 587, 523, 440, 0]
                    : this.mood === 'toys'
                        ? [523, 659, 784, 659, 698, 0, 587, 0, 523, 659, 784, 1046]
                        : this.mood === 'bath'
                            ? [392, 0, 466, 0, 523, 466, 0, 392, 0, 349, 0, 0]
                            : [440, 0, 523, 494, 0, 415, 440, 0, 0, 659, 0, 0];
                const f = notes[this.musicStep % notes.length];
                if (f) {
                    this.tone('triangle', f, f, 0.9, 0.05, t, this.musicBus);
                    this.tone('sine', f * 2, f * 2, 0.5, 0.015, t, this.musicBus);
                }
                this.nextNoteTime += this.mood === 'title' ? 0.45 : 0.75;
            }
            this.musicStep++;
        }
    }

    private stopMood() {
        if (this.moodTimer !== null) {
            window.clearInterval(this.moodTimer);
            this.moodTimer = null;
        }
        for (const n of this.moodNodes) {
            try {
                if (n instanceof OscillatorNode) n.stop();
                n.disconnect();
            } catch {
                /* already stopped */
            }
        }
        this.moodNodes = [];
    }
}

export const Sound = new SoundEngine();
