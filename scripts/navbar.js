let lastScrollTop = 0; // Keep track of the last scroll position

window.addEventListener("scroll", function() {
  let currentScroll = window.pageYOffset || document.documentElement.scrollTop;
  
  if (currentScroll > lastScrollTop) {
    // Scroll Down
    document.querySelector('.navbar').style.top = '-80px'; // Adjust '-50px' as needed to hide the navbar
  } else {
    // Scroll Up
    document.querySelector('.navbar').style.top = '0px';
  }
  
  lastScrollTop = currentScroll <= 0 ? 0 : currentScroll; // For Mobile or negative scrolling
}, false);
