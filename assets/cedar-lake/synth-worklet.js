// The synth's AudioWorklet: runs synth.wasm (src/synth.cpp) on the browser's audio thread. The game
// posts its sound cues and levels (web/audio.js); each block of 128 samples comes from the synth,
// the left channel a touch quieter, as on the Mac.
'use strict';

class CedarSynth extends AudioWorkletProcessor {
    constructor(options) {
        super();
        const module = new WebAssembly.Module(options.processorOptions.wasm);
        const imports = {};
        for (const i of WebAssembly.Module.imports(module)) {
            imports[i.module] = imports[i.module] || {};
            imports[i.module][i.name] = () => 0;  // nothing should be imported; anything that is does nothing
        }
        this.synth = new WebAssembly.Instance(module, imports).exports;
        if (this.synth._initialize) this.synth._initialize();
        this.levels = this.synth.synth_levels();
        this.samples = this.synth.synth_samples();
        this.port.onmessage = e => this.receive(e.data);
    }

    // [starts low 32 bits, starts high 32 bits, gain, water, danger, breathless, engine, rotor, boss, chant, radio, gust]
    receive(m) {
        const memory = new DataView(this.synth.memory.buffer);
        const low = memory.getUint32(this.levels, true), high = memory.getUint32(this.levels + 4, true);
        memory.setUint32(this.levels, (low | m[0]) >>> 0, true);
        memory.setUint32(this.levels + 4, (high | m[1]) >>> 0, true);
        for (let i = 0; i < 10; i++) memory.setFloat32(this.levels + 8 + i * 4, m[2 + i], true);
    }

    process(inputs, outputs) {
        const out = outputs[0];
        const n = out[0].length;
        this.synth.synth_render(n);
        const samples = new Float32Array(this.synth.memory.buffer, this.samples, n);
        for (let i = 0; i < n; i++) out[0][i] = samples[i] * .96;
        if (out[1]) out[1].set(samples);
        return true;
    }
}

registerProcessor('cedar-synth', CedarSynth);
