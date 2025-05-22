// /scripts/link_router.js

console.log("✅ link_router.js loaded");

fetch('/under_construction.json')
  .then(res => res.json())
  .then(pages => {
    console.log("✅ Config loaded:", pages);

    document.addEventListener('DOMContentLoaded', () => {
      // Use capture to catch events early
      document.addEventListener('click', (e) => {
        let anchor = e.target.closest('a');
        if (!anchor || !anchor.href) return;

        const url = new URL(anchor.href);
        const filename = url.pathname.split('/').pop();

        console.log("🔗 Full href:", anchor.href);
        console.log("🧭 Extracted filename:", filename);

        const filenameLower = filename.toLowerCase();
        const isUnderConstruction = Object.keys(pages).some(key => {
          return key.toLowerCase() === filenameLower && pages[key] === true;
        });

        if (isUnderConstruction) {
          console.log("🚧 Under construction — redirecting to /404.html");
          e.preventDefault();
          window.location.href = "/404.html";
        }
      }, true); // 👈 Early phase
    });
  })
  .catch(err => {
    console.error("❌ Failed to load under_construction.json:", err);
  });