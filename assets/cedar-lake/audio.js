// The web's sound: started on the first key press or click (browsers allow no sound before one),
// then fed the game's levels each frame (src/web/audio_web.cpp). The synth runs in an AudioWorklet.
// The background music (src/music.h) streams from music/*.m4a on two audio elements, each through
// its own gain into the same context, so one theme can fade out as the next fades in.
'use strict';

window.CedarAudio = (() => {
    let context = null;
    let node = null;
    const MUSIC_VOLUME = .6;  // under the synth's sounds
    const music = [];         // {element, gain, name, plays}
    // A moment of silence, played on the first tap or key so the phone lets these elements play later.
    const SILENT = 'data:audio/wav;base64,UklGRiYAAABXQVZFZm10IBAAAAABAAEAgLsAAAB3AQACABAAZGF0YQIAAAAAAA==';
    const assets = window.CEDAR_ASSETS || '';
    const wasm = fetch(assets + 'synth.wasm').then(r => r.arrayBuffer());

    async function start() {
        try {
            context = new AudioContext({sampleRate: 48000, latencyHint: 'interactive'});
        } catch (e) {
            context = new AudioContext();  // the synth is made for 48 kHz; elsewhere it plays a little off pitch
        }
        await context.audioWorklet.addModule(assets + 'synth-worklet.js');
        const bytes = await wasm;
        node = new AudioWorkletNode(context, 'cedar-synth', {numberOfInputs: 0, outputChannelCount: [2], processorOptions: {wasm: bytes}});
        node.connect(context.destination);
        for (const m of music) {
            m.gain = context.createGain();
            m.gain.gain.value = 0;
            context.createMediaElementSource(m.element).connect(m.gain).connect(context.destination);
        }
    }

    // Any key or click: start the sound the first time, and wake it if the browser put it to sleep.
    function wake() {
        if (!context) {
            for (let i = 0; i < 2; i++) {
                const element = new Audio();
                element.preload = 'auto';
                element.src = SILENT;
                element.play().catch(() => {});
                music.push({element, gain: null, name: '', plays: -1});
            }
            start().catch(e => console.warn('Cedar Lake: no sound', e));
        } else if (context.state !== 'running') {
            context.resume();
        }
    }
    window.addEventListener('keydown', wake, true);
    window.addEventListener('mousedown', wake, true);
    window.addEventListener('touchend', wake, true);

    return {
        post(startsLow, startsHigh, levels) {
            if (node) node.port.postMessage([startsLow, startsHigh, ...levels]);
        },
        musicReady() {
            return !!(context && context.state === 'running' && music.length && music[0].gain);
        },
        // A player's theme ('' for none), started again whenever plays changes, at this loudness.
        music(slot, name, plays, gain) {
            const m = music[slot];
            if (!m || !m.gain) return;
            if (name !== m.name || plays !== m.plays) {
                m.name = name;
                m.plays = plays;
                if (name) {
                    m.element.src = assets + 'music/' + name + '.m4a';
                    m.element.play().catch(() => {});
                } else {
                    m.element.pause();
                }
            }
            m.gain.gain.setTargetAtTime(Math.max(0, Math.min(1, gain)) * MUSIC_VOLUME, context.currentTime, .05);
        },
    };
})();
