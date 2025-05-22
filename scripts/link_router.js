// /scripts/link_router.js

console.log("✅ link_router.js loaded");

// Fetch the under-construction list
fetch('/under_construction.json')
  .then(res => res.json())
  .then(pages => {
    console.log("✅ Config loaded:", pages);

    // Capture click events as early as possible
    document.addEventListener('click', (e) => {
      // Traverse up to the nearest <a>
      let anchor = e.target.closest('a');
      if (!anchor || !anchor.href) return;

      const url = new URL(anchor.href);
      const filename = url.pathname.split('/').pop();

      console.log("🔗 Full href:", anchor.href);
      console.log("🧭 Extracted filename:", filename);

      // Case-insensitive match against JSON keys
      const filenameLower = filename.toLowerCase();
      const isUnderConstruction = Object.keys(pages).some(key =>
        key.toLowerCase() === filenameLower && pages[key] === true
      );

      if (isUnderConstruction) {
        console.log("🚧 Under construction — redirecting to /404.html");
        e.preventDefault(); // Block the browser from navigating
        window.location.href = "/404.html"; // Or use "/under_construction.html"
      }
    }, true); // Use capture phase for early interception
  })
  .catch(err => {
    console.error("❌ Failed to load under_construction.json:", err);
  });