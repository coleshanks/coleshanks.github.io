function fitHrToHeading() {
  document.querySelectorAll('hr.hr-fit').forEach(hr => {
    const prev = hr.previousElementSibling;
    if (!prev) return;
    prev.style.width = 'fit-content';
    const w = prev.offsetWidth;
    prev.style.width = '';
    hr.style.width = (w + 2) + 'px';
    hr.style.marginLeft = '30px';
  });
}

document.fonts.ready.then(fitHrToHeading);
window.addEventListener('resize', fitHrToHeading);
