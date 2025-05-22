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
        window.location.href = "/404.html"; // or "/under_construction.html"
      }
    }, true);
  })
  .catch(err => {
    console.error("❌ Failed to load under_construction.json:", err);
  });