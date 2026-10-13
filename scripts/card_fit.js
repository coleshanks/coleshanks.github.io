// The cards in a .card-list share one divider: every .card-name takes the width
// of the widest name in its list, so the accent bars line up down and across
// the list wherever the longest name is (Japanese on Explore). Without this
// script each name keeps its own width, from min-width in style.css.
(function () {
    function fit() {
        document.querySelectorAll('.card-list').forEach(function (list) {
            const names = [...list.querySelectorAll('.card-name')];
            if (names.length < 2) return;
            names.forEach(n => { n.style.width = ''; });
            const widest = Math.max(...names.map(n => n.getBoundingClientRect().width));
            const s = getComputedStyle(names[0]);
            const pad = parseFloat(s.paddingLeft) + parseFloat(s.paddingRight);
            names.forEach(n => { n.style.width = (widest - pad) + 'px'; n.style.flexShrink = '0'; });
        });
    }

    fit();
    document.fonts.ready.then(fit); // the names change width once JetBrains Mono loads
    window.addEventListener('resize', fit);
})();
