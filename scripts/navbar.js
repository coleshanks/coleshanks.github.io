console.log("JavaScript code is running...");
let lastScrollTop = 0;
const scrollThreshold = 200; // Number of pixels to scroll before the navbar starts to escape
const escapeSpeed = 0.5; // Speed at which the navbar escapes (adjust as needed)
const navbarEl = document.querySelector('.navbar');
let visibleNavbarHeight = navbarEl ? navbarEl.offsetHeight : 0;

window.addEventListener("scroll", function() {
  let currentScroll = window.scrollY;
  let navbar = document.querySelector('.navbar');
  if (!navbar) return;

  if (currentScroll > lastScrollTop && currentScroll > scrollThreshold) {
    let distanceToEscape = (currentScroll - scrollThreshold) / escapeSpeed;
    navbar.style.top = `-${distanceToEscape}px`;
  } else if (currentScroll < lastScrollTop || currentScroll <= scrollThreshold) {
    navbar.style.top = '0';
  }

  lastScrollTop = currentScroll;
}, false);

