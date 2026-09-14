import { app, saveState } from "./state.js";
import { elements } from "./elements.js";
import { getFilteredCards, render, renderStats } from "./render.js";
import { showToast } from "./toast.js";

function shuffle(items) {
	return [...items].sort(() => Math.random() - 0.5);
}

export function startQuiz() {
	const source = getFilteredCards();

	if (source.length < 4) {
		showToast("You need at least four cards to start a quiz.");
		return;
	}

	app.state.mode = "quiz";
	app.state.quiz = {
		index: 0,
		score: 0,
		answered: false,
		questions: shuffle(source).slice(0, 10),
	};
	render();
}

function getQuizAnswers(correctCard) {
	const incorrect = shuffle(app.cards.filter((card) => card.id !== correctCard.id)).slice(
		0,
		3,
	);

	return shuffle([correctCard, ...incorrect]);
}

export function renderQuiz() {
	const quiz = app.state.quiz;
	const question = quiz.questions[quiz.index];

	if (!question) {
		elements.quizScore.textContent = `Finished: ${quiz.score} / ${quiz.questions.length}`;
		elements.quizQuestion.textContent =
			"Great work. Start another quiz or return to review.";
		elements.answers.innerHTML = "";
		elements.quizFeedback.textContent =
			"Review cards marked for review before your interview.";
		elements.nextQuizButton.textContent = "Start another quiz";
		return;
	}

	elements.quizScore.textContent =
		`Question ${quiz.index + 1} of ${quiz.questions.length} ` +
		`• Score: ${quiz.score}`;
	elements.quizQuestion.textContent = question.question;
	elements.quizFeedback.textContent = "";
	elements.nextQuizButton.textContent = "Next question";
	elements.answers.innerHTML = "";

	getQuizAnswers(question).forEach((answer) => {
		const button = document.createElement("button");
		button.className = "answer";
		button.type = "button";
		button.textContent = answer.answer;
		button.dataset.correct = answer.id === question.id;
		button.addEventListener("click", () => {
			answerQuiz(button, question);
		});
		elements.answers.appendChild(button);
	});
}

function answerQuiz(button, question) {
	if (app.state.quiz.answered) {
		return;
	}

	app.state.quiz.answered = true;
	const isCorrect = button.dataset.correct === "true";

	document.querySelectorAll(".answer").forEach((answer) => {
		if (answer.dataset.correct === "true") {
			answer.classList.add("correct");
		}
	});

	if (isCorrect) {
		app.state.quiz.score += 1;
		elements.quizFeedback.textContent = "Correct.";
	} else {
		button.classList.add("incorrect");
		elements.quizFeedback.textContent =
			"Not quite. The highlighted answer is the best match.";
	}

	saveState();
	renderStats();
	elements.quizScore.textContent =
		`Question ${app.state.quiz.index + 1} of ` +
		`${app.state.quiz.questions.length} • Score: ` +
		`${app.state.quiz.score}`;
}

export function nextQuizQuestion() {
	if (!app.state.quiz.questions.length) {
		startQuiz();
		return;
	}

	if (app.state.quiz.index >= app.state.quiz.questions.length - 1) {
		app.state.quiz.index += 1;
		render();
		return;
	}

	app.state.quiz.index += 1;
	app.state.quiz.answered = false;
	renderQuiz();
}
