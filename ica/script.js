
const colorBox = document.getElementById('colorBox');
colorBox.addEventListener('click', () => {
    colorBox.style.backgroundColor = colorBox.style.backgroundColor === 'lightblue' ? 'lightcoral' : 'lightblue';
});

const textButton = document.getElementById('textButton');
textButton.addEventListener('click', () => {
    textButton.textContent = textButton.textContent === 'Click me to change the text!' ? 'Text changed!' : 'Click me to change the text!';
});
