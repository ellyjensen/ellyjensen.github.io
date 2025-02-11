// Wait for DOM to be fully loaded
document.addEventListener('DOMContentLoaded', () => {
    loadProjects();
    setupFilterListeners();
});

async function loadProjects() {
    try {
        const response = await fetch('projects.json');
        const data = await response.json();
        displayProjects(data.projects);
    } catch (error) {
        console.error('Error loading projects:', error);
    }
}

function displayProjects(projects) {
    const projectsList = document.getElementById('projects-list');
    projectsList.innerHTML = ''; // Clear existing projects

    projects.forEach(project => {
        const projectElement = createProjectElement(project);
        projectsList.appendChild(projectElement);
    });

    // Initialize Masonry layout
    initializeMasonry();
}

function createProjectElement(project) {
    const projectItem = document.createElement('div');
    projectItem.className = 'project-item';
    projectItem.dataset.categories = project.category.join(',');

    projectItem.innerHTML = `
        <img src="${project.mainimg}" alt="${project.name}" loading="lazy">
        <div class="description">
            <h3>${project.name}</h3>
            <p>${project.abstract}</p>
        </div>
    `;

    return projectItem;
}

function setupFilterListeners() {
    const dropdownItems = document.querySelectorAll('.dropdown-item');
    
    dropdownItems.forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            const category = e.target.getAttribute('value');
            filterProjects(category);
        });
    });
}

function filterProjects(category) {
    const projects = document.querySelectorAll('.project-item');
    
    projects.forEach(project => {
        const categories = project.dataset.categories.split(',');
        const shouldShow = category === 'all' || categories.includes(category);
        
        project.style.display = shouldShow ? 'block' : 'none';
    });

    // Reinitialize Masonry after filtering
    initializeMasonry();
}

function initializeMasonry() {
    const grid = document.querySelector('.project-grid');
    imagesLoaded(grid, () => {
        new Masonry(grid, {
            itemSelector: '.project-item',
            columnWidth: '.project-item',
            percentPosition: true,
            gutter: 32
        });
    });
}