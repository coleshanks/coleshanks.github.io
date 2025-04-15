console.log("JavaScript code is running...");
let lastScrollTop = 0;
const scrollThreshold = 200; // Number of pixels to scroll before the navbar starts to escape
const escapeSpeed = 0.5; // Speed at which the navbar escapes (adjust as needed)
let visibleNavbarHeight = document.querySelector('.navbar').offsetHeight;

window.addEventListener("scroll", function() {
  let currentScroll = window.scrollY;
  let navbar = document.querySelector('.navbar');
  
  if (currentScroll > lastScrollTop && currentScroll > scrollThreshold) {
    // Scroll Down - gradually move navbar up to escape
    let distanceToEscape = (currentScroll - scrollThreshold) / escapeSpeed;
    navbar.style.top = `-${distanceToEscape}px`; // Move the navbar up to escape
  } else if (currentScroll < lastScrollTop || currentScroll <= scrollThreshold) {
    // Scroll Up or within threshold - show navbar
    navbar.style.top = '0';
  }

  lastScrollTop = currentScroll;
}, false);