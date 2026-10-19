// The web's sound: started on the first key press or click (browsers allow no sound before one),
// then fed the game's levels each frame (src/web/audio_web.cpp). The synth runs in an AudioWorklet.
'use strict';

window.CedarAudio = (() => {
    let context = null;
    let node = null;
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
    }

    // Any key or click: start the sound the first time, and wake it if the browser put it to sleep.
    function wake() {
        if (!context) {
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
    };
})();
