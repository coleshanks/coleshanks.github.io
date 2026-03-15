// --- Tweakable settings ---
const SAMUS_SPEED        = 1;      // pixels per frame for Samus
const BALL_LEAD          = 80;     // how far ahead the ball starts from Samus
const BALL_SPEED         = 1.4;    // pixels per frame for the ball (faster than Samus)
const SAMUS_INITIAL_WAIT = 22000;  // ms before first appearance
const SAMUS_REPEAT_WAIT  = 120000; // ms between subsequent appearances (2 min)
const SAMUS_START_X      = 255;    // x position to start (right edge of blue sidebar)
const SAMUS_BOTTOM       = 16;     // px from bottom of viewport
// --------------------------

(function () {
    // Don't run on small screens where sidebar is stacked
    if (window.innerWidth <= 400) return;

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

    const samus = makeSprite('/assets/images/games/sprites/metroid/SamusRunningR.gif', SAMUS_BOTTOM);
    const ball  = makeSprite('/assets/images/games/sprites/metroid/SamusBall.gif', SAMUS_BOTTOM);

    let samusX, ballX;

    function animate() {
        samusX += SAMUS_SPEED;
        ballX  += BALL_SPEED;

        samus.style.left = samusX + 'px';
        ball.style.left  = ballX  + 'px';

        const allGone = samusX >= window.innerWidth && ballX >= window.innerWidth;

        if (!allGone) {
            requestAnimationFrame(animate);
        } else {
            samus.style.visibility = 'hidden';
            ball.style.visibility  = 'hidden';
            setTimeout(start, SAMUS_REPEAT_WAIT);
        }
    }

    function start() {
        samusX = SAMUS_START_X;
        ballX  = SAMUS_START_X + BALL_LEAD;
        samus.style.left = samusX + 'px';
        ball.style.left  = ballX  + 'px';
        samus.style.visibility = 'visible';
        ball.style.visibility  = 'visible';
        requestAnimationFrame(animate);
    }

    setTimeout(start, SAMUS_INITIAL_WAIT);
})();
