// navbar.js
let lastScrollTop = 0;
const navHeight = 80; // Height of your navbar
const scrollThreshold = 120; // Number of pixels to scroll before hiding the navbar

window.addEventListener("scroll", function() {
  let currentScroll = window.scrollY; // Updated to use window.scrollY

  if (currentScroll > lastScrollTop && currentScroll > scrollThreshold + navHeight) {
    // Scroll Down - hide navbar
    document.querySelector('.navbar').style.top = `-${navHeight}px`; // Hide the navbar by its height
  } else if (currentScroll < lastScrollTop || currentScroll <= scrollThreshold) {
    // Scroll Up or within threshold - show navbar
    document.querySelector('.navbar').style.top = '0';
  }

  lastScrollTop = currentScroll; // Update lastScrollTop to the current scroll position
}, false);
