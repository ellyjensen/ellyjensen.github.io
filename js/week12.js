const apiEndpoint = "https://v2.jokeapi.dev/joke/Any?blacklistFlags=nsfw,religious,political,racist,sexist,explicit&type=singleLinks to an external site."; 

async function getJoke() {
    console.log("Button clicked, fetching a joke...");
    try {
        const response = await fetch(apiEndpoint); 
        if (!response.ok) throw new Error("Network response was not ok");

        const data = await response.json(); 

        let jokeText;
        if (data.type === "single") {
            jokeText = data.joke;
        } else {
            jokeText = `${data.setup} - ${data.delivery}`;
        }

        console.log("Fetched joke:", jokeText);
        displayRes(jokeText);
    } catch (error) {
        console.error("Fetch error:", error);
        alert("Failed to fetch a joke. Please try again.");
    }
}

function displayRes(text) {
    const factDisplay = document.getElementById("factDisplay");
    factDisplay.textContent = text;
}

document.getElementById("getFactButton").addEventListener("click", getJoke);

getJoke();
