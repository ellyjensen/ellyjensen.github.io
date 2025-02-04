let proj;
fetch('https://raw.githubusercontent.com/ellyjensen/ellyjensen.github.io/main/portfolio/projects.json')
    .then(response => response.json())
    .then(projects => {
        proj = projects;
        parseData(projects);
    })
    .catch(err => {
        console.log(`error ${err}`);
    });

function parseData(data) {
    const projectsList = document.getElementById("projects-list");

    data.projects.forEach((project, i) => {
        const projectItem = document.createElement("div");
        projectItem.classList.add("project-item");
        projectItem.innerHTML = `
            <img src="${project.mainimg}" alt="${project.name}" class="project-image">
            <div class="description">
                <h3>${project.name}</h3>
                <p>${project.abstract}</p>
            </div>
        `;
        projectItem.dataset.category = project.category.join(", ");
        projectsList.appendChild(projectItem);
    });

    // Initialize Masonry after items are added
    imagesLoaded(projectsList, () => {
        new Masonry('#projects-list', {
            itemSelector: '.project-item',
            columnWidth: '.project-item',
            percentPosition: true,
            gutter: 30, // Adjust gap between items
        });
    });
}

// Sorting Projects
for (const button of document.querySelectorAll("#buttons button")) {
    button.addEventListener("click", e => {
        sortProjects(e.target.value);
    });
}

function sortProjects(button) {
    const allProjects = document.querySelectorAll(".project-item");

    if (button === "clear") {
        allProjects.forEach(project => {
            project.style.display = "block";
        });
    } else {
        allProjects.forEach(project => {
            if (project.dataset.category.includes(button)) {
                project.style.display = "block";
            } else {
                project.style.display = "none";
            }
        });
    }
}
