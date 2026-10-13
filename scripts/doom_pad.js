// The DOOM page's gamepad, for touch screens: a D-pad and buttons under the
// game, in the key table's place, that press DOOM's keys through js-dos, which runs in the
// page's same-origin frame (/assets/doom/player.html sets window.doomCi). Only
// built where (hover: none) and (pointer: coarse) holds, which is true on phones
// and tablets even at the desktop-width layout this page keeps; computers get
// the key table instead (doom_pad.css swaps them). Each press is key down on
// touch and key up on release, so holding works, and several thumbs at once.
(function () {
    if (!matchMedia('(hover: none) and (pointer: coarse)').matches) return;

    // js-dos takes GLFW key codes
    const K = { up: 265, down: 264, left: 263, right: 262, fire: 341, run: 340, strafe: 342,
                use: 32, enter: 257, menu: 256, map: 258, y: 89 };
    const DEAD = 0.25; // share of the D-pad's radius in the middle that presses nothing

    function ci() {
        const f = document.querySelector('.doom-embed iframe');
        try { return f && f.contentWindow && f.contentWindow.doomCi; } catch (e) { return null; }
    }
    const down = new Map(); // key code -> how many touches hold it, so two never release each other
    function press(code, on) {
        const n = (down.get(code) || 0) + (on ? 1 : -1);
        down.set(code, Math.max(0, n));
        const c = ci();
        if (!c) return;
        if (on && n === 1) c.sendKeyEvent(code, true);
        if (!on && n <= 0) c.sendKeyEvent(code, false);
    }

    function button(label, code, cls, toggle) {
        const b = document.createElement('div');
        b.className = 'pad-btn' + (cls ? ' ' + cls : '');
        b.textContent = label;
        let latched = false;
        b.addEventListener('pointerdown', function (e) {
            e.preventDefault();
            if (toggle) { // Run: tap once to hold Shift, again to let go
                latched = !latched;
                b.classList.toggle('is-down', latched);
                press(code, latched);
                return;
            }
            b.setPointerCapture(e.pointerId);
            b.classList.add('is-down');
            press(code, true);
        });
        if (!toggle) {
            const up = function () {
                if (!b.classList.contains('is-down')) return;
                b.classList.remove('is-down');
                press(code, false);
            };
            b.addEventListener('pointerup', up);
            b.addEventListener('pointercancel', up);
            b.addEventListener('lostpointercapture', up);
        }
        return b;
    }

    // The D-pad: one area, 8 ways. The touch's angle from the centre picks the
    // arrows, so sliding a thumb round it turns and moves without lifting
    function dpad() {
        const pad = document.createElement('div');
        pad.className = 'pad-dpad';
        pad.innerHTML = '<span class="pad-arrow up">▲</span><span class="pad-arrow down">▼</span>' +
                        '<span class="pad-arrow left">◀</span><span class="pad-arrow right">▶</span>';
        let held = new Set();
        function aim(e) {
            const r = pad.getBoundingClientRect();
            const x = (e.clientX - r.left) / r.width * 2 - 1, y = (e.clientY - r.top) / r.height * 2 - 1;
            const want = new Set();
            if (Math.hypot(x, y) > DEAD) {
                const a = Math.atan2(y, x) * 180 / Math.PI; // 0 is right, 90 is down
                if (a > -67.5 && a < 67.5) want.add('right');
                if (a > 112.5 || a < -112.5) want.add('left');
                if (a > 22.5 && a < 157.5) want.add('down');
                if (a < -22.5 && a > -157.5) want.add('up');
            }
            held.forEach(d => { if (!want.has(d)) press(K[d], false); });
            want.forEach(d => { if (!held.has(d)) press(K[d], true); });
            held = want;
            pad.querySelectorAll('.pad-arrow').forEach(s => s.classList.toggle('is-down', held.has(s.classList[1])));
        }
        function release() {
            held.forEach(d => press(K[d], false));
            held = new Set();
            pad.querySelectorAll('.pad-arrow').forEach(s => s.classList.remove('is-down'));
        }
        pad.addEventListener('pointerdown', function (e) { e.preventDefault(); pad.setPointerCapture(e.pointerId); aim(e); });
        pad.addEventListener('pointermove', function (e) { if (pad.hasPointerCapture(e.pointerId)) aim(e); });
        pad.addEventListener('pointerup', release);
        pad.addEventListener('pointercancel', release);
        pad.addEventListener('lostpointercapture', release);
        return pad;
    }

    function build() {
        const root = document.createElement('div');
        root.className = 'doom-pad is-waiting';
        root.addEventListener('contextmenu', e => e.preventDefault()); // no long-press menu

        const top = document.createElement('div');
        top.className = 'pad-top';
        top.append(button('Menu', K.menu), button('Map', K.map), button('Enter', K.enter), button('Y', K.y));
        for (let n = 1; n <= 7; n++) top.append(button(String(n), 48 + n, 'pad-weapon'));

        const right = document.createElement('div');
        right.className = 'pad-right';
        right.append(button('Use', K.use, 'pad-use'), button('Fire', K.fire, 'pad-fire'),
                     button('Run', K.run, 'pad-run', true), button('Strafe', K.strafe, 'pad-strafe'));

        const hint = document.createElement('div');
        hint.className = 'pad-hint';
        hint.textContent = 'tap ▶ in the game to start';

        const main = document.createElement('div');
        main.className = 'pad-main';
        main.append(dpad(), right);
        root.append(hint, top, main);
        const table = document.querySelector('.doom-controls');
        table.parentNode.insertBefore(root, table); // where the key table is (doom_pad.css hides the table)
        document.documentElement.classList.add('has-doom-pad');

        // the pad wakes up once the game is running (js-dos needs a tap on its own ▶ first)
        const wait = setInterval(function () {
            if (!ci()) return;
            root.classList.remove('is-waiting');
            clearInterval(wait);
        }, 300);
    }

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', build);
    else build();
})();
