// --- Tweakable settings ---
const FLYBY_EVERY    = 1;      // fly by on every Nth page load (1 while debugging on the CV page)
const FLYBY_WAIT     = 4000;   // ms after the page loads before it appears
const FLYBY_DURATION = 28000;  // ms to cross the screen
const FLYBY_ARC      = 0.25;   // how high the arc bows, as a share of the screen height
const FLYBY_SPIN     = [14000, 22000]; // ms for one full 3D turn, picked at random in this range
const FLYBY_SHOW_ALL = true;   // debug: fly every craft in turn instead of one at random
const FLYBY_ALL_GAP  = 2000;   // ms between them when showing all
// --------------------------

// Easter egg for night mode (only the CV page loads it for now): now and then a
// NASA spacecraft (or asteroid Bennu) drifts across the sky behind the page on an
// arc, slowly tumbling. Each sheet holds 600 frames of one loop that turns the
// model a full circle about two axes at once, rendered in Blender from NASA 3D
// Resources models (public domain). Neighbouring frames are blended so the turn
// looks continuous.
(function () {
    const SHEET = { frames: 600, cols: 25 };
    const CRAFT = [ // frameW/frameH: one frame in the sheet; width: how big it shows
        { src: '/assets/images/space/nasa/deep-space-1-spin.webp', frameW: 158, frameH: 160, width: 140 },
        { src: '/assets/images/space/nasa/calipso-spin.webp',      frameW: 159, frameH: 160, width: 150 },
        { src: '/assets/images/space/nasa/apollo-soyuz-spin.webp', frameW: 160, frameH: 148, width: 140 },
        { src: '/assets/images/space/nasa/bennu-spin.webp',        frameW: 158, frameH: 160, width: 70 },
    ];

    let visits;
    try {
        visits = (parseInt(localStorage.getItem('flyby_visits'), 10) || 0) + 1;
        localStorage.setItem('flyby_visits', visits);
    } catch (e) {
        return;
    }
    if (visits % FLYBY_EVERY !== 0) return;

    const rand = (min, max) => min + Math.random() * (max - min);
    const queue = FLYBY_SHOW_ALL ? CRAFT.slice() : [CRAFT[Math.floor(Math.random() * CRAFT.length)]];
    const sheets = queue.map(function (c) { // start loading now so they're ready when the wait is over
        const img = new Image();
        img.src = c.src;
        return img;
    });

    function next(i) {
        if (i >= queue.length) return;
        fly(queue[i], sheets[i], function () {
            setTimeout(function () { next(i + 1); }, FLYBY_ALL_GAP);
        });
    }
    setTimeout(function () { next(0); }, FLYBY_WAIT);

    function fly(craft, sheet, done) {
        const sky = document.querySelector('.sky'); // only there in night mode
        if (!sky) return;
        if (!sheet.complete) { // still downloading: go once it's in
            sheet.onload = function () { fly(craft, sheet, done); };
            return;
        }
        if (!sheet.naturalWidth) { done(); return; } // failed to load

        const w = craft.width;
        const h = Math.round(w * craft.frameH / craft.frameW);
        const rows = Math.ceil(SHEET.frames / SHEET.cols);
        const el = document.createElement('div');
        el.className = 'flyby';
        el.style.width = w + 'px';
        el.style.height = h + 'px';
        const layers = [0, 1].map(function () { // current frame, and the next one fading in on top
            const layer = document.createElement('div');
            layer.style.backgroundImage = `url(${craft.src})`;
            layer.style.backgroundSize = `${SHEET.cols * w}px ${rows * h}px`;
            el.appendChild(layer);
            return layer;
        });
        sky.appendChild(el);

        // a curve from off one side to off the other, bowing upward in the middle
        const vw = window.innerWidth, vh = window.innerHeight;
        const leftToRight = Math.random() < 0.5;
        const x0 = leftToRight ? -w - 20 : vw + 20;
        const x2 = leftToRight ? vw + 20 : -w - 20;
        const y0 = vh * rand(0.55, 0.85);
        const y2 = vh * rand(0.35, 0.75);
        const x1 = vw / 2;
        const y1 = Math.min(y0, y2) - vh * FLYBY_ARC;
        const roll = rand(-12, 12); // a little 2D drift on top of the 3D turn

        const path = [];
        for (let i = 0; i <= 40; i++) {
            const t = i / 40, u = 1 - t;
            const x = u * u * x0 + 2 * u * t * x1 + t * t * x2;
            const y = u * u * y0 + 2 * u * t * y1 + t * t * y2;
            path.push({ transform: `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px) rotate(${(roll * t).toFixed(1)}deg)` });
        }
        const flight = el.animate(path, { duration: FLYBY_DURATION, easing: 'linear' });

        // the 3D tumble: play through the sheet from a random frame, either way round,
        // blending each frame into the next
        const spinMs = rand(FLYBY_SPIN[0], FLYBY_SPIN[1]);
        const start = Math.random() * SHEET.frames;
        const dir = Math.random() < 0.5 ? 1 : -1;
        const t0 = performance.now();
        const n = SHEET.frames;
        const place = (layer, frame) => {
            layer.style.backgroundPosition = `${-(frame % SHEET.cols) * w}px ${-Math.floor(frame / SHEET.cols) * h}px`;
        };
        function turn(now) {
            if (!el.isConnected) return;
            const pos = start + dir * (now - t0) / spinMs * n;
            const a = ((Math.floor(pos) % n) + n) % n;
            place(layers[0], a);
            place(layers[1], (a + 1) % n);
            layers[1].style.opacity = (pos - Math.floor(pos)).toFixed(3);
            requestAnimationFrame(turn);
        }
        requestAnimationFrame(turn);

        flight.onfinish = function () {
            el.remove();
            done();
        };
    }
})();
