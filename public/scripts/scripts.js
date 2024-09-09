ANSWER_CARD_START_ID_NAME = "answer-card-";

ANSWER_FORMAT_ORDER = ["a)", "b)", "c)", "d)", "e)", "f)", "g)", "h)"]

// SETTINGS
SETTINGS = new Map();

SETTINGS_DARK_MODE_KEY = "DARK_MODE";
SETTINGS_KEYBOARD_MODE_KEY = "KEYBOARD_MODE"
SETTINGS_DEBUG_KEY = "DEBUG";
SETTINGS_RANDOMIZE_QUESTIONS_KEY = "RANDOMIZE_QUESTIONS";
SETTINGS_RANDOMIZE_ANSWERS_KEY = "RANDOMIZE_ANSWERS";
SHOW_QUESTION_NUMBER_KEY = "SHOW_QUESTION_NUMBER";
SHOW_ANSWER_OPTION_KEY = "SHOW_ANSWER_OPTION";

SETTINGS_LIST = [SETTINGS_DARK_MODE_KEY, SETTINGS_KEYBOARD_MODE_KEY, SETTINGS_DEBUG_KEY,
	SETTINGS_RANDOMIZE_QUESTIONS_KEY, SETTINGS_RANDOMIZE_ANSWERS_KEY, SHOW_QUESTION_NUMBER_KEY, 
	SHOW_ANSWER_OPTION_KEY]

SETTINGS_LIST.forEach(setting => SETTINGS.set(setting, localStorage.getItem(setting) || false));
// END

// QUIZ DATA
QUIZ_DATA_MAP = new Map();
QUIZ_DATA_MAP.set(1, '/data/data_1.json');
QUIZ_DATA_MAP.set(2, '/data/data_2.json');
//QUIZ_DATA_MAP.set(3, '/data/data_1_small.json');

QUIZ_META_INFO = {};
CURRENT_QUIZ = {};
CURRENT_PLAY_DATA = {};
ANSWERED_QUESTION_INDEXES = new Map();
CURRENT_QUESTION_NUMBER = 1;
// END OF QUIZ DATA

// KEY CODE
DIGIT_1_KEY_CODE = 49;
// END

document.addEventListener("DOMContentLoaded", (event) => {
    if (getSettingsValue(SETTINGS_DEBUG_KEY)) {
        showDebugDiv();
        console.log("DOM fully loaded and parsed");
    }

    if (getSettingsValue(SETTINGS_DARK_MODE_KEY)
    	|| window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
    	setSettingsValue(SETTINGS_DARK_MODE_KEY, true);
        document.documentElement.classList.add('dark');
    }

    setValuesForSettingCheckboxes();

    fetchQuizMetaInfo();

    initKeyDownListener();

    initAnalytics();

    reloadIfHiddenFor(60);
});

function setQuizToPlay(index) {
    if (isQuizIndexNotValid(index)) {
        debugMessage("Invalid quiz index");
        return;
    }

    hideFrontpage();
    showPlaypage();

    startQuiz(index);
}

function isQuizIndexNotValid(index) {
    if (!QUIZ_DATA_MAP.has(index)) {
        alert("Index: '" + index + "' does not exist!");
        return true;
    }
    return false;
}

function validateQuiz() {
    for (let i = 0; i < CURRENT_QUIZ.questions.length; i++) {
        let correctAnswers = 0;
        for (let j = 0; j < CURRENT_QUIZ.questions[i].answers.length; j++) {
            if (CURRENT_QUIZ.questions[i].answers[j].correct) {
                correctAnswers += 1;
            }

            const questionPrefix = ANSWER_FORMAT_ORDER[j];
            if (!CURRENT_QUIZ.questions[i].answers[j].text.startsWith(questionPrefix)) {
                alert("Answer at question '" + CURRENT_QUIZ.questions[i].question + "' has wrong answer order!");
            }
        }


        if (correctAnswers > 1) {
            alert("Question '" + CURRENT_QUIZ.questions[i].question + "' has more than 1 correct answer!");
        } else if (correctAnswers <= 0) {
            alert("Question '" + CURRENT_QUIZ.questions[i].question + "' has less or 0 correct answer!");
        }
    }
}

function fetchQuizMetaInfo() {
    const fetchPromises = [];

    for (let [key, value] of QUIZ_DATA_MAP.entries()) {
        const fetchPromise = fetch(value)
            .then(response => {
                if (!response.ok) {
                    throw new Error('Network response was not ok ' + response.statusText);
                }
                return response.json();
            })
            .then(data => {
                setQuizMetaInfoForKey(key, data);
            })
            .catch(error => {
                console.error('There was a problem with the fetch operation:', error);
            });

        fetchPromises.push(fetchPromise);
    }

    // Wait until all fetch requests are done
    Promise.all(fetchPromises)
        .then(() => {
            insertQuizCardsForHomepage();
        })
        .catch(error => {
            console.error('There was a problem processing all quizzes:', error);
        });
}

function fetchQuizData(index) {
    return fetch(QUIZ_DATA_MAP.get(index))
        .then(response => {
            if (!response.ok) {
                throw new Error('Network response was not ok ' + response.statusText);
            }
            return response.json();
        })
        .then(data => {
            setQuiz(data);
            resetPlayData();
        })
        .catch(error => {
            console.error('There was a problem with the fetch operation:', error);
        });
}

function insertQuizCardsForHomepage() {
    const quizCardsElement = document.getElementById("quiz-cards");

    let newQuizCardHtmlContent = "";

    for (let [key, value] of Object.entries(QUIZ_META_INFO)) {
        newQuizCardHtmlContent += `
            <div id="playable-quiz-card-${key}" class="bg-slate-200/25 dark:bg-neutral-800 rounded-xl p-6 shadow-xl shadow-black/5 ring-1 ring-indigo-700/10 flex flex-col gap-y-2" tabindex="0" aria-label="Start quiz ${value.title}">
                <h2 class="w-fit cursor-pointer text-slate-900 dark:text-slate-100 text-xl font-semibold">
                    <span class="hover:underline" onclick="setQuizToPlay(${key})">${value.title}</span>
                </h2>
                <div class="flex flex-col gap-y-2">
                    <span><a class="hover:underline text-blue-600 dark:text-blue-400" href="${value.document_url}" aria-label="Download document for ${value.title}" download>Last ned dokumentet</a></span>
                    <span class="text-gray-500 block">Antall spørsmål: ${value.length}</span>
                </div>
                <div class="w-min">
                    <button class="flex flex-row items-center gap-x-2 bg-neutral-950 hover:bg-neutral-950/40 py-2 px-4 font-bold text-white align-middle" onclick="setQuizToPlay(${key})" aria-label="Start quiz ${value.title}">
                        <span>Spill</span>
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="size-6">
                          <path stroke-linecap="round" stroke-linejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
                        </svg>
                    </button>
                </div>
            </div>
        `;
    }

    quizCardsElement.innerHTML = newQuizCardHtmlContent;

    setQuizCountText();
}

function startQuiz(index) {
    fetchQuizData(index)
        .then(() => {
            validateQuiz();

            shuffleQuiz();

            setQuizTitle();
            setQuizQuestionsCount();

            showCurrentQuestion();

            setMetaTitle(`Quizer | ${CURRENT_QUIZ.title}`)
        })
        .catch(error => {
            console.error('Error starting the quiz:', error);
        });

}

function showCurrentQuestion() {
    question = getCurrentQuestion();

    setQuizQuestionText(question);
    updateCurrentQuestionIndexText();

    const answeredElement = hasAnsweredQuestion() ? document.getElementById(getAnswerCardElementId(ANSWERED_QUESTION_INDEXES.get(CURRENT_QUESTION_NUMBER))) : null;
    let answeredCorrect = false;
    let correctAnswerElement = null;

    // Fill questions
    for (let i = 0; i < question.answers.length; i++) {
        const elementId = getAnswerCardElementId(i);
        const answerElement = document.getElementById(elementId);

        setAnswerText(question.answers[i], answerElement, i);

        answerElement.style.display = "inherit";

        // Handle answered logic
        if (!hasAnsweredQuestion()) {
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
    if (hasAnsweredQuestion()) {
        showFeedback(answeredElement, answeredCorrect, correctAnswerElement);
    }
}


function handleAnswerClicked(element, ignoreCheck = false) {
    if (hasAnsweredQuestion()) {
        return;
    }

    question = getCurrentQuestion();

    const arr = element.id.split("-");
    const clickedIndex = arr[arr.length - 1];

    const correctAnswerObject = getCorrectAnswer();
    const correctAnswerIndex = correctAnswerObject.index;
    const correctAnswerElement = document.getElementById(getAnswerCardElementId(correctAnswerIndex));

    const answeredCorrect = (parseInt(clickedIndex) == parseInt(correctAnswerIndex));

    showFeedback(element, answeredCorrect, correctAnswerElement);
    setQuestionAnswered(clickedIndex);
}

function hasAnsweredQuestion() {
    return ANSWERED_QUESTION_INDEXES.has(CURRENT_QUESTION_NUMBER);
}

function setQuestionAnswered(clickedIndex) {
    ANSWERED_QUESTION_INDEXES.set(CURRENT_QUESTION_NUMBER, clickedIndex);
}

function showFeedback(clickedElement, answeredCorrect, correctAnswerElement) {
    const feedbackElement = document.getElementById("play-answer-feedback");

    if (answeredCorrect) {
        clickedElement.style.borderColor = "green";
        feedbackElement.innerHTML = '<span class="text-xl md:text-2xl text-green-600 font-bold" style="color: green">Riktig!</span>'
    } else {
        clickedElement.style.borderColor = "red";
        clickedElement.style.opacity = 0.8;
        feedbackElement.innerHTML = "<span class='text-xl md:text-2xl font-bold' style='color: red;'>Feil!</span>"
        correctAnswerElement.style.borderColor = "green";
        feedbackElement.innerHTML += '<p class="text-xl md:text-2xl">Det riktige svaret er: "<span class="text-underline">' + correctAnswerElement.textContent +
            '</span>"</span></p>'
    }

    recordAnswer(answeredCorrect);
}

function recordAnswer(answeredCorrect) {
    if (answeredCorrect) {
        CURRENT_PLAY_DATA["correct"] += 1;
    } else {
        CURRENT_PLAY_DATA["wrong"] += 1;
    }
}

function nextQuestionButtonPressed() {
    // They need to answer before proceeding
    if (!hasAnsweredQuestion() && !getSettingsValue(SETTINGS_DEBUG_KEY)) {
        alert("Du må svare på spørsmålet før du fortsetter!");
        return;
    }

    if (isOnLastQuestion()) {
        showResultPage();
        return;
    }

    CURRENT_QUESTION_NUMBER += 1;

    resetUserInputs();

    showCurrentQuestion();
}


function previousQuestionButtonPressed() {
    if (isOnFirstQuestion()) {
        alert("Du er allerede på det første spørsmålet!");
        return;
    }

    CURRENT_QUESTION_NUMBER -= 1;

    resetUserInputs();

    showCurrentQuestion();
}

function isOnFirstQuestion() {
    return CURRENT_QUESTION_NUMBER == 1;
}

function isOnLastQuestion() {
    if (CURRENT_QUESTION_NUMBER >= CURRENT_QUIZ.questions.length) {
        return true;
    }
    return false;
}

function resetUserInputs() {
    // Reset answers
    const answerCards = document.getElementById("answer-cards").children;
    for (let i = 0; i < answerCards.length; i++) {
        const answerCardElement = document.getElementById("answer-cards").children[i];

        answerCardElement.style.opacity = 1;
        answerCardElement.style.borderColor = "transparent";
        answerCardElement.style.display = "none";
    }

    document.getElementById("play-answer-feedback").textContent = "";
    updateCurrentQuestionIndexText();
}

function hideFrontpage() {
    document.getElementById("front").style.display = 'none';
}

function showFrontpage() {
    document.getElementById("front").style.display = 'inherit';
    setQuizCountText();
    setMetaTitle("Quiz");
}

function hidePlaypage() {
    document.getElementById("play").style.display = 'none';
}

function showPlaypage() {
    document.getElementById("play").style.display = 'inherit';
}

function showResultPage() {
    const c = CURRENT_PLAY_DATA["correct"];
    const w = CURRENT_PLAY_DATA["wrong"];
    const l = CURRENT_PLAY_DATA["questions_length"];
    const s = CURRENT_PLAY_DATA["start"];
    const e = new Date();
    const p = Math.round((c / l) * 100);

    const answeredCorrectDiv = `
        <div class="px-6 py-8 flex flex-row gap-x-4 items-center bg-green-100/45 dark:bg-green-600 dark:text-white text-green-800 rounded-xl font-semibold my-4">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="3" stroke="currentColor" class="size-6">
                <path stroke-linecap="round" stroke-linejoin="round" d="m4.5 12.75 6 6 9-13.5" /> 
            </svg> 
            <span class="text-lg font-bold">Svaret ditt er riktig</span>
        </div>`;

    const answeredWrongDiv = `
        <div class="px-6 py-8 flex flex-row gap-x-4 items-center bg-red-100/45 dark:bg-red-600 dark:text-white text-red-800 rounded-xl font-semibold my-4">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="3" stroke="currentColor" class="size-6">
                <path stroke-linecap="round" stroke-linejoin="round" d="M6 18 18 6M6 6l12 12" />
            </svg> 
            <span class="text-lg font-bold">Svaret ditt er feil</span>
        </div>`;

    let pageContentElement = document.getElementById("quiz-result-page-content");

    let latterHTML = "";

    // Reset content
    pageContentElement.innerHTML = `
        <div class="bg-slate-200/25 dark:bg-neutral-800 rounded-xl p-6 ring-1 ring-indigo-700/10">
            <div class="text-center">
                <h1 class="text-slate-900 dark:text-slate-100 text-4xl md:text-6xl font-bold">Ditt resultat 🏆</h1>
                <span class="my-4 text-gray-400 uppercase text-sm font-bold">${CURRENT_QUIZ.title}</span> 
            </div>
            <div class="text-center my-4">
                <p class="text-xl font-bold uppercase"><span>${p}%</span> korrekt</p>
                <div class="flex flex-row items-center gap-x-2 justify-center my-2">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" class="size-6">
                      <path stroke-linecap="round" stroke-linejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                    </svg>
                    <span>${timeDifference(s, e)}</span>
                </div>
                <p class="mt-2"><span>${c}</span>/<span>${l}</span> riktige svar</p>
                <p><span>${w}</span>/<span>${l}</span> feil svar</p>
            </div>
        </div>`;

    for (let i = 0; i < CURRENT_QUIZ.questions.length; i++) {
        const answeredIndex = parseInt(ANSWERED_QUESTION_INDEXES.get(i+1));
        const question = CURRENT_QUIZ.questions[i];

        let isAnswerCorrect;

        try {
            isAnswerCorrect = question.answers[answeredIndex].correct;
        } catch (error) {
            isAnswerCorrect = getSettingsValue(SETTINGS_DEBUG_KEY) ? false : null;
        }

        if (isAnswerCorrect === null) {
            alert("Noe gikk galt...");
            break;
        }

        let answersHtml = '';

        for (let j = 0; j < question.answers.length; j++) {
            const answer = question.answers[j];

            let cssClass = "border rounded-xl p-6";
            if (answer.correct) {
                cssClass += ' bg-green-100/45 border-green-400/90 dark:bg-green-600 dark:border-transparent dark:text-white';
            } else if (!answer.correct && j === answeredIndex) {
                cssClass += ' bg-red-100/45 border-red-400/90 dark:bg-red-600 dark:border-transparent dark:text-white';
            }

            answersHtml += `
                <div class="${cssClass}">
                    <span>${answer.text}</span>
                </div>`;
        }

        latterHTML += `
            <div>
                <button class="px-2 py-4 hover:bg-slate-200 hover:dark:bg-neutral-800 accordion-active flex flex-row justify-between w-full" onclick="toggleAccordion(this)">
                    <h3 class="text-slate-900 dark:text-slate-100 text-xl text-left font-bold">
                        ${question.question}
                    </h3>
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="3" stroke="currentColor" class="rotate-180 size-6">
                        <path stroke-linecap="round" stroke-linejoin="round" d="m4.5 15.75 7.5-7.5 7.5 7.5" />
                    </svg>
                </button>

                <div class="flex">
                    <div class="w-full">
                        <div class="panel overflow-hidden transition-max-height duration-200" style="max-height: 100%;">
                            <div class="quiz-result-question-result">
                                ${isAnswerCorrect ? answeredCorrectDiv : answeredWrongDiv}
                            </div>
                            <div class="grid grid-row-auto gap-y-6">
                                ${answersHtml}
                            </div>
                        </div>
                    </div>
                </div>
            </div>`;
    }

    // Close the outer container
    latterHTML += `</div></div>`;

    pageContentElement.innerHTML += `
        <div class="grid grid-rows-auto gap-y-8 my-6">
            ${latterHTML}
        </div>
    `;

    hidePlaypage();

    // Display the result page
    document.getElementById("quiz-result-page").style.display = 'inherit';

    setMetaTitle(`Resultat ${CURRENT_QUIZ.title}`)
}


function hideResultPage() {
    document.getElementById("quiz-result-page").style.display = 'none';
}

function setQuizMetaInfoForKey(key, quizObject) {
    QUIZ_META_INFO[key] = {
        "title": quizObject.title,
        "document_url": quizObject.document_url,
        "length": quizObject.questions.length
    };
}

function setQuiz(data) {
    CURRENT_QUIZ = data; 
}

function resetPlayData() {
    CURRENT_PLAY_DATA = {
        "questions_length": CURRENT_QUIZ.questions.length,
        "correct": 0,
        "wrong": 0,
        "start": new Date()
    };
}

function getCurrentQuestion() {
    return CURRENT_QUIZ.questions[CURRENT_QUESTION_NUMBER - 1];
}

// returns { "answer": getCurrentQuestion().answers[i], "index": i }
function getCorrectAnswer() {
    for (let i = 0; i < getCurrentQuestion().answers.length; i++) {
        if (getCurrentQuestion().answers[i].correct) {
            return {
                "answer": getCurrentQuestion().answers[i],
                "index": i
            };
        }
    }
}

function showHome() {
    clearQuiz();
    hidePlaypage();
    hideResultPage();
    showFrontpage();
    setValuesForSettingCheckboxes();
}

function playAgain() {
    resetQuiz();
    hideResultPage();
    showPlaypage();
    showCurrentQuestion();
}

function clearQuiz() {
    resetGlobalVars();

    resetUserInputs();

    removeCurrentQuiz();
}

function resetQuiz() {
    resetGlobalVars();

    resetUserInputs();

    resetPlayData();

    shuffleQuiz();

    showCurrentQuestion();
}

function resetGlobalVars() {
    ANSWERED_QUESTION_INDEXES = new Map();
    CURRENT_QUESTION_NUMBER = 1;
    CURRENT_PLAY_DATA = {};
}

function removeCurrentQuiz() {
	CURRENT_QUIZ = {};
}

function setValuesForSettingCheckboxes() {
	SETTINGS_LIST.forEach(setting => 
		document.getElementById(setting).checked = getSettingsValue(setting));
}

function handleSettingsChecked(element) {
    setSettingsValue(element.id);
}

function getSettingsValue(key) {
    return localStorage.getItem(key) === "true";
}

function setSettingsValue(key, e = null) {
    value = e || !(JSON.parse(localStorage.getItem(key)))
    localStorage.setItem(key, value);

    handleSettingUpdated(key);
}

function handleSettingUpdated(key) {
	if (key === SETTINGS_DARK_MODE_KEY) {
        document.documentElement.classList.toggle('dark');
    }

    if (key === SETTINGS_DEBUG_KEY && !value) {
        hideDebugDiv();
    } else if (key === SETTINGS_DEBUG_KEY && value) {
        showDebugDiv();
    }
}

function shuffleQuiz() {
    if (getSettingsValue(SETTINGS_DEBUG_KEY)) {
        console.log("Cannot shuffle while in debug mode");
        return;
    }

    if (getSettingsValue(SETTINGS_RANDOMIZE_QUESTIONS_KEY)) {
        shuffle(CURRENT_QUIZ.questions);
    }

    if (getSettingsValue(SETTINGS_RANDOMIZE_ANSWERS_KEY)) {
        for (let i = 0; i < CURRENT_QUIZ.questions.length; i++) {
            shuffle(CURRENT_QUIZ.questions[i].answers);
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
            array[randomIndex], array[currentIndex]
        ];
    }
}

function setQuizQuestionText(questionObject) {
    let text;
    if (getSettingsValue(SHOW_QUESTION_NUMBER_KEY)) {
        text = questionObject.question;
    } else {
        const substringIndex = questionObject.question.indexOf(".") + 1;
        text = questionObject.question.substring(substringIndex);
    }

    document.getElementById("quiz-question").textContent = text;
}

function setAnswerText(answer, answerElement, index) {
    let text;
    if (getSettingsValue(SHOW_ANSWER_OPTION_KEY)) {
        text = answer.text;
    } else {
        const answerElementSubStringIndex = answer.text.indexOf(")") + 2;
        text = answer.text.substring(answerElementSubStringIndex);
    }

    // Show digit value for keyboard user
    if (getSettingsValue(SETTINGS_KEYBOARD_MODE_KEY)) {
    	text += " [" + (index+1) + "]";
    }

    answerElement.textContent = text;
}

function showDebugDiv() {
    document.getElementById("debug-div").style.display = "flex";
}

function hideDebugDiv() {
    document.getElementById("debug-div").style.display = "none";
}

function goToSpecificQuestion() {
    const questionNumber = document.getElementById("quiz-question-number-input").value;
    if (!questionNumber) {
        alert("You must provide a question number like 10");
        return;
    }

    showSpecificQuizQuestion(questionNumber);
}

function showSpecificQuizQuestion(questionNumber) {
    const questionIndex = questionNumber;
    const quizSize = CURRENT_QUIZ.questions.length;

    if (questionIndex > quizSize) {
        alert("This quiz only have " + quizSize + " questions");
        return;
    }

    resetUserInputs();

    CURRENT_QUESTION_NUMBER = Math.max(1, questionIndex);

    showCurrentQuestion();
}

function setQuizTitle() {
    document.getElementById("play-title").textContent = CURRENT_QUIZ.title;
}

function setQuizCountText() {
    document.getElementById("quiz-count").textContent = `(${Object.keys(QUIZ_META_INFO).length})`
}

function setQuizQuestionsCount() {
    document.getElementById("quiz-questions-count").textContent = CURRENT_QUIZ.questions.length;
}

function updateCurrentQuestionIndexText() {
    document.getElementById("current-quiz-question-index").textContent = CURRENT_QUESTION_NUMBER;
    validateQuestionIndex();
}

function validateQuestionIndex() {
    const val = parseInt(document.getElementById("current-quiz-question-index").textContent);

    if (val && val > 0 && CURRENT_QUESTION_NUMBER > val) {
        resetQuiz();
        alert("Noe gikk galt...");
    }
}

function getAnswerCardElementId(index) {
	return ANSWER_CARD_START_ID_NAME + index;
}

function initKeyDownListener() {
	document.addEventListener("keydown", (event) => {
		
		// Enable tab & enter by default
		const pressedKeyCode = event.keyCode;

		const pressedEnter = pressedKeyCode === 13;

		const isPlayingAQuiz = document.getElementById("play").style.display === "inherit";

		const pressedEnterOnAnInput = pressedEnter && !isPlayingAQuiz 
			&& event.target && event.target.tagName === "INPUT";

		const pressedEnterOnAPlayableQuiz = pressedEnter && !isPlayingAQuiz 
			&& event.target && event.target.id.startsWith("playable-quiz-card");

		const pressedEnterOnAnAnswer = pressedEnter && isPlayingAQuiz 
			&& event.target && event.target.id.startsWith(ANSWER_CARD_START_ID_NAME);

		const pressedPreviousOrNextButton = pressedEnter && isPlayingAQuiz 
			&& event.target 
			&& (event.target.id === "previous-question-button" || event.target.id === "next-question-button");
			
		if (pressedEnterOnAnInput || pressedEnterOnAPlayableQuiz 
				|| pressedEnterOnAnAnswer || pressedPreviousOrNextButton) {
			event.target.click();
			return;
		}

		// However, for 1, 2, 3, left- and right arrows, check if setting is enabled
		if (!getSettingsValue(SETTINGS_KEYBOARD_MODE_KEY)) {
			return;
		}

		if (!isPlayingAQuiz) {
			debugMessage("keyListener ignored, no active quiz");
			return;
		}

		const availableAnswersLength = getCurrentQuestion().answers.length-1
		const maxAnswerCardsCount = availableAnswersLength;
		const highestKeyCode = Math.max(DIGIT_1_KEY_CODE, DIGIT_1_KEY_CODE+maxAnswerCardsCount);

		const pressedLeftArrowKey = pressedKeyCode === 37;
		const pressedRightArrowKey = pressedKeyCode === 39;
		const pressedInvalidKey = (pressedKeyCode < DIGIT_1_KEY_CODE 
			|| pressedKeyCode > highestKeyCode) && !pressedLeftArrowKey && !pressedRightArrowKey;

		if (pressedInvalidKey) {
			debugMessage("pressed invalid key: " + event.code)
			return;
		}

		debugMessage("pressed: " + event.code + ", index: " + (pressedKeyCode - DIGIT_1_KEY_CODE));

		if (pressedLeftArrowKey) {
			document.getElementById("previous-question-button").click();
		} else if (pressedRightArrowKey) {
			document.getElementById("next-question-button").click();
		} else {
			const playcardIndex = pressedKeyCode - DIGIT_1_KEY_CODE;
			document.getElementById(getAnswerCardElementId(playcardIndex)).click();
		}

	});
}

function setMetaTitle(title) {
    document.querySelector('title').textContent = title;
}

function debugMessage(msg) {
	if (getSettingsValue(SETTINGS_DEBUG_KEY)) {
		console.log(msg);
	}
}

// SOURCE https://www.w3schools.com/howto/howto_js_accordion.asp
function toggleAccordion(element) {
    const panel = element.parentElement.querySelector(".panel");
    const isActive = panel.style.maxHeight !== "0px";

    const svg = element.lastElementChild;
    svg.classList.toggle("rotate-180");

    if (isActive) {
        element.classList.remove("accordion-active");
        panel.style.maxHeight = "0";
    } else {
         element.classList.add("accordion-active");
         panel.style.maxHeight = "100%";
    }
}

function initAnalytics() {
    !function(t,e){var o,n,p,r;e.__SV||(window.posthog=e,e._i=[],e.init=function(i,s,a){function g(t,e){var o=e.split(".");2==o.length&&(t=t[o[0]],e=o[1]),t[e]=function(){t.push([e].concat(Array.prototype.slice.call(arguments,0)))}}(p=t.createElement("script")).type="text/javascript",p.async=!0,p.src=s.api_host.replace(".i.posthog.com","-assets.i.posthog.com")+"/static/array.js",(r=t.getElementsByTagName("script")[0]).parentNode.insertBefore(p,r);var u=e;for(void 0!==a?u=e[a]=[]:a="posthog",u.people=u.people||[],u.toString=function(t){var e="posthog";return"posthog"!==a&&(e+="."+a),t||(e+=" (stub)"),e},u.people.toString=function(){return u.toString(1)+".people (stub)"},o="init push capture register register_once register_for_session unregister unregister_for_session getFeatureFlag getFeatureFlagPayload isFeatureEnabled reloadFeatureFlags updateEarlyAccessFeatureEnrollment getEarlyAccessFeatures on onFeatureFlags onSessionId getSurveys getActiveMatchingSurveys renderSurvey canRenderSurvey getNextSurveyStep identify setPersonProperties group resetGroups setPersonPropertiesForFlags resetPersonPropertiesForFlags setGroupPropertiesForFlags resetGroupPropertiesForFlags reset get_distinct_id getGroups get_session_id get_session_replay_url alias set_config startSessionRecording stopSessionRecording sessionRecordingStarted captureException loadToolbar get_property getSessionProperty createPersonProfile opt_in_capturing opt_out_capturing has_opted_in_capturing has_opted_out_capturing clear_opt_in_out_capturing debug".split(" "),n=0;n<o.length;n++)g(u,o[n]);e._i.push([i,s,a])},e.__SV=1)}(document,window.posthog||[]);
    posthog.init('phc_W6emONuvTwnDC06tGgJCGV5wByTdso4H99HK5KjapqQ',{api_host:'https://eu.i.posthog.com', person_profiles: 'identified_only' // or 'always' to create profiles for anonymous users as well
	})
}

function timeDifference(start, end) {
    // Get the difference in milliseconds
    const diff = end - start;

    // Calculate hours, minutes, and seconds
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((diff % (1000 * 60)) / 1000);

    const hourText = `${hours} time${hours !== 1 ? 'r' : ''}`;
    const minuteText = `${minutes} minutt${minutes !== 1 ? 'er' : ''}`;
    const secondText = `${seconds} sekund${seconds !== 1 ? 'er' : ''}`;

    return `${hourText}, ${minuteText}, ${secondText}`;
}

function reloadIfHiddenFor(minutes) {
    let hiddenStartTime;

    const timeLimit = minutes * 60 * 1000; // Convert minutes to milliseconds

    document.addEventListener("visibilitychange", () => {
        if (document.hidden) {
            // Record the time when the page is hidden
            hiddenStartTime = new Date().getTime();
        } else {
            if (hiddenStartTime) {
                // Calculate the time the page was hidden
                const hiddenDuration = new Date().getTime() - hiddenStartTime;

                // Reload if hidden for more than the specified time
                if (hiddenDuration >= timeLimit) {
                    location.reload();
                    console.log("Page reloaded due to inactivity for " + timeLimit + " minutes");
                }
            }
        }
    });
}