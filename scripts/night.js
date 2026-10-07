// Night mode: N (or the moon on the home page) toggles a starry night theme.
// Each page's <head> has a one-line script that applies the saved choice
// before the first paint; this file handles the toggling and draws the sky.
(function () {
    const KEY = 'night';
    const STARS = 90;
    const METEORS = 3; // pool; with the gap below, at most two are on screen at once
    const METEOR_GAP = 5.5; // seconds between meteors, give or take half a second
    const DRIFTERS = 15; // small extra stars that blink in somewhere new each time
    const STAR_SIZES = [1, 1, 1, 2, 2, 3]; // px, mostly small
    const root = document.documentElement;
    let meteorTimer = null;

    function rand(min, max) {
        return min + Math.random() * (max - min);
    }

    function save(on) {
        try { localStorage.setItem(KEY, on ? '1' : '0'); } catch (e) { /* private mode etc. */ }
    }

    function drawSky() {
        if (document.querySelector('.sky')) return;
        const sky = document.createElement('div');
        sky.className = 'sky';
        sky.setAttribute('aria-hidden', 'true');
        for (let i = 0; i < STARS; i++) {
            const star = document.createElement('div');
            const size = STAR_SIZES[Math.floor(Math.random() * STAR_SIZES.length)];
            star.className = 'star';
            star.style.cssText =
                `left: ${rand(0, 100).toFixed(2)}%; top: ${rand(0, 100).toFixed(2)}%;` +
                `width: ${size}px; height: ${size}px;` +
                // negative delay so the stars start mid-twinkle, out of step
                `animation-duration: ${rand(2.5, 7).toFixed(1)}s; animation-delay: -${rand(0, 7).toFixed(1)}s;`;
            sky.appendChild(star);
        }
        for (let i = 0; i < DRIFTERS; i++) {
            const star = document.createElement('div');
            star.className = 'star';
            star.addEventListener('animationend', function () { fizzle(star); });
            sky.appendChild(star);
            fizzle(star, rand(0, 6));
        }
        const meteors = [];
        for (let i = 0; i < METEORS; i++) {
            const meteor = document.createElement('div');
            meteor.className = 'meteor';
            meteor.addEventListener('animationend', function () { meteor.dataset.busy = ''; });
            sky.appendChild(meteor);
            meteors.push(meteor);
        }
        document.body.prepend(sky);
        // a steady rhythm: one meteor every METEOR_GAP seconds, using whichever is free
        function next() {
            const meteor = meteors.find(m => !m.dataset.busy);
            if (meteor) launch(meteor);
            meteorTimer = setTimeout(next, rand(METEOR_GAP - 0.5, METEOR_GAP + 0.5) * 1000);
        }
        meteorTimer = setTimeout(next, rand(1, 3) * 1000);
    }

    // A drifter is a small star that blinks at a random spot, then moves
    function fizzle(star, wait) {
        star.style.animation = 'none';
        void star.offsetWidth; // lets the same animation start again
        const size = Math.random() < 0.8 ? 1 : 1.5; // smaller than the fixed stars
        star.style.left = rand(0, 100).toFixed(2) + '%';
        star.style.top = rand(0, 100).toFixed(2) + '%';
        star.style.width = size + 'px';
        star.style.height = size + 'px';
        const life = rand(1.2, 2.5).toFixed(2); // a quick blink
        const delay = (wait === undefined ? rand(0.5, 4) : wait).toFixed(2);
        star.style.animation = `star-fizzle ${life}s ease-in-out ${delay}s both`;
    }

    // Each crossing gets a new spot, length and speed
    function launch(meteor) {
        meteor.dataset.busy = '1';
        meteor.style.animation = 'none';
        void meteor.offsetWidth; // lets the same animation start again
        // start below the navbar and banner, which would hide them
        meteor.style.left = rand(10, 65).toFixed(2) + '%';
        meteor.style.top = rand(30, 70).toFixed(2) + '%';
        meteor.style.setProperty('--length', Math.round(rand(90, 170)) + 'px');
        meteor.style.setProperty('--distance', Math.round(rand(280, 440)) + 'px');
        const cross = rand(7.2, 10).toFixed(2); // seconds on screen
        meteor.style.animation = `meteor-cross ${cross}s ease-out both`;
    }

    function clearSky() {
        clearTimeout(meteorTimer);
        const sky = document.querySelector('.sky');
        if (sky) sky.remove();
    }

    // The flyby easter egg (scripts/flyby.js) only flies at night, so it's only
    // fetched once a page is in night mode. fresh: night mode was just switched
    // on, which always sends one
    let flybyFresh = null; // set while flyby.js is still loading
    function startFlyby(fresh) {
        if (window.flyby) {
            window.flyby(fresh);
        } else if (flybyFresh !== null) {
            flybyFresh = flybyFresh || fresh;
        } else {
            flybyFresh = fresh;
            const script = document.createElement('script');
            script.src = '/scripts/flyby.js';
            script.onload = function () { window.flyby(flybyFresh); };
            document.head.appendChild(script);
        }
    }

    function show(on, fresh) {
        root.classList.toggle('night', on);
        if (on) {
            drawSky();
            startFlyby(fresh);
        } else {
            clearSky();
        }
        const btn = document.querySelector('.night-toggle');
        if (btn) btn.setAttribute('aria-pressed', on ? 'true' : 'false');
    }

    function toggle() {
        const on = !root.classList.contains('night');
        show(on, true);
        save(on);
    }

    document.addEventListener('keydown', function (e) {
        if (e.key !== 'n' && e.key !== 'N') return;
        if (e.repeat) return; // holding N down would flick back and forth
        if (e.metaKey || e.ctrlKey || e.altKey) return; // Cmd+N etc. stay the browser's
        const t = e.target;
        if (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName)) return; // typing
        toggle();
    });

    document.addEventListener('DOMContentLoaded', function () {
        const btn = document.querySelector('.night-toggle');
        if (btn) btn.addEventListener('click', function () {
            toggle();
            btn.blur();
        });
        show(root.classList.contains('night'), false); // the <head> script may have set it
    });

    // The back and forward buttons often bring a page back from memory instead of
    // reloading it: catch up with the choice saved since, and count it as a new
    // page view for the flyby
    window.addEventListener('pageshow', function (e) {
        if (!e.persisted) return;
        let on = false;
        try { on = localStorage.getItem(KEY) === '1'; } catch (err) { /* private mode etc. */ }
        if (on !== root.classList.contains('night')) show(on, false);
        else if (on) startFlyby(false);
    });
})();
