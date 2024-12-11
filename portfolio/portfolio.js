document.addEventListener('DOMContentLoaded', () => {
    const aboutMeSection = document.getElementById("about-me");
    const portfolioSection = document.getElementById("portfolio");
    const contactSection = document.getElementById("contact");

    window.addEventListener('scroll', () => {
        const scrollY = window.scrollY;

        // Reveal About Me section when scrolled past the landing page
        if (scrollY > document.getElementById("landing").offsetHeight) {
            aboutMeSection.classList.add('visible');
        }

        // Reveal Portfolio section when scrolled further
        if (scrollY > aboutMeSection.offsetHeight + aboutMeSection.offsetTop) {
            portfolioSection.classList.add('visible');
        }

        // Reveal Contact section when scrolled further
        if (scrollY > portfolioSection.offsetHeight + portfolioSection.offsetTop) {
            contactSection.classList.add('visible');
        }
    });
});

let lastScrollTop = 0; // Keeps track of the last scroll position

window.addEventListener('scroll', function() {
    let navbar = document.getElementById("navbar");
    let currentScroll = window.pageYOffset || document.documentElement.scrollTop;

    // If we are scrolling down, hide the navbar
    if (currentScroll > lastScrollTop) {
        navbar.classList.add('hide');
    } else {
        // If we are scrolling up, show the navbar
        navbar.classList.remove('hide');
    }

    // Update the last scroll position to the current one
    lastScrollTop = currentScroll <= 0 ? 0 : currentScroll;
});

// Smooth scrolling
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        e.preventDefault();

        document.querySelector(this.getAttribute('href')).scrollIntoView({
            behavior: 'smooth'
        });
    });
});
