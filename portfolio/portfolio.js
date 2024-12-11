let lastScrollTop = 0;
const navbar = document.getElementById('navbar');

window.addEventListener('scroll', function() {
    let currentScroll = window.pageYOffset || document.documentElement.scrollTop;
    
    if (currentScroll > lastScrollTop) {
        // Scrolling down: hide the navbar
        navbar.classList.remove('visible');
    } else {
        // Scrolling up: show the navbar
        navbar.classList.add('visible');
    }

    lastScrollTop = currentScroll <= 0 ? 0 : currentScroll;
});

//carousel//

let currentSlide = 0;
const slides = document.querySelectorAll('.carousel-slide');
const totalSlides = slides.length;

function nextSlide() {
    currentSlide = (currentSlide + 1) % totalSlides;
    updateCarousel();
}

function updateCarousel() {
    const offset = -currentSlide * 100;
    document.querySelector('.carousel').style.transform = `translateX(${offset}%)`;
}

setInterval(nextSlide, 3000); // Change slide every 3 seconds
