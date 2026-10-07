// --- Tweakable settings ---
const SAMUS_SPEED        = 1;      // pixels per frame for Samus
const BALL_LEAD          = 80;     // how far ahead the ball starts from Samus
const BALL_SPEED         = 1.4;    // pixels per frame for the ball (faster than Samus)
const SAMUS_WAIT         = 4000;   // ms after the page loads (or light mode comes back) before he appears
const SAMUS_EVERY        = 8;      // light-mode home page loads from one run to the next
const SAMUS_START_X      = 255;    // x position to start (right edge of blue sidebar)
const SAMUS_BOTTOM       = 16;     // px from bottom of viewport
// --------------------------

// Light mode only. Each visit (until the browser is closed) he runs on the first
// light-mode load of the home page, then on every SAMUS_EVERY-th one after his
// last run (a refresh, coming back from another page, or back and forward),
// counted in sessionStorage. A run that's due stays due until it starts, so
// leaving early doesn't lose it. Switching from night back to light always
// sends him, and switching to night hides him.
(function () {
    // Don't run on small screens where sidebar is stacked
    if (window.innerWidth <= 600) return;

    function makeSprite(src, bottom) {
        const el = document.createElement('img');
        el.src = src;
        el.style.cssText = [
            'position: fixed',
            'bottom: ' + bottom + 'px',
            'left: ' + SAMUS_START_X + 'px',
            'z-index: 9999',
            'pointer-events: none',
            'image-rendering: pixelated',
            'visibility: hidden',
        ].join(';');
        document.body.appendChild(el);
        return el;
    }

    const samus = makeSprite('/assets/images/sprites/metroid/Samus.gif', SAMUS_BOTTOM);
    const ball  = makeSprite('/assets/images/sprites/metroid/SamusBall.gif', SAMUS_BOTTOM);

    let samusX, ballX;
    const root = document.documentElement;
    let run = 0; // each start or mode switch bumps this, so older timers and runs give up

    function hide() {
        samus.style.visibility = 'hidden';
        ball.style.visibility  = 'hidden';
    }

    function animate(thisRun) {
        if (thisRun !== run) return; // night mode came on, or he was sent again
        samusX += SAMUS_SPEED;
        ballX  += BALL_SPEED;

        samus.style.left = samusX + 'px';
        ball.style.left  = ballX  + 'px';

        const allGone = samusX >= window.innerWidth && ballX >= window.innerWidth;

        if (!allGone) {
            requestAnimationFrame(function () { animate(thisRun); });
        } else {
            hide();
        }
    }

    function start(thisRun) {
        if (thisRun !== run) return;
        try { sessionStorage.setItem('samus_since', 0); } catch (e) { /* private mode etc. */ }
        samusX = SAMUS_START_X;
        ballX  = SAMUS_START_X + BALL_LEAD;
        samus.style.left = samusX + 'px';
        ball.style.left  = ballX  + 'px';
        samus.style.visibility = 'visible';
        ball.style.visibility  = 'visible';
        requestAnimationFrame(function () { animate(thisRun); });
    }

    // fresh: light mode just came back, which always sends him
    function schedule(fresh) {
        const thisRun = ++run;
        hide();
        if (root.classList.contains('night')) return;
        if (!fresh) {
            try {
                // light-mode home page loads since his last run this visit; none yet means he's due
                const since = JSON.parse(sessionStorage.getItem('samus_since'));
                const count = since === null ? SAMUS_EVERY : since + 1;
                sessionStorage.setItem('samus_since', count);
                if (count < SAMUS_EVERY) return;
            } catch (e) {
                return; // no sessionStorage, no Samus
            }
        }
        setTimeout(function () { start(thisRun); }, SAMUS_WAIT);
    }

    // night.js switches html.night: night hides him, and coming back to light sends him
    let wasNight = root.classList.contains('night');
    new MutationObserver(function () {
        const night = root.classList.contains('night');
        if (night === wasNight) return;
        wasNight = night;
        schedule(true);
    }).observe(root, { attributes: true, attributeFilter: ['class'] });

    // the back and forward buttons often bring the page back from memory instead
    // of reloading it: count that as a home page load too
    window.addEventListener('pageshow', function (e) {
        if (e.persisted) schedule(false);
    });

    schedule(false);
})();
