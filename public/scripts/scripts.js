ANSWER_CARD_START_ID_NAME = "play-card-";

ANSWER_FORMAT_ORDER = ["a)", "b)", "c)", "d)", "e)", "f)", "g)", "h)"]

// SETTINGS
SETTINGS = new Map();

SETTINGS_DARK_MODE_KEY = "DARK_MODE";
SETTINGS_DEBUG_KEY = "DEBUG";
SETTINGS_SORT_QUESTIONS_KEY = "SORT_QUESTIONS";
SETTINGS_SORT_ANSWERS_KEY = "SORT_ANSWERS";
SHOW_QUESTION_NUMBER = "SHOW_QUESTION_NUMBER";
SHOW_ANSWER_OPTION = "SHOW_ANSWER_OPTION";

SETTINGS.set(SETTINGS_DARK_MODE_KEY, localStorage.getItem(SETTINGS_DARK_MODE_KEY) || false);
SETTINGS.set(SETTINGS_DEBUG_KEY, localStorage.getItem(SETTINGS_DEBUG_KEY) || false);
SETTINGS.set(SETTINGS_SORT_QUESTIONS_KEY, localStorage.getItem(SETTINGS_SORT_QUESTIONS_KEY) || false);
SETTINGS.set(SETTINGS_SORT_ANSWERS_KEY, localStorage.getItem(SETTINGS_SORT_ANSWERS_KEY) || false);
SETTINGS.set(SHOW_ANSWER_OPTION, localStorage.getItem(SHOW_ANSWER_OPTION) || false);
// END

// QUIZ DATA
QUIZ_DATA_INDEX_MAP = new Map();
QUIZ_DATA_INDEX_MAP.set(1, '/json/data_1.json');
//QUIZ_DATA_INDEX_MAP.set("1", '/json/data_1_small.json');
QUIZ_META_INFO = {}
QUIZ = {}
// END OF QUIZ DATA

// CAN CHANGE
ANSWERED_QUESTION_INDEXES = new Map();
CURRENT_QUESTION_INDEX = 1;
// END


document.addEventListener("DOMContentLoaded", (event) => {
    if (getBoolSettingsValue(SETTINGS_DEBUG_KEY)) {
        showDebugDiv();
        console.log("DOM fully loaded and parsed");
    }

    if (getBoolSettingsValue(SETTINGS_DARK_MODE_KEY)
    	|| window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
    	setBoolSettingsValue(SETTINGS_DARK_MODE_KEY, true);
        document.documentElement.classList.add('dark');
    }

    initSettingsCheckboxes();

    fetchQuizMetaInfo();

    initAnalytics();
});

function setQuizToPlay(index) {
    if (!validateQuizIndex(index)) {
        console.log("Invalid quiz index");
        return;
    }

    hideFrontpage();
    showPlaypage();

    startQuiz(index);
}

function validateQuizIndex(index) {
    if (!QUIZ_DATA_INDEX_MAP.has(index)) {
        alert("Index: '" + index + "' does not exist!");
        return false;
    }
    return true;
}

function validateQuiz() {
    for (let i = 0; i < QUIZ.questions.length; i++) {
        let correctAnswers = 0;
        for (let j = 0; j < QUIZ.questions[i].answers.length; j++) {
            if (QUIZ.questions[i].answers[j].correct) {
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

function fetchQuizMetaInfo() {
    const fetchPromises = [];

    for (let [key, value] of QUIZ_DATA_INDEX_MAP.entries()) {
        const fetchPromise = fetch(value)
            .then(response => {
                if (!response.ok) {
                    throw new Error('Network response was not ok ' + response.statusText);
                }
                return response.json();
            })
            .then(data => {
                setQuizMetaInfo(key, data);
            })
            .catch(error => {
                console.error('There was a problem with the fetch operation:', error);
            });

        fetchPromises.push(fetchPromise);
    }

    // Wait until all fetch requests are done
    Promise.all(fetchPromises)
        .then(() => {
            displayAllQuizCards();
        })
        .catch(error => {
            console.error('There was a problem processing all quizzes:', error);
        });
}

function fetchQuizData(index) {
    return fetch(QUIZ_DATA_INDEX_MAP.get(index))
        .then(response => {
            if (!response.ok) {
                throw new Error('Network response was not ok ' + response.statusText);
            }
            return response.json();
        })
        .then(data => {
            setQuiz(data);
        })
        .catch(error => {
            console.error('There was a problem with the fetch operation:', error);
        });
}

function displayAllQuizCards() {
    const quizCardsElement = document.getElementById("quiz-cards");

    let newQuizCardHtmlContent = "";

    for (let [key, value] of Object.entries(QUIZ_META_INFO)) {
        newQuizCardHtmlContent += '<div class="bg-neutral-200 hover:bg-neutral-300 dark:bg-neutral-800 ' +
            'hover:dark:bg-neutral-700 rounded-xl p-6 cursor-pointer" ' +
            'onclick="setQuizToPlay(' + key + ')">' +
            '<h2 class="text-xl">' +
            '<a class="hover:underline font-semibold">' + value.title + '</a>' +
            '</h2>' +
            '<span class="text-gray-500 mt-2 block">Antall spørsmål: ' + value.length + '</span>' +
            '</div>'
    }

    quizCardsElement.innerHTML = newQuizCardHtmlContent;
}



function startQuiz(index) {
    fetchQuizData(index)
        .then(() => {
            validateQuiz();

            shuffleQuiz();

            setQuizTitle();
            setQuizQuestionsCount();

            displayQuestion();
        })
        .catch(error => {
            console.error('Error starting the quiz:', error);
        });

}

function displayQuestion() {
    question = getCurrentQuestion();

    validateCurrentQuestionHasCorrectAnswer(question);

    setQuizQuestionText(question);
    updateCurrentQuestionIndexText();

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
    const clickedIndex = arr[arr.length - 1];

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
        feedbackElement.innerHTML = '<span class="text-xl md:text-2xl text-green-600" style="color: green">Riktig!</span>'
    } else {
        clickedElement.style.borderColor = "red";
        clickedElement.style.opacity = 0.8;
        feedbackElement.innerHTML = "<span class='text-xl md:text-2xl' style='color: red;'>Feil!</span>"
        correctAnswerElement.style.borderColor = "green";
        feedbackElement.innerHTML += '<p class="text-xl md:text-2xl">Det riktige svaret er: "' + correctAnswerElement.textContent +
            '" </span></p>'
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
    for (let i = 0; i < answerCards.length; i++) {
        const answerCardElement = document.getElementById("play-cards").children[i];

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
}

function hidePlaypage() {
    document.getElementById("play").style.display = 'none';
}

function showPlaypage() {
    document.getElementById("play").style.display = 'inherit';
}

function setQuizMetaInfo(index, quiz) {
    QUIZ_META_INFO[index] = {
        "title": quiz.title,
        "length": quiz.questions.length
    };
}

function setQuiz(data) {
    QUIZ = data;
}

function getCurrentQuestion() {
    return QUIZ.questions[CURRENT_QUESTION_INDEX - 1];
}

function validateCurrentQuestionHasCorrectAnswer(questionObject) {
    let valid = false;
    for (let i = 0; i < questionObject.answers.length; i++) {
        if (questionObject.answers[i].correct) {
            valid = true;
        }
    }
    if (!valid) {
        alert("Question '" + questionObject.question + "' does not have a correct answer!")
    }
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
    document.getElementById(SETTINGS_DARK_MODE_KEY).checked = getBoolSettingsValue(SETTINGS_DARK_MODE_KEY);
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
    if (getBoolSettingsValue(SETTINGS_DEBUG_KEY)) {
        console.log("Cannot shuffle while in debug mode");
        return;
    }

    if (getBoolSettingsValue(SETTINGS_SORT_QUESTIONS_KEY)) {
        shuffle(QUIZ.questions);
    }

    if (getBoolSettingsValue(SETTINGS_SORT_ANSWERS_KEY)) {
        for (let i = 0; i < QUIZ.questions.length; i++) {
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
            array[randomIndex], array[currentIndex]
        ];
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

function showDebugDiv() {
    document.getElementById("debug-div").style.display = "inherit";
}

function hideDebugDiv() {
    document.getElementById("debug-div").style.display = "none";
}

function handleShowSpecificQuizQuestion() {
    const questionNumber = document.getElementById("quiz-question-number-input").value;
    if (!questionNumber) {
        alert("You must provide a question number like 10");
        return;
    }

    showSpecificQuizQuestion(questionNumber);
}

function showSpecificQuizQuestion(questionNumber) {
    const questionIndex = questionNumber;
    const quizSize = QUIZ.questions.length;

    if (questionIndex > quizSize) {
        alert("This quiz only have " + quizSize + " questions");
        return;
    }

    CURRENT_QUESTION_INDEX = Math.max(1, questionIndex);

    displayQuestion();
}

function setQuizTitle() {
    document.getElementById("play-title").textContent = QUIZ.title;
}

function setQuizQuestionsCount() {
    document.getElementById("quiz-questions-count").textContent = QUIZ.questions.length;
}

function updateCurrentQuestionIndexText() {
    document.getElementById("current-quiz-question-index").textContent = CURRENT_QUESTION_INDEX;
}

function initAnalytics() {
    !function(t,e){var o,n,p,r;e.__SV||(window.posthog=e,e._i=[],e.init=function(i,s,a){function g(t,e){var o=e.split(".");2==o.length&&(t=t[o[0]],e=o[1]),t[e]=function(){t.push([e].concat(Array.prototype.slice.call(arguments,0)))}}(p=t.createElement("script")).type="text/javascript",p.async=!0,p.src=s.api_host.replace(".i.posthog.com","-assets.i.posthog.com")+"/static/array.js",(r=t.getElementsByTagName("script")[0]).parentNode.insertBefore(p,r);var u=e;for(void 0!==a?u=e[a]=[]:a="posthog",u.people=u.people||[],u.toString=function(t){var e="posthog";return"posthog"!==a&&(e+="."+a),t||(e+=" (stub)"),e},u.people.toString=function(){return u.toString(1)+".people (stub)"},o="init push capture register register_once register_for_session unregister unregister_for_session getFeatureFlag getFeatureFlagPayload isFeatureEnabled reloadFeatureFlags updateEarlyAccessFeatureEnrollment getEarlyAccessFeatures on onFeatureFlags onSessionId getSurveys getActiveMatchingSurveys renderSurvey canRenderSurvey getNextSurveyStep identify setPersonProperties group resetGroups setPersonPropertiesForFlags resetPersonPropertiesForFlags setGroupPropertiesForFlags resetGroupPropertiesForFlags reset get_distinct_id getGroups get_session_id get_session_replay_url alias set_config startSessionRecording stopSessionRecording sessionRecordingStarted captureException loadToolbar get_property getSessionProperty createPersonProfile opt_in_capturing opt_out_capturing has_opted_in_capturing has_opted_out_capturing clear_opt_in_out_capturing debug".split(" "),n=0;n<o.length;n++)g(u,o[n]);e._i.push([i,s,a])},e.__SV=1)}(document,window.posthog||[]);
    posthog.init('phc_W6emONuvTwnDC06tGgJCGV5wByTdso4H99HK5KjapqQ',{api_host:'https://eu.i.posthog.com', person_profiles: 'identified_only' // or 'always' to create profiles for anonymous users as well
	})
}