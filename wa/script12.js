
const button = document.getElementById('newComicBtn');
const title = document.getElementById('comicTitle');
const image = document.getElementById('comicImage');
const date = document.getElementById('comicDate');


async function fetchComic() {

    const randomComicNumber = Math.floor(Math.random() * 3000) + 1;
    const url = `https://corsproxy.io/?https://xkcd.com/${randomComicNumber}/info.0.json`;
    
    try {
        const response = await fetch(url);

        if (!response.ok) {
            throw new Error(`Comic not found. Status: ${response.status}`);
        }
        
        const data = await response.json();
        
        title.textContent = data.title;
        image.src = data.img;
        image.alt = data.alt;
        date.textContent = `Published on: ${data.month}/${data.day}/${data.year}`;
    } catch (error) {
        console.error('Error fetching the comic:', error);
        title.textContent = 'Error loading comic';
        image.src = '';
        image.alt = 'Error loading comic';
        date.textContent = '';
    }
}
button.addEventListener('click', fetchComic);
