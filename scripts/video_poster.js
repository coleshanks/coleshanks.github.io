document.addEventListener('DOMContentLoaded', function () {
    if (window.innerWidth <= 400) {
        var video = document.querySelector('.media-table video');
        if (video) {
            video.setAttribute('poster', '/assets/images/my pics/propbot-thumb.jpg');
        }
    }
});
