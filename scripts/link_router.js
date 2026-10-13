// /scripts/link_router.js

console.log("✅ link_router.js loaded");

fetch('/under_construction.json')
  .then(res => res.json())
  .then(pages => {
    console.log("✅ Config loaded:", pages);

    document.addEventListener('click', (e) => {
      const anchor = e.target.closest('a');
      if (!anchor || !anchor.href) return;

      const url = new URL(anchor.href);
      const filename = url.pathname.split('/').pop();

      const filenameLower = filename.toLowerCase();
      const isUnderConstruction = Object.keys(pages).some(key =>
        key.toLowerCase() === filenameLower && pages[key] === true
      );

      if (isUnderConstruction) {
        e.preventDefault();
        window.location.href = "/under_construction.html";
      }
    }, true);
  })
  .catch(err => {
    console.error("❌ Failed to load under_construction.json:", err);
  });

// Below Cole's code: a page under construction blocks itself and everything in
// its folder (projects.html blocks projects/rust.html too), however the visitor
// gets there: a link, the / menu, or a typed URL. The keys in
// under_construction.json are site paths ("/projects.html": true). On load, a
// blocked page goes straight to the duck page; a click on a link to one goes
// there instead of loading it. menu.js asks window.isUnderConstruction() before
// it navigates.
(function () {
  const DUCK = '/under_construction.html';

  function blocked(pages, path) {
    path = decodeURI(path).toLowerCase();
    if (path.endsWith('/')) path += 'index.html';
    else if (!path.endsWith('.html')) path += '.html'; // GitHub Pages serves /cv.html at /cv too
    return Object.keys(pages).some(function (key) {
      const k = key.toLowerCase();
      return pages[key] === true && (path === k || path.startsWith(k.replace(/\.html$/, '/')));
    });
  }

  fetch('/under_construction.json')
    .then(res => res.json())
    .then(function (pages) {
      window.isUnderConstruction = path => blocked(pages, path);
      if (location.pathname !== DUCK && blocked(pages, location.pathname)) {
        location.replace(DUCK); // replace, so Back doesn't return to the blocked page
        return;
      }
      document.addEventListener('click', function (e) {
        const a = e.target.closest('a');
        if (!a || !a.href) return;
        const url = new URL(a.href);
        if (url.origin === location.origin && blocked(pages, url.pathname)) {
          e.preventDefault();
          location.href = DUCK;
        }
      }, true);
    })
    .catch(function () { /* no list: every page stays open */ });
})();
