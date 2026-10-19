// The HUD's drawing on the web: draw.h's calls (src/web/draw_web.cpp) on a 2D canvas laid over the
// 3D one. Text is laid out the way Cocoa lays it out on the Mac (the same line heights, spacing and
// wrapping), so boxes come out the same size; only the letters' widths differ with the font.
//
// The effect icons are from Lucide (https://lucide.dev), ISC License:
// Copyright (c) for portions of Lucide are held by Cole Bemis 2013-2022 as part of Feather (MIT). All
// other copyright (c) for Lucide are held by Lucide Contributors 2022. Permission to use, copy, modify,
// and/or distribute this software for any purpose with or without fee is hereby granted, provided that
// the above copyright notice and this permission notice appear in all copies.
'use strict';

window.CedarHUD = (() => {
    const ROUNDED = '"Cedar Rounded", "Cedar Symbols", "Hiragino Maru Gothic ProN", "Yu Gothic UI", system-ui, sans-serif';
    // Cocoa's metrics for each face (ascender and default line height, as a share of the size), and
    // its paragraphs' line spacing: draw.h's FACE_ROUNDED, FACE_ROUNDED_BOLD, FACE_SANS, FACE_SERIF, FACE_MONO.
    const FACES = [
        {family: ROUNDED, weight: 500, ascent: .9668, line: 1.18, spacing: 6},
        {family: ROUNDED, weight: 700, ascent: .9668, line: 1.18, spacing: 6},
        {family: '"Avenir Next", Avenir, "Segoe UI", system-ui, sans-serif', weight: 500, ascent: 1, line: 1.37, spacing: 4},
        {family: 'Baskerville, "Baskerville Old Face", Georgia, serif', weight: 400, ascent: .8979, line: 1.15, spacing: 4},
        {family: 'ui-monospace, "SF Mono", Menlo, Consolas, monospace', weight: 400, ascent: .9668, line: 1.18, spacing: 0},
    ];

    let canvas = null;
    let screen = null;     // the HUD canvas's context
    let ctx = null;        // where drawing goes: the screen, or a picture being drawn into
    let scale = 1;         // the current scale, for shadows (which a canvas doesn't scale)
    const scales = [];
    const pictures = [];
    const targets = [];

    // ---------------------------------------------------------------------------------------------
    // Text
    // ---------------------------------------------------------------------------------------------

    // Rich text from C++: per span "\x01face,size,r,g,b,a,centred\x02text".
    const parsed = new Map();
    function parse(encoded) {
        let spans = parsed.get(encoded);
        if (spans) return spans;
        spans = [];
        for (const part of encoded.split('\x01')) {
            if (!part) continue;
            const split = part.indexOf('\x02');
            const f = part.slice(0, split).split(',');
            const face = FACES[+f[0]];
            const size = +f[1];
            spans.push({
                text: part.slice(split + 1),
                face, size,
                font: `${face.weight} ${size}px ${face.family}`,
                color: `rgba(${Math.round(f[2] * 255)},${Math.round(f[3] * 255)},${Math.round(f[4] * 255)},${f[5]})`,
                centred: f[6] === '1',
                ascent: face.ascent * size,
                lineHeight: Math.round(face.line * size),
            });
        }
        if (parsed.size > 4000) parsed.clear();
        parsed.set(encoded, spans);
        return spans;
    }

    const widths = new Map();
    let measuringFont = '';
    function width(font, text) {
        const key = font + '\x00' + text;
        let w = widths.get(key);
        if (w !== undefined) return w;
        if (measuringFont !== font) {
            screen.font = font;
            measuringFont = font;
        }
        w = screen.measureText(text).width;
        if (widths.size > 20000) widths.clear();
        widths.set(key, w);
        return w;
    }

    // Kana, kanji and full-width forms break anywhere, like Cocoa's line breaking for Japanese.
    const cjk = c => /[　-ヿ㐀-鿿＀-￯]/.test(c);

    // Words: runs of pieces (a piece is part of one span) that wrap together. A word ends after its
    // spaces, at a new line, and around each Japanese character.
    function words(spans) {
        const out = [];
        let word = null;
        const finish = () => {
            if (word) out.push(word);
            word = null;
        };
        const add = (span, c) => {
            if (!word) word = {pieces: [], newline: false, trailing: false};
            const last = word.pieces[word.pieces.length - 1];
            if (last && last.span === span) {
                last.text += c;
            } else {
                word.pieces.push({span, text: c});
            }
        };
        for (const span of spans) {
            for (const c of span.text) {
                if (c === '\n') {
                    if (!word) add(span, '');
                    word.newline = true;
                    finish();
                } else if (cjk(c)) {
                    finish();
                    add(span, c);
                    finish();
                } else if (c === ' ') {
                    add(span, c);
                    word.trailing = true;
                } else {
                    if (word && word.trailing) finish();
                    add(span, c);
                }
            }
        }
        finish();
        for (const w of out) {
            w.width = 0;
            w.inked = 0;  // without trailing spaces
            for (const p of w.pieces) {
                p.width = width(p.span.font, p.text);
                w.width += p.width;
            }
            const last = w.pieces[w.pieces.length - 1];
            const trimmed = last.text.replace(/ +$/, '');
            w.inked = w.width - last.width + (trimmed === last.text ? last.width : width(last.span.font, trimmed));
        }
        return out;
    }

    // A word too wide for a line on its own is broken between letters.
    function splitWord(w, room) {
        const parts = [];
        let current = {pieces: [], width: 0};
        for (const p of w.pieces) {
            for (const c of p.text) {
                const cw = width(p.span.font, c);
                if (current.width + cw > room && current.width > 0) {
                    parts.push(current);
                    current = {pieces: [], width: 0};
                }
                const last = current.pieces[current.pieces.length - 1];
                if (last && last.span === p.span) {
                    last.text += c;
                    last.width += cw;
                } else {
                    current.pieces.push({span: p.span, text: c, width: cw});
                }
                current.width += cw;
            }
        }
        parts.push(current);
        return parts.map((part, i) => ({pieces: part.pieces, width: part.width, inked: part.width, newline: i === parts.length - 1 && w.newline}));
    }

    const layouts = new Map();
    function layout(encoded, wrap) {
        const key = wrap + '\x00' + encoded;
        let result = layouts.get(key);
        if (result) return result;
        const spans = parse(encoded);
        const lines = [];
        let line = {pieces: [], width: 0, inked: 0};
        const finishLine = () => {
            lines.push(line);
            line = {pieces: [], width: 0, inked: 0};
        };
        for (const w of words(spans)) {
            const fits = line.pieces.length === 0 || wrap <= 0 || line.width + w.inked <= wrap + .01;
            if (!fits) finishLine();
            const parts = wrap > 0 && w.inked > wrap && line.pieces.length === 0 ? splitWord(w, wrap) : [w];
            parts.forEach((part, i) => {
                if (i > 0) finishLine();
                let x = line.width;
                for (const p of part.pieces) {
                    line.pieces.push({span: p.span, text: p.text, x, width: p.width});
                    x += p.width;
                }
                line.inked = line.width + part.inked;
                line.width += part.width;
                if (part.newline) finishLine();
            });
        }
        if (line.pieces.length > 0 || lines.length === 0) finishLine();
        // Each line as tall as its tallest type; the paragraph's spacing between lines.
        const first = spans[0];
        const spacing = first && first.centred ? 0 : first ? first.face.spacing : 0;
        let y = 0;
        let widest = 0;
        for (const l of lines) {
            const used = l.pieces.length ? l.pieces : [{span: first}];
            l.height = Math.max(...used.map(p => p.span ? p.span.lineHeight : 0));
            l.ascent = Math.max(...used.map(p => p.span ? p.span.ascent : 0));
            l.top = y;
            y += l.height + spacing;
            widest = Math.max(widest, l.inked);
        }
        result = {lines, width: widest, height: Math.max(0, y - spacing), centred: !!(first && first.centred)};
        if (layouts.size > 4000) layouts.clear();
        layouts.set(key, result);
        return result;
    }

    function drawLines(l, x, y, w, h) {
        for (let i = 0; i < l.lines.length; i++) {
            const line = l.lines[i];
            if (i > 0 && line.top + line.height > h + .5) break;  // a line that doesn't fit is left out
            const shift = l.centred ? (w - line.inked) / 2 : 0;
            for (const p of line.pieces) {
                if (!p.text) continue;
                ctx.font = p.span.font;
                ctx.fillStyle = p.span.color;
                ctx.fillText(p.text, x + shift + p.x, y + line.top + line.ascent);
            }
        }
    }

    // ---------------------------------------------------------------------------------------------
    // Shapes
    // ---------------------------------------------------------------------------------------------

    function path(heap, at, count) {
        const p = new Path2D();
        for (let i = 0; i < count; i++) {
            const s = at + i * 6;
            const op = heap[s], a = heap[s + 1], b = heap[s + 2], c = heap[s + 3], d = heap[s + 4], e = heap[s + 5];
            if (op === 0) p.moveTo(a, b);
            else if (op === 1) p.lineTo(a, b);
            else if (op === 2) p.closePath();
            else if (op === 3) {
                p.moveTo(a + c, b + d / 2);
                p.ellipse(a + c / 2, b + d / 2, Math.abs(c / 2), Math.abs(d / 2), 0, 0, Math.PI * 2);
                p.closePath();
            } else if (op === 4) p.rect(a, b, c, d);
            else if (op === 5) {
                const r = Math.max(0, Math.min(e, c / 2, d / 2));
                p.moveTo(a + r, b);
                p.arcTo(a + c, b, a + c, b + d, r);
                p.arcTo(a + c, b + d, a, b + d, r);
                p.arcTo(a, b + d, a, b, r);
                p.arcTo(a, b, a + c, b, r);
                p.closePath();
            }
        }
        return p;
    }

    const css = (r, g, b, a) => `rgba(${Math.round(r * 255)},${Math.round(g * 255)},${Math.round(b * 255)},${a})`;

    // The effect cards' icons (Lucide, 24 x 24, drawn as strokes).
    const ICONS = {
        hare: ['M13 16a3 3 0 0 1 2.24 5', 'M18 12h.01', 'M18 21h-8a4 4 0 0 1-4-4 7 7 0 0 1 7-7h.2L9.6 6.4a1 1 0 1 1 2.8-2.8L15.8 7h.2c3.3 0 6 2.7 6 6v1a2 2 0 0 1-2 2h-1a3 3 0 0 0-3 3',
               'M20 8.54V4a2 2 0 1 0-4 0v3', 'M7.612 12.524a3 3 0 1 0-1.6 4.3'],
        cloud: ['M17.5 19H9a7 7 0 1 1 6.71-9h1.79a4.5 4.5 0 1 1 0 9Z'],
        umbrella: ['M22 12a10.06 10.06 1 0 0-20 0Z', 'M12 12v8a2 2 0 0 0 4 0', 'M12 2v1'],
        thermometer: ['M2 12h10', 'M9 4v16', 'm3 9 3 3-3 3', 'M12 6 9 9 6 6', 'm6 18 3-3 1.5 1.5', 'M20 4v10.54a4 4 0 1 1-4 0V4a2 2 0 0 1 4 0Z'],
        token: ['M22 12a10 10 0 1 1-20 0a10 10 0 1 1 20 0Z', 'M13 12a1 1 0 1 1-2 0a1 1 0 1 1 2 0Z'],
    };
    const iconPaths = {};
    for (const name in ICONS) iconPaths[name] = ICONS[name].map(d => new Path2D(d));

    return {
        // The frame starts: clear, and scale from the HUD's points to the canvas's pixels.
        begin(element, pixelsPerPoint) {
            if (canvas !== element) {
                canvas = element;
                screen = canvas.getContext('2d');
                measuringFont = '';
            }
            ctx = screen;
            ctx.setTransform(1, 0, 0, 1, 0, 0);
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.setTransform(pixelsPerPoint, 0, 0, pixelsPerPoint, 0, 0);
            ctx.textBaseline = 'alphabetic';
            ctx.shadowColor = 'rgba(0,0,0,0)';
            scale = pixelsPerPoint;
            scales.length = 0;
        },
        fill(heap, at, count, r, g, b, a, evenOdd) {
            ctx.fillStyle = css(r, g, b, a);
            ctx.fill(path(heap, at, count), evenOdd ? 'evenodd' : 'nonzero');
        },
        stroke(heap, at, count, r, g, b, a, lineWidth, dashOn, dashOff, round) {
            ctx.strokeStyle = css(r, g, b, a);
            ctx.lineWidth = lineWidth;
            ctx.setLineDash(dashOn > 0 ? [dashOn, dashOff] : []);
            ctx.lineCap = round ? 'round' : 'butt';
            ctx.lineJoin = round ? 'round' : 'miter';
            ctx.stroke(path(heap, at, count));
        },
        // NSGradient's angle: 0 runs left to right; 90 runs up the view, which in the HUD's flipped
        // coordinates is top to bottom.
        gradient(x, y, w, h, r1, g1, b1, a1, r2, g2, b2, a2, angle) {
            const along = angle === 90 ? ctx.createLinearGradient(x, y, x, y + h) : ctx.createLinearGradient(x, y, x + w, y);
            along.addColorStop(0, css(r1, g1, b1, a1));
            along.addColorStop(1, css(r2, g2, b2, a2));
            ctx.fillStyle = along;
            ctx.fillRect(x, y, w, h);
        },
        save() {
            ctx.save();
            scales.push(scale);
        },
        restore() {
            ctx.restore();
            if (scales.length) scale = scales.pop();
        },
        scale(s) {
            ctx.scale(s, s);
            scale *= s;
        },
        clip(heap, at, count) { ctx.clip(path(heap, at, count)); },
        shadow(r, g, b, a, blur) {
            ctx.shadowColor = css(r, g, b, a);
            ctx.shadowBlur = blur * scale;
            ctx.shadowOffsetX = 0;
            ctx.shadowOffsetY = 0;
        },
        text(encoded, x, y, w, h) { drawLines(layout(encoded, w), x, y, w, h); },
        textAt(encoded, x, y) { drawLines(layout(encoded, 0), x, y, 0, 1e9); },
        measure(encoded, wrap) {
            const l = layout(encoded, wrap);
            return [l.width, l.height];
        },
        image(rgba, w, h, replace) {
            const picture = document.createElement('canvas');
            picture.width = w;
            picture.height = h;
            const c = picture.getContext('2d');
            c.putImageData(new ImageData(new Uint8ClampedArray(rgba), w, h), 0, 0);
            if (replace >= 0 && replace < pictures.length) {
                pictures[replace] = picture;
                return replace;
            }
            pictures.push(picture);
            return pictures.length - 1;
        },
        drawImage(id, x, y, w, h) {
            if (pictures[id]) ctx.drawImage(pictures[id], x, y, w, h);
        },
        // Drawing into a picture, in its own pixels with y growing upward (like a Cocoa bitmap).
        beginImage(id) {
            const picture = pictures[id];
            targets.push({ctx, scale});
            ctx = picture.getContext('2d');
            ctx.save();
            ctx.setTransform(1, 0, 0, -1, 0, picture.height);
            scale = 1;
        },
        endImage() {
            ctx.restore();
            const was = targets.pop();
            ctx = was.ctx;
            scale = was.scale;
        },
        icon(name, r, g, b, a, x, y, w, h) {
            const paths = iconPaths[name];
            if (!paths) return false;
            const size = w * .62;
            ctx.save();
            ctx.translate(x + w / 2, y + h / 2);
            ctx.scale(size / 24, size / 24);
            ctx.translate(-12, -12);
            ctx.lineWidth = 2.2;
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';
            ctx.setLineDash([]);
            ctx.fillStyle = css(r, g, b, a * .3);
            ctx.strokeStyle = css(r, g, b, a);
            for (const p of paths) {
                ctx.fill(p);
                ctx.stroke(p);
            }
            ctx.restore();
            return true;
        },
    };
})();
