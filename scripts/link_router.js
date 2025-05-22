// /scripts/link_router.js

// Load the under-construction list
fetch('/under_construction.json')
  .then(res => res.json())
  .then(pages => {
    document.addEventListener('DOMContentLoaded', () => {
      document.body.addEventListener('click', (e) => {
        // Traverse upward from click target to find nearest <a>
        let anchor = e.target.closest('a');

        // If no anchor was found, or it has no href, ignore
        if (!anchor || !anchor.href) return;

        // Get the filename (e.g., CV.html)
        const url = new URL(anchor.href);
        const filename = url.pathname.split('/').pop();

        // If that filename is marked under construction...
        if (pages[filename]) {
          e.preventDefault();
          window.location.href = "/404.html"; // Or "/under_construction.html"
        }
      });
    });
  })
  .catch(err => {
    console.error("Failed to load under_construction.json:", err);
  });