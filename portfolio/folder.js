const folder = document.getElementById('folder');
const loadingScreen = document.getElementById('loading-screen');

folder.addEventListener('click', () => {
    folder.classList.add('open-folder'); // Add animation to folder
    loadingScreen.style.visibility = 'visible'; // Show loading screen
    setTimeout(() => {
        // Redirect to main project page
        window.location.href = "portfolio.html";
    }, 2000); // Wait 2 seconds for loading screen to appear before redirect
});


