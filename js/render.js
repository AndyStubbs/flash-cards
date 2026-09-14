import { app, saveState } from "./state.js";
import { elements } from "./elements.js";
import { renderQuiz } from "./quiz.js";

export function renderCategories() {
	const categories = [];

	app.cards.forEach((card) => {
		if (!categories.includes(card.category)) {
			categories.push(card.category);
		}
	});

	elements.categoryList.innerHTML = "";

	categories.forEach((category) => {
		const button = document.createElement("button");
		button.className = "category-button";
		button.dataset.category = category;
		button.type = "button";

		const label = document.createElement("span");
		label.textContent = category;

		const count = document.createElement("span");
		count.className = "count";
		count.dataset.categoryCount = category;
		count.textContent = "0";

		button.append(label, count);
		elements.categoryList.appendChild(button);
	});
}

export function syncNav() {
	document.querySelectorAll("[data-filter]").forEach((button) => {
		button.classList.toggle(
			"active",
			button.dataset.filter === app.state.filter && !app.state.category,
		);
	});

	document.querySelectorAll("[data-category]").forEach((button) => {
		button.classList.toggle("active", button.dataset.category === app.state.category);
	});
}

export function getFilteredCards() {
	const search = app.state.search.trim().toLowerCase();

	return app.cards.filter((card) => {
		const matchesSearch =
			!search ||
			card.question.toLowerCase().includes(search) ||
			card.answer.toLowerCase().includes(search) ||
			card.category.toLowerCase().includes(search);

		const matchesCategory = !app.state.category || card.category === app.state.category;

		let matchesFilter = true;

		if (app.state.filter === "unseen") {
			matchesFilter = !app.state.status[card.id];
		}

		if (app.state.filter === "known") {
			matchesFilter = app.state.status[card.id] === "known";
		}

		if (app.state.filter === "review") {
			matchesFilter = app.state.status[card.id] === "review";
		}

		if (app.state.filter === "starred") {
			matchesFilter = Boolean(app.state.starred[card.id]);
		}

		return matchesSearch && matchesCategory && matchesFilter;
	});
}

export function getCurrentCard() {
	const filtered = getFilteredCards();

	if (!filtered.length) {
		return null;
	}

	if (app.state.currentIndex >= filtered.length) {
		app.state.currentIndex = 0;
	}

	if (app.state.currentIndex < 0) {
		app.state.currentIndex = filtered.length - 1;
	}

	return filtered[app.state.currentIndex];
}

function statusLabel(card) {
	return app.state.status[card.id] || "Unseen";
}

export function splitIntoSentences(text) {
	return text
		.replace(/\s+/g, " ")
		.trim()
		.split(/(?<=[.!?])\s+(?=[A-Z0-9"'(])/)
		.map((sentence) => sentence.trim())
		.filter(Boolean);
}

function renderAnswerBullets(answerElement, answer) {
	answerElement.innerHTML = "";

	splitIntoSentences(answer).forEach((sentence) => {
		const listItem = document.createElement("li");
		listItem.textContent = sentence;
		answerElement.appendChild(listItem);
	});
}

export function renderCard() {
	const filtered = getFilteredCards();
	const card = getCurrentCard();

	if (!card) {
		elements.flashcard.hidden = true;
		elements.emptyState.hidden = false;
		elements.emptyNoSet.hidden = Boolean(app.currentSetId);
		elements.emptyNoCards.hidden = !app.currentSetId;

		if (app.currentSetId && !app.cards.length) {
			elements.emptyNoCards.innerHTML =
				"This set has no cards yet.<br><br>Open Manage sets to add cards, or upload a JSON file to create a new set.";
		} else {
			elements.emptyNoCards.innerHTML =
				"No cards match your current filters.<br><br>Try another category, status, or search term.";
		}

		elements.cardControls.style.display = "none";
		elements.progressFill.style.width = "0%";
		elements.progressBar.hidden = true;
		return;
	}

	elements.emptyState.hidden = true;
	elements.flashcard.hidden = false;
	elements.cardControls.style.display = "flex";
	elements.frontCategory.textContent = card.category;
	elements.backCategory.textContent = card.category;
	elements.frontQuestion.textContent = card.question;
	elements.backTitle.textContent = "Suggested answer";
	renderAnswerBullets(elements.backAnswer, card.answer);
	elements.cardNumber.textContent = `${app.state.currentIndex + 1} / ${filtered.length}`;
	elements.frontStatus.textContent = statusLabel(card);
	elements.backStatus.textContent = statusLabel(card);
	elements.starButton.textContent = app.state.starred[card.id] ? "★" : "☆";
	elements.starButton.classList.toggle("selected", Boolean(app.state.starred[card.id]));
	elements.flashcard.classList.toggle("flipped", app.state.flipped);
	elements.flipButton.textContent = app.state.flipped ? "Show question" : "Flip card";

	elements.reviewStatusButton.classList.toggle(
		"review",
		app.state.status[card.id] === "review",
	);
	elements.knownStatusButton.classList.toggle(
		"known",
		app.state.status[card.id] === "known",
	);

	const completed = filtered.filter((item) => app.state.status[item.id]).length;
	const percentage = filtered.length ? (completed / filtered.length) * 100 : 0;

	elements.progressFill.style.width = `${percentage}%`;
	elements.progressBar.hidden = percentage === 0;
	saveState();
}

export function renderStats() {
	const known = app.cards.filter((card) => app.state.status[card.id] === "known").length;
	const review = app.cards.filter((card) => app.state.status[card.id] === "review").length;
	const unseen = app.cards.filter((card) => !app.state.status[card.id]).length;
	const starred = app.cards.filter((card) => app.state.starred[card.id]).length;
	const quizTotal = app.state.quiz.questions.length;
	const accuracy = quizTotal ? Math.round((app.state.quiz.score / quizTotal) * 100) : 0;

	document.getElementById("totalStat").textContent = app.cards.length;
	document.getElementById("knownStat").textContent = known;
	document.getElementById("reviewStat").textContent = review;
	document.getElementById("accuracyStat").textContent = `${accuracy}%`;
	document.getElementById("allCount").textContent = app.cards.length;
	document.getElementById("unseenCount").textContent = unseen;
	document.getElementById("knownCount").textContent = known;
	document.getElementById("reviewCount").textContent = review;
	document.getElementById("starredCount").textContent = starred;

	document.querySelectorAll("[data-category-count]").forEach((element) => {
		const category = element.dataset.categoryCount;
		const count = app.cards.filter((card) => card.category === category).length;
		element.textContent = count;
	});
}

function updateTitle() {
	if (!app.currentSetId) {
		elements.pageTitle.textContent = "No flash-card set";
		elements.subtitle.textContent = "Upload or drop a JSON file to create a new set.";
		return;
	}

	if (app.state.category) {
		elements.pageTitle.textContent = app.state.category;
		elements.subtitle.textContent = "Review cards in this interview topic.";
		return;
	}

	const titles = {
		all: "Flashcards",
		unseen: "Unseen cards",
		review: "Needs review",
		known: "Known cards",
		starred: "Starred cards",
	};

	elements.pageTitle.textContent = titles[app.state.filter] || "Flashcards";
	elements.subtitle.textContent =
		app.state.mode === "quiz"
			? "Test your interview readiness."
			: "Review the concepts most relevant to the role.";
}

export function render() {
	renderStats();
	updateTitle();

	if (app.state.mode === "quiz") {
		elements.cardArea.style.display = "none";
		elements.cardControls.style.display = "none";
		elements.emptyState.hidden = true;
		elements.quizPanel.classList.add("visible");
		renderQuiz();
	} else {
		elements.cardArea.style.display = "block";
		elements.quizPanel.classList.remove("visible");
		renderCard();
	}
}
