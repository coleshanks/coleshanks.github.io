// The / menu: press / (or Cmd/Ctrl+K) on any night-mode page for a small menu
// over the page, after the one on omarchy.org (our own code). night.js fetches
// this file the first time it's opened.
//
// It opens on a "Go…" field: ↑/↓ move the highlight, Enter or → runs an item or
// opens its submenu, ← or Backspace (with the field empty) goes back up, and Esc
// clears the field, then goes back up, then closes. Typing filters the pages and
// actions, and also searches the site's text, from assets/data/search-index.json
// (built by hand with scripts/build-search-index.py), the way Omarchy's does.
// The Go to lists come from the same file. Colours follow the page's --accent,
// day or night; the styles are in assets/css/menu.css.
(function () {
    const INDEX = '/assets/data/search-index.json';
    const CSS = '/assets/css/menu.css';
    const FONT = 'https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;700&display=swap';
    const READY_WAIT = 1500; // ms at most to wait for the styles, index and font on first open
    const MAX_PAGES = 6;     // pages and actions listed above the text matches
    const MAX_HITS = 12;     // text matches listed
    const SNIPPET = 70;      // characters of context either side of a match

    const root = document.documentElement;
    const here = decodeURI(location.pathname === '/' ? '/index.html' : location.pathname);
    let index = null;          // { tree, entries } once loaded
    let underConstruction = {};
    let box, input, list, live, prompt, crumb; // the DOM, built on first open
    let stack = [];            // open submenus, innermost last: { title, nodes }
    let rows = [];             // what's listed: see row()
    let active = 0;
    let lastFocus = null;
    let ready = null;

    // --- loading ---

    function load() {
        if (ready) return ready;
        const css = new Promise(function (resolve) {
            const link = document.createElement('link');
            link.rel = 'stylesheet';
            link.href = CSS;
            link.onload = link.onerror = resolve;
            document.head.appendChild(link);
        });
        if (!document.querySelector('link[href*="family=JetBrains+Mono"]')) {
            const link = document.createElement('link');
            link.rel = 'stylesheet';
            link.href = FONT;
            document.head.appendChild(link);
        }
        const font = document.fonts ? document.fonts.load('13px "JetBrains Mono"').catch(function () {}) : null;
        const data = fetch(INDEX).then(r => r.json()).then(function (d) { index = d; }).catch(function () {});
        // the same list link_router.js uses: those pages go to the duck page
        const uc = fetch('/under_construction.json').then(r => r.json())
            .then(function (d) { underConstruction = d; }).catch(function () {});
        const wait = new Promise(resolve => setTimeout(resolve, READY_WAIT));
        ready = Promise.race([Promise.all([css, font, data, uc]), wait]);
        return ready;
    }

    // --- items ---

    // A row is one of:
    //   { kind: 'page', node, label, hint }     a page; opens a submenu if it has children
    //   { kind: 'open', node, label }           the hub itself, first in its submenu
    //   { kind: 'action', action, label }       one of actions()
    //   { kind: 'hit', entry, words }           a text match
    //   { kind: 'empty', label }                nothing matched; can't be highlighted

    function fallbackTree() { // if the index didn't load: the navbar
        return [...document.querySelectorAll('.navbar a, .profile_navbar a')]
            .map(a => ({ t: a.textContent.trim(), u: decodeURI(new URL(a.href).pathname) }));
    }

    function tree() {
        return (index && index.tree) || fallbackTree();
    }

    // What the keys do here, in the order the menu lists them. Each only shows
    // where it works: Samus and the sprite on the home page, Samus in light mode
    // (not on narrow screens), a flyby at night once the CV launch has unlocked it
    function actions() {
        const night = root.classList.contains('night');
        let unlocked = false;
        try { unlocked = localStorage.getItem('flyby_unlocked') === '1'; } catch (e) { /* private mode etc. */ }
        const list = [{ label: night ? 'Day mode' : 'Night mode', icon: night ? 'fa-sun' : 'fa-moon', key: 'N', run: window.nightToggle }];
        if (night && unlocked && window.flybySend) list.push({ label: 'Send a flyby', icon: 'fa-satellite', key: 'F', run: window.flybySend });
        if (!night && window.samusRun) list.push({ label: 'Send Samus', icon: 'fa-running', key: 'S', run: window.samusRun });
        if (window.nextSprite) list.push({ label: 'Next sprite', icon: 'fa-random', key: 'C', run: window.nextSprite });
        return list.filter(a => a.run);
    }

    function pageRow(node, hint) {
        return { kind: 'page', node: node, label: node.t, hint: hint };
    }

    function menuRows() {
        const level = stack[stack.length - 1];
        if (level) {
            return [{ kind: 'open', node: level.node, label: 'Open ' + level.node.t }]
                .concat(level.node.k.map(n => pageRow(n)));
        }
        return tree().map(n => pageRow(n)).concat(actions().map(a => ({ kind: 'action', action: a, label: a.label })));
    }

    // --- search ---

    function norm(s) {
        return (s || '').normalize('NFKC').toLowerCase();
    }

    function queryWords() {
        return norm(input.value).split(/\s+/).filter(Boolean)
            .map(w => (w.length > 3 && w.endsWith('s') && !w.endsWith('ss')) ? w.slice(0, -1) : w); // dumplings → dumpling
    }

    function flatten(nodes, path, out) { // every page in the tree, with where it sits
        nodes.forEach(function (n) {
            out.push({ node: n, crumb: path.join(' › ') });
            if (n.k) flatten(n.k, path.concat(n.t), out);
        });
        return out;
    }

    function searchRows(words) {
        const found = [];
        const listed = new Map(); // url -> title of the pages listed, so their text match isn't listed again
        flatten(tree(), [], []).forEach(function (p) {
            if (found.length < MAX_PAGES && words.every(w => norm(p.node.t).includes(w))) {
                found.push(pageRow(p.node, p.crumb));
                listed.set(p.node.u, p.node.t);
            }
        });
        actions().forEach(function (a) {
            if (found.length < MAX_PAGES && words.every(w => norm(a.label).includes(w))) {
                found.push({ kind: 'action', action: a, label: a.label });
            }
        });

        const hits = [];
        ((index && index.entries) || []).forEach(function (e, i) {
            const t = norm(e.t), h = norm(e.h), c = norm(e.c), x = norm(e.x), k = norm(e.k);
            let score = 0;
            for (const w of words) {
                if (t.includes(w)) score += t.startsWith(w) ? 15 : 10;
                else if (h.includes(w)) score += 4;
                else if (c.includes(w)) score += 2;
                else if (x.includes(w) || k.includes(w)) score += 1;
                else return; // every word has to be there somewhere
            }
            hits.push({ e: e, score: score, i: i });
        });
        hits.sort((a, b) => b.score - a.score || a.i - b.i);
        const hitRows = hits.filter(h => listed.get(h.e.u) !== h.e.t)
            .slice(0, MAX_HITS).map(h => ({ kind: 'hit', entry: h.e, words: words }));

        const out = found.concat(hitRows);
        return out.length ? out : [{ kind: 'empty', label: index ? 'No matches' : 'No matches (search not loaded)' }];
    }

    function escapeHtml(s) {
        return s.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
    }

    // Marks every match of words in text, escaped for innerHTML
    function marked(text, words) {
        const lower = norm(text);
        const spans = [];
        words.forEach(function (w) {
            for (let i = lower.indexOf(w); i !== -1 && w; i = lower.indexOf(w, i + w.length)) {
                let end = i + w.length;
                while (/[a-z0-9]/i.test(text[end] || '')) end++; // to the end of the word: dumpling → dumplings
                spans.push([i, end]);
            }
        });
        spans.sort((a, b) => a[0] - b[0]);
        let out = '', at = 0;
        spans.forEach(function ([s, e]) {
            if (s < at) return; // overlaps the last one
            out += escapeHtml(text.slice(at, s)) + '<mark>' + escapeHtml(text.slice(s, e)) + '</mark>';
            at = e;
        });
        return out + escapeHtml(text.slice(at));
    }

    // About SNIPPET characters either side of the first match in the text.
    // NFKC can change lengths, so this only trusts positions when it doesn't
    function snippet(text, words) {
        const lower = norm(text);
        const exact = lower.length === text.length;
        let at = -1;
        if (exact) {
            for (const w of words) {
                const i = lower.indexOf(w);
                if (i !== -1 && (at === -1 || i < at)) at = i;
            }
        }
        if (at === -1) at = 0;
        const start = Math.max(0, at - SNIPPET);
        const end = Math.min(text.length, at + SNIPPET);
        return (start > 0 ? '…' : '') + marked(text.slice(start, end), exact ? words : []) + (end < text.length ? '…' : '');
    }

    // --- drawing ---

    function build() {
        box = document.createElement('div');
        box.className = 'site-menu';
        box.hidden = true;
        box.innerHTML =
            '<div class="site-menu-box" role="dialog" aria-modal="true" aria-label="Site menu">' +
                '<div class="site-menu-prompt">' +
                    '<button class="site-menu-back" type="button" aria-label="Back" tabindex="-1"><i class="fas fa-arrow-left"></i></button>' +
                    '<span class="site-menu-crumb"></span>' +
                    '<input class="site-menu-input" type="text" autocomplete="off" spellcheck="false" ' +
                        'role="combobox" aria-expanded="true" aria-controls="site-menu-list" aria-autocomplete="list" placeholder="Go…">' +
                '</div>' +
                '<div class="site-menu-list" id="site-menu-list" role="listbox"></div>' +
                '<div class="site-menu-live" aria-live="polite"></div>' +
            '</div>';
        document.body.appendChild(box);
        input = box.querySelector('.site-menu-input');
        list = box.querySelector('.site-menu-list');
        live = box.querySelector('.site-menu-live');
        prompt = box.querySelector('.site-menu-prompt');
        crumb = box.querySelector('.site-menu-crumb');

        box.addEventListener('mousedown', function (e) {
            if (e.target === box) close(); // the blurred page around the box
            else if (e.target !== input) e.preventDefault(); // keep the field focused
        });
        box.querySelector('.site-menu-back').addEventListener('click', back);
        input.addEventListener('input', function () { active = 0; render(); });
        input.addEventListener('keydown', onKey);
        list.addEventListener('mousemove', function (e) {
            const el = e.target.closest('.site-menu-row');
            if (el && !el.classList.contains('is-empty')) highlight(Number(el.dataset.i), false);
        });
        list.addEventListener('click', function (e) {
            const el = e.target.closest('.site-menu-row');
            if (el) run(rows[Number(el.dataset.i)]);
        });
    }

    function render() {
        const words = queryWords();
        rows = words.length ? searchRows(words) : menuRows();
        const level = stack[stack.length - 1];
        prompt.classList.toggle('in-submenu', !!level && !words.length);
        crumb.textContent = level && !words.length ? level.node.t : '';
        input.placeholder = level ? '' : 'Go…';
        list.innerHTML = rows.map(rowHtml).join('');
        if (active >= rows.length) active = rows.length - 1;
        highlight(Math.max(0, active), true);
        const count = rows.filter(r => r.kind !== 'empty').length;
        live.textContent = words.length ? count + (count === 1 ? ' result' : ' results') : '';
    }

    function rowHtml(r, i) {
        const attrs = `class="site-menu-row${r.kind === 'hit' ? ' is-hit' : ''}${r.kind === 'empty' ? ' is-empty' : ''}" ` +
            `id="site-menu-row-${i}" data-i="${i}" role="option" aria-selected="false"`;
        if (r.kind === 'empty') return `<div ${attrs} aria-disabled="true"><span class="site-menu-label">${escapeHtml(r.label)}</span></div>`;
        if (r.kind === 'hit') {
            const e = r.entry;
            return `<div ${attrs}>` +
                `<div class="site-menu-hit-head"><span class="site-menu-label">${marked(e.t, r.words)}</span>` +
                (e.c ? `<span class="site-menu-hint">${escapeHtml(e.c)}</span>` : '') + '</div>' +
                (e.x ? `<div class="site-menu-snippet">${snippet(e.x, r.words)}</div>` : '') +
                '</div>';
        }
        let icon, right = '';
        if (r.kind === 'action') {
            icon = r.action.icon;
            right = `<kbd class="site-menu-key">${r.action.key}</kbd>`;
        } else {
            const kids = r.kind === 'page' && r.node.k;
            icon = r.node.u === '/index.html' ? 'fa-home' : kids ? 'fa-folder' : 'fa-file-alt';
            if (r.kind === 'page' && r.hint) right = `<span class="site-menu-hint">${escapeHtml(r.hint)}</span>`;
            else if (r.node.u === here) right = '<span class="site-menu-hint">here</span>';
            if (kids) right += '<i class="fas fa-chevron-right site-menu-more"></i>';
        }
        return `<div ${attrs}><i class="fas ${icon} site-menu-icon"></i>` +
            `<span class="site-menu-label">${escapeHtml(r.label)}</span>${right}</div>`;
    }

    function highlight(i, scroll) {
        if (!rows[i] || rows[i].kind === 'empty') {
            input.removeAttribute('aria-activedescendant');
            return;
        }
        active = i;
        list.querySelectorAll('.site-menu-row').forEach(function (el) {
            const on = Number(el.dataset.i) === i;
            el.classList.toggle('is-active', on);
            el.setAttribute('aria-selected', on ? 'true' : 'false');
            if (on && scroll) el.scrollIntoView({ block: 'nearest' });
        });
        input.setAttribute('aria-activedescendant', 'site-menu-row-' + i);
    }

    // --- doing things ---

    function go(url) {
        const file = url.split('/').pop().toLowerCase();
        const duck = Object.keys(underConstruction).some(k => k.toLowerCase() === file && underConstruction[k] === true);
        close();
        location.href = duck ? '/pages/under_construction.html' : url;
    }

    function enter(node) {
        stack.push({ node: node });
        input.value = '';
        active = 0;
        render();
    }

    function back() {
        if (!stack.length) return;
        const left = stack.pop();
        input.value = '';
        render();
        const i = rows.findIndex(r => r.node === left.node); // land on the submenu just left
        if (i !== -1) highlight(i, true);
    }

    function run(r) {
        if (!r || r.kind === 'empty') return;
        if (r.kind === 'action') {
            close();
            r.action.run();
        } else if (r.kind === 'hit') {
            go(r.entry.u);
        } else if (r.kind === 'page' && r.node.k) {
            enter(r.node);
        } else {
            go(r.node.u);
        }
    }

    function move(by) {
        let i = active;
        do { i += by; } while (rows[i] && rows[i].kind === 'empty');
        if (rows[i]) highlight(i, true); // stops at the ends
    }

    function onKey(e) {
        const empty = input.value === '';
        if (e.key === 'ArrowDown') { e.preventDefault(); move(1); }
        else if (e.key === 'ArrowUp') { e.preventDefault(); move(-1); }
        else if (e.key === 'Enter') { e.preventDefault(); run(rows[active]); }
        else if (e.key === 'ArrowRight' && empty) {
            const r = rows[active];
            if (r && r.kind === 'page' && r.node.k) { e.preventDefault(); enter(r.node); }
        } else if ((e.key === 'ArrowLeft' || e.key === 'Backspace') && empty && stack.length) {
            e.preventDefault();
            back();
        } else if (e.key === 'Escape') {
            e.preventDefault();
            if (!empty) { input.value = ''; active = 0; render(); }
            else if (stack.length) back();
            else close();
        } else if (e.key === 'Tab') {
            e.preventDefault(); // focus stays in the field
        }
    }

    // --- open and close ---

    function open() {
        if (!box) build();
        lastFocus = document.activeElement;
        stack = [];
        input.value = '';
        active = 0;
        render();
        box.hidden = false;
        input.focus();
    }

    function close() {
        if (!box || box.hidden) return;
        box.hidden = true;
        if (lastFocus && lastFocus.focus && lastFocus !== document.body) lastFocus.focus({ preventScroll: true });
    }

    let opening = false;
    window.siteMenu = {
        toggle: function () {
            if (box && !box.hidden) { close(); return; }
            if (opening) return;
            opening = true;
            load().then(function () {
                opening = false;
                open();
            });
        },
        close: close,
    };
})();
