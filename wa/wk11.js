// Image filenames and corresponding alt texts
const imageFilenames = ['pic1.jpg', 'pic2.jpg', 'pic3.jpg', 'pic4.jpg', 'pic5.jpg'];
const altText = {
  'pic1.jpg': 'Closeup of a blue human eye',
  'pic2.jpg': 'Closeup of a red flower',
  'pic3.jpg': 'Closeup of a green leaf',
  'pic4.jpg': 'Closeup of a sunset over the ocean',
  'pic5.jpg': 'Closeup of a snowy mountain landscape'
};

// Reference to the thumb bar
const thumbBar = document.querySelector('.thumb-bar');

// Loop to add images to the thumb bar
imageFilenames.forEach(filename => {
  const newImage = document.createElement('img');
  newImage.setAttribute('src', 'images/' + filename);
  newImage.setAttribute('alt', altText[filename]);
  thumbBar.appendChild(newImage);

  // Add click event listener to update the displayed image
  newImage.addEventListener('click', () => {
    const displayedImage = document.querySelector('.displayed-img');
    displayedImage.setAttribute('src', 'images/' + filename);
    displayedImage.setAttribute('alt', altText[filename]);
  });
});

// Reference to the darken/lighten button
const btn = document.querySelector('button');
const overlay = document.querySelector('.overlay');

// Add event listener for darken/lighten button
btn.addEventListener('click', () => {
  const currentClass = btn.getAttribute('class');
  
  if (currentClass === 'dark') {
    btn.setAttribute('class', 'light');
    btn.textContent = 'Lighten';
    overlay.style.backgroundColor = 'rgb(0 0 0 / 50%)'; // Darken effect
  } else {
    btn.setAttribute('class', 'dark');
    btn.textContent = 'Darken';
    overlay.style.backgroundColor = 'rgb(0 0 0 / 0%)'; // Lighten effect
  }
});

// Set the first image on page load
const displayedImage = document.querySelector('.displayed-img');
displayedImage.setAttribute('src', 'images/' + imageFilenames[0]);
displayedImage.setAttribute('alt', altText[imageFilenames[0]]);
