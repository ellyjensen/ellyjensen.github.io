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


// main page js//

let proj;
fetch('projects.json')
    .then(response => response.json())
    .then(projects => {
        proj = projects;
        parseData(projects);
    })
    .catch(err => {
        console.error('Error fetching project data:', err);
    });

function parseData(data) {
    const projectsList = document.getElementById("projects-list");
    data.projects.forEach((project, index) => {
        projectsList.innerHTML += `
            <a href="/projects/${project.subdomain}.html">
                <div class="project" id="${project.subdomain}">
                    <img src="images/${project.mainimg}" alt="${project.name}">
                    <div class="description">
                        <h2>${project.name}</h2>
                        <p class="subtitle">${project.subtitle}</p>
                        <p>${project.abstract}</p>
                    </div>
                </div>
            </a>
        `;
    });
}



for(b of document.querySelectorAll("#buttons button")){
    b.addEventListener("click", e=>{
        console.log(e.target.value);
        sortProjects(e.target.value);
    })
}

function sortProjects(button){
    if(button == "clear"){
        for(let i=0; i<proj.projects.length; i++){
            document.getElementById(proj.projects[i].subdomain).style.display = "flex";
        }
    }else if(button != undefined){
        for(let i=0; i<proj.projects.length;i++){
            if(proj.projects[i].category.includes(button) == true){
                document.getElementById(proj.projects[i].subdomain).style.display = "flex";
            }else{
                document.getElementById(proj.projects[i].subdomain).style.display = "none";
            }
        }
    }else{
        console.log("error, button value is undefined");
    }

}


let subdomain = window.location.href.slice(window.location.href.lastIndexOf("/")+1, window.location.href.lastIndexOf("."));
console.log(subdomain);

fetch('projects.json')
    .then(response =>{
        return response.json();
    }).then(projects => {
        //console.log(projects);
        proj = projects;
        findProjectInJSON(projects);
        // parseData(projects);
    }).catch(err =>{
        console.log(`error ${err}`);
    })

function findProjectInJSON(projects){
    for(let i=0; i<projects.projects.length; i++){
        if(projects.projects[i].subdomain == subdomain){
            buildPage(projects.projects[i]);
            break;
        }else{
            continue;
        }
    }
}

function buildPage(project){
    console.log(project);
    document.getElementById("project").innerHTML += `<h1>${project.name}</h1>`;
}
