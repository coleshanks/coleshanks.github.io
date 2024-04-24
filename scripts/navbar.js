// navbar.js
let lastScrollTop = 0;
const scrollThreshold = 100; // Number of pixels to scroll before hiding the navbar
const visibleNavbarHeight = 10; // The amount of navbar height that will remain visible

window.addEventListener("scroll", function() {
  let currentScroll = window.scrollY;
  let navbar = document.querySelector('.navbar');
  let navbarHeight = navbar.offsetHeight; // Dynamically gets the navbar's height
  let hiddenNavbarHeight = navbarHeight - visibleNavbarHeight; // Calculate the height to hide

  if (currentScroll > lastScrollTop && currentScroll > scrollThreshold) {
    // Scroll Down - hide navbar, but leave a small portion visible
    navbar.style.top = `-${hiddenNavbarHeight}px`; // Hide part of the navbar based on its dynamic height
  } else if (currentScroll < lastScrollTop || currentScroll <= scrollThreshold) {
    // Scroll Up or within threshold - show navbar
    navbar.style.top = '0';
  }

  lastScrollTop = currentScroll;
}, false);
