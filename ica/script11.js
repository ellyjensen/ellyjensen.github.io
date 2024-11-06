
function showFortune() {
    const fortunes = [
        "You will be a fish salesman in Seattle, and married to Joe with 14 kids.",
        "You will be a bull rider in Spain, and married to Donald with 0 children.",
        "You will be a miserable stock broker in New York, and married and divroced from Kim Kardashian, she took everything including your kids."
    ];

    const randomIndex = Math.floor(Math.random() * fortunes.length);
    const fortune = fortunes[randomIndex];

    document.getElementById("fortune-output").innerHTML = `<p>${fortune}</p>`;
}



function showDogAge() {
    const puppyAge = document.getElementById("puppy-age").value;
    calculateDogAge(puppyAge);
}

function calculateDogAge(puppyAge) {
    const dogAge = puppyAge * 7;
    const result = `Your doggie is ${dogAge} years old in dog years!`;
    document.getElementById("dog-age-output").innerHTML = `<p>${result}</p>`;
}


function showReversedNumber() {
    const number = document.getElementById("number-to-reverse").value;
    reverseNumber(number);
}

function reverseNumber(number) {
    const reversed = number.toString().split('').reverse().join('');
    document.getElementById("reverse-number-output").innerHTML = `<p>Reversed Number: ${reversed}</p>`;
}


function showAlphabeticalOrder() {
    const str = document.getElementById("string-to-alphabetize").value;
    alphabetOrder(str);
}

function alphabetOrder(str) {
    const sortedStr = str.split('').sort().join('');
    document.getElementById("alphabetical-order-output").innerHTML = `<p>Alphabetical Order: ${sortedStr}</p>`;
}


function showCapitalizedWords() {
    const sentence = document.getElementById("string-to-capitalize").value;
    capitalizeWords(sentence);
}

function capitalizeWords(sentence) {
    const capitalized = sentence.split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
    document.getElementById("capitalize-output").innerHTML = `<p>Capitalized: ${capitalized}</p>`;
}
