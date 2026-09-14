import { app, saveState } from "./state.js";
import { getCurrentCard, getFilteredCards, render, renderCard } from "./render.js";
import { showToast } from "./toast.js";

export function flipCard() {
	if (!getCurrentCard()) {
		return;
	}

	app.state.flipped = !app.state.flipped;
	renderCard();
}

export function moveCard(amount) {
	const filtered = getFilteredCards();

	if (!filtered.length) {
		return;
	}

	app.state.currentIndex += amount;

	if (app.state.currentIndex >= filtered.length) {
		app.state.currentIndex = 0;
	}

	if (app.state.currentIndex < 0) {
		app.state.currentIndex = filtered.length - 1;
	}

	app.state.flipped = false;
	renderCard();
}

export function setStatus(status) {
	const card = getCurrentCard();

	if (!card) {
		return;
	}

	app.state.status[card.id] = status;
	showToast(status === "known" ? "Card marked known." : "Card marked for review.");
	render();
}

export function toggleStar() {
	const card = getCurrentCard();

	if (!card) {
		return;
	}

	app.state.starred[card.id] = !app.state.starred[card.id];
	renderCard();
}

export function setFilter(filter) {
	app.state.filter = filter;
	app.state.category = "";
	app.state.currentIndex = 0;
	app.state.flipped = false;

	document.querySelectorAll("[data-filter]").forEach((button) => {
		button.classList.toggle("active", button.dataset.filter === filter);
	});

	document.querySelectorAll("[data-category]").forEach((button) => {
		button.classList.remove("active");
	});

	render();
}

export function setCategory(category) {
	app.state.category = category;
	app.state.filter = "all";
	app.state.currentIndex = 0;
	app.state.flipped = false;

	document.querySelectorAll("[data-filter]").forEach((button) => {
		button.classList.remove("active");
	});

	document.querySelectorAll("[data-category]").forEach((button) => {
		button.classList.toggle("active", button.dataset.category === category);
	});

	render();
}

export function startReview() {
	app.state.mode = "review";
	app.state.currentIndex = 0;
	app.state.flipped = false;
	render();
}

export function randomCard() {
	const filtered = getFilteredCards();

	if (!filtered.length) {
		showToast("There are no cards in this selection.");
		return;
	}

	app.state.mode = "review";
	app.state.currentIndex = Math.floor(Math.random() * filtered.length);
	app.state.flipped = false;
	render();
}

export function resetProgress() {
	const confirmed = confirm("Reset all card statuses, stars, and quiz statistics?");

	if (!confirmed) {
		return;
	}

	app.state.status = {};
	app.state.starred = {};
	app.state.quiz = {
		index: 0,
		score: 0,
		answered: false,
		questions: [],
	};
	app.state.currentIndex = 0;
	app.state.flipped = false;
	app.state.mode = "review";
	saveState();
	render();
	showToast("Progress reset.");
}
