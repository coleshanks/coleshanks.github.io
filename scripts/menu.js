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
//
// A text match goes to the spot as well as the page: the words ride along in
// sessionStorage, night.js calls siteMenu.find() when the page loads, and that
// opens any <details> they're in (fetching a code block's file first), scrolls
// to them and flashes them in the accent.
(function () {
    const INDEX = '/assets/data/search-index.json';
    const CSS = '/assets/css/menu.css';
    const FONT = 'https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;700&display=swap';
    const READY_WAIT = 1500; // ms at most to wait for the styles, index and font on first open
    const MAX_PAGES = 6;     // pages and actions listed above the text matches
    const MAX_HITS = 12;     // text matches listed
    const SNIPPET = 70;      // characters of context either side of a match
    const FIND_KEY = 'menu_find'; // sessionStorage: { u, words, s, at } for the page a match goes to
    const FIND_FOR = 10000;  // ms a stored find stays good, so a stale one never fires later
    const LAYOUT_WAIT = 1200; // ms at most to wait for the page's images before scrolling
    const CODE_WAIT = 4000;  // ms at most to wait for a code block's file
    const FIND_AT = 0.25;    // where a match lands, as a share of the window's height from the top

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
    let cssReady = null;

    // --- loading ---

    function loadCss() {
        if (!cssReady) cssReady = new Promise(function (resolve) {
            const link = document.createElement('link');
            link.rel = 'stylesheet';
            link.href = CSS;
            link.onload = link.onerror = resolve;
            document.head.appendChild(link);
        });
        return cssReady;
    }

    function load() {
        if (ready) return ready;
        const css = loadCss();
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
        location.href = duck ? '/under_construction.html' : url;
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
            if (r.entry.u === here) {
                close();
                find(r.words, r.entry.s);
            } else {
                try {
                    sessionStorage.setItem(FIND_KEY, JSON.stringify({ u: r.entry.u, words: r.words, s: r.entry.s || '', at: Date.now() }));
                } catch (e) { /* private mode etc.: it still goes to the page */ }
                go(r.entry.u);
            }
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
        else if (e.key === 'ArrowRight' && input.selectionStart === input.value.length) {
            e.preventDefault(); // works like Enter, unless the cursor is mid-text, where → moves it
            run(rows[active]);
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

    // --- finding a match on the page ---

    const INLINE = /^(A|ABBR|B|CODE|EM|I|KBD|MARK|S|SAMP|SMALL|SPAN|STRONG|SUB|SUP|U)$/;

    function blockOf(el) { // the nearest ancestor that isn't inline, so words don't run across blocks
        while (el && INLINE.test(el.tagName)) el = el.parentElement;
        return el;
    }

    function shown(el) { // on screen, or only hidden by a closed <details> that find() opens
        const seen = el.checkVisibility ? el.checkVisibility() : el.getClientRects().length > 0;
        if (seen) return true;
        const d = el.closest('details:not([open])');
        if (!d) return false;
        for (let e = el; e !== d; e = e.parentElement) {
            if (getComputedStyle(e).display === 'none') return false; // hidden for its own reasons, like the playground's output
        }
        return shown(d);
    }

    // The page's text in scope, normalised like the search, with where each
    // character came from: { flat, at: [{ node, i, n }] } (n is the source length)
    function pageText(scope) {
        const walker = document.createTreeWalker(scope, NodeFilter.SHOW_TEXT, {
            acceptNode: function (node) {
                const el = node.parentElement;
                if (!el || !node.data.trim()) return NodeFilter.FILTER_REJECT;
                if (el.closest('script, style, noscript, .navbar, .profile_navbar, .site-menu, .code-loading')) return NodeFilter.FILTER_REJECT;
                return shown(el) ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT;
            },
        });
        let flat = '';
        const at = [];
        let lastBlock = null;
        for (let node = walker.nextNode(); node; node = walker.nextNode()) {
            const block = blockOf(node.parentElement);
            if (block !== lastBlock && flat) { flat += ' '; at.push(null); }
            lastBlock = block;
            let i = 0;
            for (const ch of node.data) {
                const n = norm(ch); // one entry per UTF-16 unit, like flat's indexes: 🦀 is two
                flat += n;
                for (let k = 0; k < n.length; k++) at.push({ node: node, i: i, n: ch.length });
                i += ch.length;
            }
        }
        return { flat: flat, at: at };
    }

    // The closest-together run with every word in it: [[start, end], ...], one
    // span per match, each stretched to the end of its word (dumpling → dumplings)
    function bestSpans(flat, words) {
        const hits = [];
        words.forEach(function (w, wi) {
            for (let i = flat.indexOf(w); i !== -1; i = flat.indexOf(w, i + w.length)) hits.push({ s: i, e: i + w.length, w: wi });
        });
        if (!hits.length) return [];
        hits.sort((a, b) => a.s - b.s);
        const need = new Set(words.map((w, i) => i)).size;
        const count = new Map();
        let best = null;
        for (let lo = 0, hi = 0; hi < hits.length; hi++) {
            count.set(hits[hi].w, (count.get(hits[hi].w) || 0) + 1);
            while (count.size === need) {
                const span = hits[hi].e - hits[lo].s;
                if (!best || span < best.span) best = { span: span, lo: lo, hi: hi };
                const w = hits[lo].w;
                if (count.get(w) === 1) count.delete(w); else count.set(w, count.get(w) - 1);
                lo++;
            }
        }
        if (!best) return [];
        const out = [];
        hits.slice(best.lo, best.hi + 1).forEach(function (h) {
            let e = h.e;
            while (/[a-z0-9]/.test(flat[e] || '')) e++;
            const last = out[out.length - 1];
            // overlapping, or only spaces between: one span, so a phrase flashes as one
            if (last && (h.s < last[1] || /^ +$/.test(flat.slice(last[1], h.s)))) last[1] = Math.max(last[1], e);
            else out.push([h.s, e]);
        });
        return out;
    }

    // Wraps the spans in <mark class="site-find">, a piece per text node, last
    // first so splitting a node doesn't move the pieces still to come
    function wrap(spans, at) {
        const pieces = [];
        spans.forEach(function ([s, e]) {
            for (let i = s; i < e; i++) {
                const a = at[i];
                if (!a) continue;
                const last = pieces[pieces.length - 1];
                if (last && last.node === a.node && last.end >= a.i) last.end = Math.max(last.end, a.i + a.n);
                else pieces.push({ node: a.node, start: a.i, end: a.i + a.n });
            }
        });
        const marks = [];
        pieces.reverse().forEach(function (p) {
            const range = document.createRange();
            range.setStart(p.node, p.start);
            range.setEnd(p.node, p.end);
            const mark = document.createElement('mark');
            mark.className = 'site-find';
            range.surroundContents(mark);
            marks.unshift(mark);
        });
        return marks;
    }

    function unwrap(marks) {
        marks.forEach(function (mark) {
            const parent = mark.parentNode;
            if (!parent) return;
            while (mark.firstChild) parent.insertBefore(mark.firstChild, mark);
            parent.removeChild(mark);
            parent.normalize();
        });
    }

    function codeLoaded(block) { // resolves once a code block's file is in, or after CODE_WAIT
        return new Promise(function (resolve) {
            const t0 = Date.now();
            (function check() {
                if (!block.querySelector('.code-loading') || Date.now() - t0 > CODE_WAIT) resolve();
                else setTimeout(check, 50);
            })();
        });
    }

    // Scrolls el to FIND_AT down the window. The browser stops at the page's
    // ends, so on a short page it stays where it is
    function scrollToMatch(el) {
        const still = matchMedia('(prefers-reduced-motion: reduce)').matches;
        const top = el.getBoundingClientRect().top + scrollY - innerHeight * FIND_AT;
        window.scrollTo({ top: Math.max(0, top), behavior: still ? 'auto' : 'smooth' });
    }

    function afterScroll() { // resolves when a smooth scroll settles, or at once if nothing scrolled
        return new Promise(function (resolve) {
            let done = false;
            const finish = function () { if (!done) { done = true; resolve(); } };
            const y = scrollY;
            if ('onscrollend' in window) window.addEventListener('scrollend', finish, { once: true });
            setTimeout(finish, 'onscrollend' in window ? 1000 : 500);
            setTimeout(function () { if (scrollY === y) finish(); }, 100); // already in view
        });
    }

    // Shows where words are on this page: opens the code block with src (or any
    // closed <details> they're in), scrolls to them and flashes them
    function find(words, src) {
        if (!words || !words.length) return;
        const css = loadCss();
        const block = src ? [...document.querySelectorAll('details[data-src]')].find(d => d.dataset.src === src) : null;
        let opened = Promise.resolve();
        if (block) {
            block.open = true; // its toggle handler fetches the file
            opened = codeLoaded(block);
        }
        Promise.all([css, opened]).then(function () {
            let text = block ? pageText(block) : null;
            let spans = text ? bestSpans(text.flat, words) : [];
            if (!spans.length) {
                text = pageText(document.body);
                spans = bestSpans(text.flat, words);
            }
            if (!spans.length) { glowImage(words); return; }
            const marks = wrap(spans, text.at);
            marks.forEach(function (m) {
                for (let d = m.closest('details:not([open])'); d; d = d.parentElement.closest('details:not([open])')) d.open = true;
            });
            scrollToMatch(marks[0]);
            afterScroll().then(function () {
                marks.forEach(m => m.classList.add('is-on'));
                marks[0].addEventListener('animationend', function () { unwrap(marks); }, { once: true });
            });
        });
    }

    // When the words are only in an image's alt text (the home page's Thailand
    // motorbike), the image glows instead. An emoji match finds nothing, and
    // the page is enough
    function glowImage(words) {
        const img = [...document.querySelectorAll('img[alt]')]
            .find(el => words.every(w => norm(el.alt).includes(w)) && shown(el));
        if (!img) return;
        scrollToMatch(img);
        afterScroll().then(function () {
            img.classList.add('site-find-img');
            img.addEventListener('animationend', function () { img.classList.remove('site-find-img'); }, { once: true });
        });
    }

    // The find a text match left for this page, if it's fresh; night.js calls
    // this on load when one is waiting. Waits for the page's images (at most
    // LAYOUT_WAIT), so the spot doesn't move after the scroll
    function findStored() {
        let job = null;
        try {
            job = JSON.parse(sessionStorage.getItem(FIND_KEY) || 'null');
            sessionStorage.removeItem(FIND_KEY);
        } catch (e) { /* private mode etc. */ }
        if (!job || job.u !== here || !(Date.now() - job.at < FIND_FOR)) return;
        const loaded = document.readyState === 'complete' ? Promise.resolve()
            : new Promise(resolve => window.addEventListener('load', resolve, { once: true }));
        Promise.race([loaded, new Promise(resolve => setTimeout(resolve, LAYOUT_WAIT))])
            .then(function () { find(job.words, job.s); });
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
        find: find,
        findStored: findStored,
    };
})();
