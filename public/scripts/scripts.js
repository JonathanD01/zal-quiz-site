ANSWER_CARD_START_ID_NAME = "play-card-";

ANSWER_FORMAT_ORDER = ["a)", "b)", "c)", "d)", "e)", "f)", "g)", "h)"]

// SETTINGS
SETTINGS = new Map();

SETTINGS_DEBUG_KEY = "DEBUG";
SETTINGS_SORT_QUESTIONS_KEY = "SORT_QUESTIONS";
SETTINGS_SORT_ANSWERS_KEY = "SORT_ANSWERS";
SHOW_QUESTION_NUMBER = "SHOW_QUESTION_NUMBER";
SHOW_ANSWER_OPTION = "SHOW_ANSWER_OPTION";

SETTINGS.set(SETTINGS_DEBUG_KEY, localStorage.getItem(SETTINGS_DEBUG_KEY) || false);
SETTINGS.set(SETTINGS_SORT_QUESTIONS_KEY, localStorage.getItem(SETTINGS_SORT_QUESTIONS_KEY) || false);
SETTINGS.set(SETTINGS_SORT_ANSWERS_KEY, localStorage.getItem(SETTINGS_SORT_ANSWERS_KEY) || false);
SETTINGS.set(SHOW_ANSWER_OPTION, localStorage.getItem(SHOW_ANSWER_OPTION) || false);
// END

QUIZ_DATA_INDEX_MAP = new Map();
QUIZ_DATA_INDEX_MAP.set("1", '/json/data_1.json');
//QUIZ_DATA_INDEX_MAP.set("1", '/json/data_1_small.json');
QUIZ = {};

// CAN CHANGE
ANSWERED_QUESTION_INDEXES = new Map();
CURRENT_QUESTION_INDEX = 1;
// END


document.addEventListener("DOMContentLoaded", (event) => {
	if (getBoolSettingsValue(SETTINGS_DEBUG_KEY)) {
		console.log("DOM fully loaded and parsed");
	}
	initSettingsCheckboxes();
});

function setQuizToPlay(index) {
	if (!validateQuizIndex(index)) {
		return;
	}

	loadQuiz(index);

	hideFrontpage();
	showPlaypage();
}

function validateQuizIndex(index){
	if (!QUIZ_DATA_INDEX_MAP.has(index)) {
		alert("Index: '" + index + "' does not exist!");
		return false;
	}
	return true;
}

function validateQuiz() {
	for (let i = 0; i < QUIZ.questions.length; i++){
		let correctAnswers = 0;
		for (let j = 0; j < QUIZ.questions[i].answers.length; j++) {
			if (QUIZ.questions[i].answers[j].correct){
				correctAnswers += 1;
			}

			const questionPrefix = ANSWER_FORMAT_ORDER[j];
			if (!QUIZ.questions[i].answers[j].text.startsWith(questionPrefix)) {
				console.log("Answer at question '" + QUIZ.questions[i].question + "' has wrong asnwer order!");
				console.log(j, questionPrefix, QUIZ.questions[i].answers[j].text);
			}
		}


		if (correctAnswers > 1) {
			console.log("Question '" + QUIZ.questions[i].question + "' has more than 1 correct answer!");
		} else if (correctAnswers <= 0) {
			console.log("Question '" + QUIZ.questions[i].question + "' has less or 0 correct answer!");
		}
	}
}

function loadQuiz(index){
	fetch(QUIZ_DATA_INDEX_MAP.get(index))
    .then(response => {
        if (!response.ok) {
            throw new Error('Network response was not ok ' + response.statusText);
        }
        return response.json(); // This will throw if no-cors is set.
    })
    .then(data => { setQuizData(data) })
    .then(startQuiz)
    .catch(error => { console.error('There was a problem with the fetch operation:', error)});
}

function startQuiz() {
	validateQuiz();

	shuffleQuiz();

	const date = new Date();
	
	//document.getElementById("play-title").textContent = QUIZ.title;
	//document.getElementById("quiz-start-time").textContent = date.toLocaleDateString() + " " + date.toLocaleTimeString();
	document.getElementById("current-quiz-question-index").textContent = CURRENT_QUESTION_INDEX;
	document.getElementById("quiz-questions-count").textContent = QUIZ.questions.length;


	displayQuestion();
}

function displayQuestion() {

	validateCurrentQuestionHasCorrectAnswer();

	question = getCurrentQuestion();

	setQuizQuestionText(question);

	const answeredElement = hasAnsweredQuizQuestion() ? document.getElementById(ANSWER_CARD_START_ID_NAME + ANSWERED_QUESTION_INDEXES.get(CURRENT_QUESTION_INDEX)) : null;
	let answeredCorrect = false;
	let correctAnswerElement = null;

	// Fill questions
	for (let i = 0; i < question.answers.length; i++) {
		const elementId = ANSWER_CARD_START_ID_NAME + i;
		const answerElement = document.getElementById(elementId);

		setAnswerText(question.answers[i], answerElement);
		answerElement.style.display = "inherit";

		// Handle answered logic
		if (!hasAnsweredQuizQuestion()) {
			continue;
		}

		if (question.answers[i].correct) {
			answerElement.style.borderColor = "green";
			correctAnswerElement = answerElement;
		}

		if (answeredElement && answeredElement.id === answerElement.id && question.answers[i].correct) {
			answeredCorrect = true;
		} else if (answeredElement && answeredElement.id === answerElement.id) {
			answerElement.style.borderColor = "red";
		}
	}

	// Handle feedback if a question has been answered
	if (hasAnsweredQuizQuestion()) {
		handleFeedback(answeredElement, answeredCorrect, correctAnswerElement);
	}
}


function handleAnswerClick(element, ignoreCheck = false) {
	if (hasAnsweredQuizQuestion()) {
		return;
	}

	question = getCurrentQuestion();

	const arr = element.id.split("-");
	const clickedIndex = arr[arr.length-1];

	const correctAnswerObject = getCorrectAnswer();
	const correctAnswerIndex = correctAnswerObject.index;
	const correctAnswerElement = document.getElementById(ANSWER_CARD_START_ID_NAME + correctAnswerIndex);

	const answeredCorrect = (parseInt(clickedIndex) == parseInt(correctAnswerIndex));

	handleFeedback(element, answeredCorrect, correctAnswerElement);
	setQuizQuestionAnswered(clickedIndex);
}

function hasAnsweredQuizQuestion() {
	return ANSWERED_QUESTION_INDEXES.has(CURRENT_QUESTION_INDEX);
}

function setQuizQuestionAnswered(clickedIndex) {
	ANSWERED_QUESTION_INDEXES.set(CURRENT_QUESTION_INDEX, clickedIndex);
}

function handleFeedback(clickedElement, answeredCorrect, correctAnswerElement) {
	const feedbackElement = document.getElementById("play-answer-feedback");

	if (answeredCorrect) {
		clickedElement.style.borderColor = "green";
		feedbackElement.innerHTML = "<span class='text-xl md:text-2xl text-green-600'>Riktig!</span>"
	} else {
		clickedElement.style.borderColor = "red";
		clickedElement.style.opacity = 0.8;
		feedbackElement.innerHTML = "<span class='text-xl md:text-2xl text-red-600'>Feil!</span>"
		correctAnswerElement.style.borderColor = "green";
		feedbackElement.innerHTML += "<p class='text-xl md:text-2xl'>Det riktige svaret er: '" + correctAnswerElement.textContent + 
		"'</span></p>"
	}
}

function handleNextQuestion() {
	// They need to answer before proceeding
	if (!hasAnsweredQuizQuestion() && !getBoolSettingsValue(SETTINGS_DEBUG_KEY)) {
		alert("Du må svare på spørsmålet før du fortsetter!");
		return;
	}

	if (hasCompletedAllQuestions()) {
		return;
	}


	CURRENT_QUESTION_INDEX += 1;
	

	resetUserInputs();

	displayQuestion();
}


function handlePreviousQuestion() {
	if (isOnFirstQuestion()) {
		alert("Du er allerede på det første spørsmålet!");
		return;
	}

	CURRENT_QUESTION_INDEX -= 1;

	resetUserInputs();

	displayQuestion();
}

function isOnFirstQuestion() {
	return CURRENT_QUESTION_INDEX == 1;
}

function hasCompletedAllQuestions() {
	if (CURRENT_QUESTION_INDEX >= QUIZ.questions.length) {
		alert("Du har fullført quizen");
		return true;
	}
	return false;
}

function resetUserInputs() {

	// Reset answers
	const answerCards = document.getElementById("play-cards").children;
	for (let i = 0; i < answerCards.length; i++){
		const answerCardElement = document.getElementById("play-cards").children[i];

		answerCardElement.style.opacity = 1;
		answerCardElement.style.borderColor = "transparent";
		answerCardElement.style.display = "none";
	}

	document.getElementById("play-answer-feedback").textContent = "";
	document.getElementById("current-quiz-question-index").textContent = CURRENT_QUESTION_INDEX;

}

function hideFrontpage(){
	document.getElementById("front").style.display = 'none';
}

function showFrontpage(){
	document.getElementById("front").style.display = 'inherit';
}

function hidePlaypage(){
	document.getElementById("play").style.display = 'none';
}

function showPlaypage(){
	document.getElementById("play").style.display = 'inherit';
}

function setQuizData(data) {
	QUIZ = data;
}

function getCurrentQuestion() {
	return QUIZ.questions[CURRENT_QUESTION_INDEX-1];
}

function validateCurrentQuestionHasCorrectAnswer() {
	let valid = false;
	for (let i = 0; i < getCurrentQuestion().answers.length; i++) {
		if (getCurrentQuestion().answers[i].correct) {
			valid = true;
		}
	}
	if (!valid) {
		alert("Question '" + getCurrentQuestion().question + "' does not have a correct answer!")
	}
}

// returns { "answer": getCurrentQuestion().answers[i], "index": i }
function getCorrectAnswer() {
	for (let i = 0; i < getCurrentQuestion().answers.length; i++) {
		if (getCurrentQuestion().answers[i].correct) {
			return { "answer": getCurrentQuestion().answers[i], "index": i };
		}
	}
}

function showHome() {
	resetQuiz();
	hidePlaypage();
	showFrontpage();
	initSettingsCheckboxes();
}

function resetQuiz() {
	ANSWERED_QUESTION_INDEXES = new Map();
	CURRENT_QUESTION_INDEX = 1;

	resetUserInputs();

	shuffleQuiz();

	displayQuestion();
}

function initSettingsCheckboxes() {
	document.getElementById(SETTINGS_DEBUG_KEY).checked = getBoolSettingsValue(SETTINGS_DEBUG_KEY);
	document.getElementById(SETTINGS_SORT_QUESTIONS_KEY).checked = getBoolSettingsValue(SETTINGS_SORT_QUESTIONS_KEY);
	document.getElementById(SETTINGS_SORT_ANSWERS_KEY).checked = getBoolSettingsValue(SETTINGS_SORT_ANSWERS_KEY);
	document.getElementById(SHOW_QUESTION_NUMBER).checked = getBoolSettingsValue(SHOW_QUESTION_NUMBER);
	document.getElementById(SHOW_ANSWER_OPTION).checked = getBoolSettingsValue(SHOW_ANSWER_OPTION);
}

function handleSettingsChecked(element) {
	setBoolSettingsValue(element.id);
}

function getBoolSettingsValue(key) {
    return localStorage.getItem(key) === "true";
}

function setBoolSettingsValue(key) {
	value = !(JSON.parse(localStorage.getItem(key)))
    localStorage.setItem(key, value);
}

function shuffleQuiz(){
	if (getBoolSettingsValue(SETTINGS_SORT_QUESTIONS_KEY)) {
		shuffle(QUIZ.questions);
	}

	if (getBoolSettingsValue(SETTINGS_SORT_ANSWERS_KEY)) {
		for (let i = 0; i < QUIZ.questions.length; i++){
			shuffle(QUIZ.questions[i].answers);
		}
	}
}

// Source: https://stackoverflow.com/a/2450976
function shuffle(array) {
  let currentIndex = array.length;

  // While there remain elements to shuffle...
  while (currentIndex != 0) {

    // Pick a remaining element...
    let randomIndex = Math.floor(Math.random() * currentIndex);
    currentIndex--;

    // And swap it with the current element.
    [array[currentIndex], array[randomIndex]] = [
      array[randomIndex], array[currentIndex]];
  }
}

function setQuizQuestionText(questionObject) {
	let text;
	if (getBoolSettingsValue(SHOW_QUESTION_NUMBER)) {
		text = questionObject.question;
	} else {
		const substringIndex = questionObject.question.indexOf(".") + 1;
		text = questionObject.question.substring(substringIndex);
	}
	
	document.getElementById("quiz-question").textContent = text;
}

function setAnswerText(answer, answerElement) {
	let text;
	if (getBoolSettingsValue(SHOW_ANSWER_OPTION)) {
		text = answer.text;
	} else {
		const answerElementSubStringIndex = answer.text.indexOf(")") + 2;
		text = answer.text.substring(answerElementSubStringIndex);
	}

	answerElement.textContent = text;
}