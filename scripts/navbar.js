// --- Tweakable settings ---
const NAV_THRESHOLD = 200; // px from the top of the page before the navbar starts to hide
const NAV_ESCAPE    = 2;   // how fast it slides up, relative to the scroll, on its way out
const NAV_TOLERANCE = 6;   // px of scrolling the other way before it counts as a change of direction
// --------------------------

// The navbar stays put near the top of the page. Past NAV_THRESHOLD, scrolling
// down slides it up out of the way and scrolling up brings it straight back.
// The slide is the 0.5s transform transition on .navbar in style.css. The home
// page has no .navbar, so this does nothing there.
(function () {
    const navbar = document.querySelector('.navbar');
    if (!navbar) return;

    let down = false;            // the direction of the scroll
    let turn = window.scrollY;   // the furthest point in that direction, to measure a turn from
    let queued = false;

    function update() {
        queued = false;
        const y = window.scrollY;
        // past the bottom of the page, iPhone's rubber-band bounce scrolls back up: ignore it
        if (y > document.documentElement.scrollHeight - window.innerHeight) return;

        if (down) {
            if (y > turn) turn = y;
            else if (turn - y > NAV_TOLERANCE) { down = false; turn = y; }
        } else {
            if (y < turn) turn = y;
            else if (y - turn > NAV_TOLERANCE) { down = true; turn = y; }
        }

        // on the way out it moves with the scroll near the threshold, but never
        // further than its own height, so scrolling up brings it back at once
        const hide = down && y > NAV_THRESHOLD
            ? Math.min((y - NAV_THRESHOLD) * NAV_ESCAPE, navbar.offsetHeight + 4)
            : 0;
        navbar.style.transform = hide ? `translateY(${-hide}px)` : '';
    }

    window.addEventListener('scroll', function () {
        if (!queued) {
            queued = true;
            requestAnimationFrame(update); // once per frame, however many scroll events come in
        }
    }, { passive: true });
})();
