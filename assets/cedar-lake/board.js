// The leaderboard on a page: the project page's top 10 and the full board (board.html). It reads the
// server (the game repo's server/); ?server=http://localhost:8787 on the page points it at a local
// wrangler dev. Names are put in as text, never as HTML.
const CedarBoard = (() => {
    const server = new URLSearchParams(location.search).get('server') || 'https://cedar-lake.coleshanks.workers.dev';

    async function get(path) {
        const response = await fetch(server + path);
        if (!response.ok) throw new Error(`${path}: ${response.status}`);
        return (await response.json()).runs;
    }

    // Game time as the results screen shows it: 10:32, or 1:04:09 past an hour.
    function time(seconds) {
        const whole = Math.max(0, Math.ceil(seconds));
        const h = Math.floor(whole / 3600), m = Math.floor(whole / 60) % 60, s = whole % 60;
        const two = (n) => String(n).padStart(2, '0');
        return h > 0 ? `${h}:${two(m)}:${two(s)}` : `${m}:${two(s)}`;
    }

    // The day it was finished, in Japan: 22 Oct 2026.
    function day(ms) {
        return new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Tokyo', day: 'numeric', month: 'short', year: 'numeric' }).format(ms);
    }

    // ...and to the minute, for a run's own row: 22 Oct 2026, 21:30 JST.
    function moment(ms) {
        const at = new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Tokyo', day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
        return at.format(ms) + ' JST';
    }

    // A country's flag from its two letters (JP is 🇯🇵); nothing when unknown.
    function flag(country) {
        if (!/^[A-Z]{2}$/.test(country || '')) return '';
        return String.fromCodePoint(...[...country].map((c) => 0x1f1e6 + c.charCodeAt(0) - 65));
    }

    function cell(row, text, className) {
        const td = document.createElement('td');
        td.textContent = text;
        if (className) td.className = className;
        row.appendChild(td);
        return td;
    }

    // The board's rows into a table body: rank, name, flag, time, day.
    function fill(body, runs) {
        body.replaceChildren();
        runs.forEach((run, i) => {
            const row = document.createElement('tr');
            cell(row, i + 1, 'rank');
            cell(row, run.shown, 'name');
            cell(row, flag(run.country), 'flag').title = run.country || '';
            cell(row, time(run.time), 'time');
            cell(row, day(run.finished), 'day');
            row.dataset.who = run.who;
            body.appendChild(row);
        });
    }

    return {
        top: () => get('/board'),
        all: () => get('/board?all'),
        runsOf: (who) => get('/board/runs?who=' + encodeURIComponent(who)),
        time, day, moment, flag, cell, fill,
    };
})();
