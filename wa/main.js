
const customName = document.getElementById('customname');
const randomize = document.querySelector('.randomize');
const story = document.querySelector('.story');

function randomValueFromArray(array) {
  const random = Math.floor(Math.random() * array.length);
  return array[random];
}


const storyText = `It was 94 fahrenheit outside, so :insertx: went for a walk. When they got to :inserty:, they stared in horror for a few moments, then :insertz:. Bob saw the whole thing, but was not surprised — :insertx: weighs 300 pounds, and it was a hot day.`;

const insertX = [
  'Kim Kardashian',
  'the biggest pumpkin youd ever seen',
  'Minion'
];

const insertY = [
  'Applebees',
  'a field full of corn and loneliness',
  'the moon'
];

const insertZ = [
  'exploded into a million tiny pieces',
  'disintegrated',
  'turned into an onion and became french onion soup'
];


randomize.addEventListener('click', result);

function result() {
  let newStory = storyText; 

  const xItem = randomValueFromArray(insertX);
  const yItem = randomValueFromArray(insertY);
  const zItem = randomValueFromArray(insertZ);


  newStory = newStory.replace(/:insertx:/g, xItem);
  newStory = newStory.replace(/:inserty:/g, yItem);
  newStory = newStory.replace(/:insertz:/g, zItem);


  if (customName.value !== '') {
    const name = customName.value;
    newStory = newStory.replace(/Bob/, name);
  }


  if (document.getElementById("uk").checked) {
    const weight = Math.round(300 / 14) + ' stone'; 
    const temperature = Math.round((94 - 32) * 5 / 9) + ' centigrade'; 

    newStory = newStory.replace(/300 pounds/, weight);
    newStory = newStory.replace(/94 fahrenheit/, temperature);
  }


  story.textContent = newStory;
  story.style.visibility = 'visible';
}
