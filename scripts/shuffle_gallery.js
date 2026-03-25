document.addEventListener('DOMContentLoaded', () => {
    const gallery = document.querySelector('.gallery');
    if (!gallery) return;
    const items = [...gallery.children];
    for (let i = items.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        gallery.appendChild(items[j]);
        items.splice(j, 1);
    }
});
