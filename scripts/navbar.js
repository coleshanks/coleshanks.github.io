// navbar.js
let lastScrollTop = 0; 
const navHeight = 80; // Height of your navbar
const scrollThreshold = 100; // Number of pixels to scroll before hiding the navbar

window.addEventListener("scroll", function() {
  let currentScroll = window.pageYOffset || document.documentElement.scrollTop;

  // Check if we've scrolled past the threshold and more than the navbar height to avoid hiding it immediately
  if (currentScroll > lastScrollTop && currentScroll > scrollThreshold + navHeight) {
    // Scroll Down - hide navbar
    document.querySelector('.navbar').style.top = `-${navHeight}px`; // Hide the navbar by its height
  } else if (currentScroll < lastScrollTop || currentScroll <= scrollThreshold) {
    // Scroll Up or not past the threshold - show navbar
    document.querySelector('.navbar').style.top = '0';
  }

  // Remember the last scroll position
  lastScrollTop = currentScroll <= 0 ? 0 : currentScroll; 
}, false);
