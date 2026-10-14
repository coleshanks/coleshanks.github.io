// The DOOM page's gamepad, for touch screens: a thumbstick and buttons that
// play DOOM through js-dos, which runs in the page's same-origin frame
// (/assets/doom/player.html sets window.doomCi). Only built where
// (hover: none) and (pointer: coarse) holds, which is true on phones and
// tablets; computers get the key table instead (doom_pad.css swaps them and
// lays the page out for phones, upright and sideways).
//
// The stick is analog, like most phone games: put a thumb down anywhere on the
// left and it appears under it, and how far the thumb is pushed sets the speed.
// It drives DOOM's mouse, not the arrow keys: sideways turns (or strafes while
// Strafe is held), up and down walk, and pushed all the way is running speed
// (DOOM caps mouse movement at the run speed, so no Run button is needed).
// Buttons are key down on touch and key up on release, so holding works, and
// several thumbs at once.
(function () {
    if (!matchMedia('(hover: none) and (pointer: coarse)').matches) return;

    // js-dos takes GLFW key codes
    const K = { fire: 341, strafe: 342, use: 32, enter: 257, menu: 256, map: 258, y: 89 };

    // Stick speeds, in DOSBox mouse pixels per second at full push. Measured with
    // DOOM's own position readout (idmypos), at its default mouse sensitivity:
    // a pixel sideways turns about 0.114°, a pixel up moves about one unit of
    // DOOM's per-tic forward speed, which tops out at 50 (running), 35 tics a second
    const TURN = 1800;    // about 205° a second; the curve below keeps small pushes fine
    const CURVE = 1.6;    // turning speed = push ^ CURVE, for aiming
    const STRAFE = 300;   // DOOM's strafe tops out early, so full push is about its top speed
    const FORWARD = 1750; // 50 a tic × 35 tics: running, and walking at half way
    const DEAD = 0.12;    // share of the stick's reach in the middle that does nothing

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

    function button(label, code, cls) {
        const b = document.createElement('div');
        b.className = 'pad-btn' + (cls ? ' ' + cls : '');
        b.textContent = label;
        b.addEventListener('pointerdown', function (e) {
            e.preventDefault();
            b.setPointerCapture(e.pointerId);
            b.classList.add('is-down');
            press(code, true);
        });
        const up = function () {
            if (!b.classList.contains('is-down')) return;
            b.classList.remove('is-down');
            press(code, false);
        };
        b.addEventListener('pointerup', up);
        b.addEventListener('pointercancel', up);
        b.addEventListener('lostpointercapture', up);
        return b;
    }

    // The stick: a zone on the left. A thumb put down anywhere in it brings the
    // stick there; while it's held, each frame sends mouse movement in
    // proportion to how far the knob is pushed
    function stick() {
        const zone = document.createElement('div');
        zone.className = 'pad-stick';
        zone.innerHTML = '<div class="pad-stick-base"><div class="pad-stick-knob"></div></div>';
        const base = zone.firstChild, knob = base.firstChild;
        let id = null, cx = 0, cy = 0, reach = 1, x = 0, y = 0, last = 0, fx = 0, fy = 0;

        function place(e) { // the base under the thumb, kept inside the zone
            const z = zone.getBoundingClientRect(), half = base.offsetWidth / 2;
            cx = Math.min(Math.max(e.clientX, z.left + half), z.right - half);
            cy = Math.min(Math.max(e.clientY, z.top + half), z.bottom - half);
            base.style.left = (cx - z.left) + 'px';
            base.style.top = (cy - z.top) + 'px';
            reach = half - knob.offsetWidth / 4;
        }
        function aim(e) {
            let dx = e.clientX - cx, dy = e.clientY - cy;
            const d = Math.hypot(dx, dy);
            if (d > reach) { dx *= reach / d; dy *= reach / d; }
            knob.style.transform = 'translate(calc(-50% + ' + dx + 'px), calc(-50% + ' + dy + 'px))';
            x = dx / reach; y = dy / reach;
        }
        function frame(t) {
            if (id === null) return;
            const dt = Math.min((t - last) / 1000, 0.1);
            last = t;
            const r = Math.hypot(x, y);
            if (r > DEAD) {
                const s = (r - DEAD) / (1 - DEAD) / r; // push past the dead zone, 0 to 1
                const ax = x * s, ay = y * s;
                fx += (down.get(K.strafe) ? ax * STRAFE : Math.sign(ax) * Math.pow(Math.abs(ax), CURVE) * TURN) * dt;
                fy += ay * FORWARD * dt;
                const sx = Math.trunc(fx), sy = Math.trunc(fy);
                fx -= sx; fy -= sy;
                const c = ci();
                if (c && (sx || sy)) c.sendMouseRelativeMotion(sx, sy);
            }
            requestAnimationFrame(frame);
        }
        function release(e) {
            if (e.pointerId !== id) return;
            id = null; x = y = 0;
            zone.classList.remove('is-held');
            base.style.left = base.style.top = knob.style.transform = '';
        }
        zone.addEventListener('pointerdown', function (e) {
            e.preventDefault();
            if (id !== null) return;
            id = e.pointerId;
            zone.setPointerCapture(id);
            zone.classList.add('is-held');
            place(e); aim(e);
            fx = fy = 0;
            last = performance.now();
            requestAnimationFrame(frame);
        });
        zone.addEventListener('pointermove', function (e) { if (e.pointerId === id) aim(e); });
        zone.addEventListener('pointerup', release);
        zone.addEventListener('pointercancel', release);
        zone.addEventListener('lostpointercapture', release);
        return zone;
    }

    function group(cls, items) {
        const g = document.createElement('div');
        g.className = cls;
        g.append.apply(g, items);
        return g;
    }

    function build() {
        const root = document.createElement('div');
        root.className = 'doom-pad is-waiting';
        root.addEventListener('contextmenu', e => e.preventDefault()); // no long-press menu

        const hint = document.createElement('div');
        hint.className = 'pad-hint';
        hint.textContent = 'tap ▶ in the game to start';

        // shareware Episode 1 has five weapon slots: fist (and chainsaw), pistol, shotgun, chaingun, rocket launcher
        const weapons = [];
        for (let n = 1; n <= 5; n++) weapons.push(button(String(n), 48 + n, 'pad-weapon'));

        root.append(
            hint,
            group('pad-sys', [button('Menu', K.menu), button('Map', K.map), button('Enter', K.enter), button('Y', K.y)]),
            group('pad-weapons', weapons),
            stick(),
            group('pad-act', [button('Strafe', K.strafe, 'pad-strafe'), button('Use', K.use, 'pad-use'),
                              button('Fire', K.fire, 'pad-fire')])
        );
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
