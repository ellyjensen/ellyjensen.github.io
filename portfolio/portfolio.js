let currentIndex = 0;
const slides = document.querySelectorAll('.carousel-slide');
const totalSlides = slides.length;

// Function to go to the next slide
function nextSlide() {
    currentIndex = (currentIndex + 1) % totalSlides; // Loop back to the first slide
    updateCarousel();
}

// Function to go to the previous slide
function prevSlide() {
    currentIndex = (currentIndex - 1 + totalSlides) % totalSlides; // Loop to the last slide
    updateCarousel();
}

// Function to update the transform of the carousel
function updateCarousel() {
    const newTransform = -currentIndex * 100; // Move the carousel by 100% of each slide width
    document.querySelector('.carousel').style.transform = `translateX(${newTransform}%)`;
}

// Attach event listeners for the next and previous buttons
document.querySelector('.next-btn').addEventListener('click', nextSlide);
document.querySelector('.prev-btn').addEventListener('click', prevSlide);



