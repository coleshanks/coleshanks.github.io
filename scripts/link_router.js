// /scripts/link_router.js

// Load the under-construction list
fetch('/under_construction.json') // 👈 uses underscore, not dash
  .then(res => res.json())
  .then(pages => {
    document.addEventListener('DOMContentLoaded', () => {
      document.body.addEventListener('click', (e) => {
        if (e.target.tagName === 'A' && e.target.href) {
          const url = new URL(e.target.href);
          const filename = url.pathname.split('/').pop();
          if (pages[filename]) {
            e.preventDefault(); // Stop default nav
            window.location.href = "/404.html"; // Or swap for a custom under construction page
          }
        }
      });
    });
  })
  .catch(err => {
    console.error("Failed to load under_construction.json:", err);
  });