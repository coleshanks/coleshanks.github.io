// --- Tweakable settings ---
const FLYBY_LAUNCH   = '/pages/CV'; // the page whose first flyby starts each visit (path, no .html)
const FLYBY_EVERY    = 8;      // night-mode jumps from one flyby to the next
const FLYBY_WAIT     = 4000;   // ms after the page loads (or night mode comes on) before it appears
const FLYBY_DURATION = 28000;  // ms to cross the screen
const FLYBY_ARC      = 0.25;   // how high the arc bows, as a share of the screen height
const FLYBY_SPIN     = [14000, 22000]; // ms for one full 3D turn, picked at random in this range
const FLYBY_ALL_GAP  = 2000;   // ms between craft when showing them all (?flyby)
// --------------------------

// Easter egg for night mode: now and then a NASA craft drifts across the sky
// behind the page on a random arc, slowly tumbling: Deep Space 1, CALIPSO,
// Apollo–Soyuz, asteroid Bennu, a Z2 spacesuit, Gateway, the Apollo Lunar Module
// or an Agena target vehicle. Each sheet holds 600 frames of one loop that turns
// the model a full circle about two axes at once, rendered in Blender from NASA
// 3D Resources models (public domain) with the tools in scripts/flyby-render/.
// Neighbouring frames are blended so the turn looks continuous.
//
// When: each visit (until the browser is closed) starts quiet. The first flyby
// comes on the CV page in night mode, and once it has flown the visit is
// launched: from then on one comes every FLYBY_EVERY-th night-mode jump (any
// page load, back and forward included), and switching night mode on sends one.
// Never on the home page, which is Samus's: it counts as a jump, but a flyby due
// there waits for the next page. A due flyby stays due until it actually
// starts, so leaving a page early doesn't lose it, and a page opened in a
// background tab keeps it until the tab is looked at.
// Which: craft are dealt like cards from a shuffled deck kept in localStorage
// across visits, so all eight turn up before any repeats, and never the same
// one twice in a row.
// Add ?flyby to a page's URL to fly every craft in turn, in a shuffled order.
(function () {
    const SHEET = { frames: 600, cols: 25 };
    const CRAFT = [ // frameW/frameH: one frame in the sheet; width: how big it shows
        { src: '/assets/images/space/nasa/deep-space-1-spin.webp', frameW: 158, frameH: 160, width: 140 },
        { src: '/assets/images/space/nasa/calipso-spin.webp',      frameW: 159, frameH: 160, width: 150 },
        { src: '/assets/images/space/nasa/apollo-soyuz-spin.webp', frameW: 160, frameH: 148, width: 140 },
        { src: '/assets/images/space/nasa/bennu-spin.webp',        frameW: 158, frameH: 160, width: 70 },
        { src: '/assets/images/space/nasa/z2-spacesuit-spin.webp', frameW: 138, frameH: 160, width: 80 },
        { src: '/assets/images/space/nasa/gateway-core-spin.webp', frameW: 104, frameH: 160, width: 110 },
        { src: '/assets/images/space/nasa/apollo-lunar-module-spin.webp', frameW: 117, frameH: 160, width: 100 },
        { src: '/assets/images/space/nasa/agena-spin.webp',        frameW: 160, frameH: 144, width: 140 },
    ];

    const rand = (min, max) => min + Math.random() * (max - min);
    const showAll = new URLSearchParams(location.search).has('flyby');
    const page = location.pathname.replace(/\.html$/, '');
    const onHome = page === '/' || page === '/index';
    const onLaunch = page === FLYBY_LAUNCH;
    let run = 0; // each start bumps this, so timers left from an earlier start give up

    function shuffle(list) { // Fisher–Yates: a fresh random order
        const out = list.slice();
        for (let i = out.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [out[i], out[j]] = [out[j], out[i]];
        }
        return out;
    }

    // night.js calls this once a page is in night mode: fresh is false for a page
    // view (a load, or back and forward), and true when night mode has just been
    // switched on
    window.flyby = function (fresh) {
        const thisRun = ++run;
        // back from memory (back and forward): drop a craft left mid-flight
        document.querySelectorAll('.sky .flyby').forEach(function (el) { el.remove(); });
        let queue = shuffle(CRAFT); // ?flyby: all of them
        let deal = function () {};
        if (!showAll) {
            try {
                let due;
                if (sessionStorage.getItem('flyby_launched') !== '1') {
                    due = onLaunch; // nothing counts until the first flyby on the CV this visit
                } else if (fresh) {
                    due = !onHome;
                } else {
                    // night-mode jumps since the last flyby this visit
                    const since = (parseInt(sessionStorage.getItem('flyby_since'), 10) || 0) + 1;
                    sessionStorage.setItem('flyby_since', since);
                    due = since >= FLYBY_EVERY && !onHome;
                }
                if (!due) return;
                // the deck: srcs still to deal, top card last; a new shuffle once it's empty
                let deck = (JSON.parse(localStorage.getItem('flyby_deck')) || [])
                    .filter(src => CRAFT.some(c => c.src === src));
                if (!deck.length) deck = shuffle(CRAFT).map(c => c.src);
                queue = [CRAFT.find(c => c.src === deck[deck.length - 1])];
                deal = function (flew) { // take the top card; once one flies, the visit is launched and the count restarts
                    try {
                        let rest = deck.slice(0, -1);
                        if (!rest.length) { // that was the last card: a new shuffle, never starting with the same craft
                            rest = shuffle(CRAFT).map(c => c.src);
                            if (rest[rest.length - 1] === deck[deck.length - 1]) rest.unshift(rest.pop());
                        }
                        localStorage.setItem('flyby_deck', JSON.stringify(rest));
                        if (flew) {
                            sessionStorage.setItem('flyby_launched', '1');
                            sessionStorage.setItem('flyby_since', 0);
                        }
                    } catch (e) { /* private mode etc. */ }
                };
            } catch (e) {
                return; // no storage, no flyby
            }
        }

        // sheets are 1.4-2.4 MB, so each one loads just before its turn (the next one
        // while the current one flies) and is let go once it has crossed
        const sheets = [];
        function sheet(i) {
            if (i < queue.length && !sheets[i]) {
                sheets[i] = new Image();
                sheets[i].src = queue[i].src;
            }
            return sheets[i];
        }
        sheet(0); // start now, so it's ready when the wait is over

        function next(i) {
            if (i >= queue.length || thisRun !== run) return;
            sheet(i + 1);
            fly(queue[i], sheet(i), thisRun, deal, function () {
                sheets[i] = null;
                setTimeout(function () { next(i + 1); }, FLYBY_ALL_GAP);
            });
        }
        setTimeout(function () { next(0); }, FLYBY_WAIT);
    };

    function fly(craft, sheet, thisRun, deal, done) {
        const sky = document.querySelector('.sky'); // only there in night mode
        if (!sky || thisRun !== run) return; // back to day mode, or started again since
        if (document.hidden) { // in a background tab: wait until it's looked at, then the usual few seconds
            document.addEventListener('visibilitychange', function shown() {
                if (document.hidden) return;
                document.removeEventListener('visibilitychange', shown);
                setTimeout(function () { fly(craft, sheet, thisRun, deal, done); }, FLYBY_WAIT);
            });
            return;
        }
        if (!sheet.complete) { // still downloading: go once it's in (or has failed)
            sheet.onload = sheet.onerror = function () { fly(craft, sheet, thisRun, deal, done); };
            return;
        }
        if (!sheet.naturalWidth) { deal(false); done(); return; } // failed to load: skip that card
        deal(true);

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
