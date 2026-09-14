import { app } from "./state.js";
import { elements } from "./elements.js";
import {
	activateSet,
	addCard,
	createBlankSet,
	createSetFromFile,
	deleteCard,
	deleteSet,
	downloadSet,
	handleDroppedFiles,
	init,
	openFilePicker,
	renameSet,
	setDropHighlight,
	updateCard,
} from "./library.js";
import {
	closeManageModal,
	isManageOpen,
	openManageModal,
	resetCardForm,
	renderManageModal,
	setCardFormMode,
} from "./manage.js";
import { render } from "./render.js";
import {
	flipCard,
	moveCard,
	randomCard,
	resetProgress,
	setCategory,
	setFilter,
	setStatus,
	startReview,
	toggleStar,
} from "./review.js";
import { nextQuizQuestion, startQuiz } from "./quiz.js";
import { buildPrintDeck } from "./print.js";

document.querySelectorAll("[data-filter]").forEach((button) => {
	button.addEventListener("click", () => {
		setFilter(button.dataset.filter);
	});
});

elements.categoryList.addEventListener("click", (event) => {
	const button = event.target.closest("[data-category]");

	if (button) {
		setCategory(button.dataset.category);
	}
});

elements.setSelect.addEventListener("change", () => {
	const setId = elements.setSelect.value;

	if (setId && setId !== app.currentSetId) {
		activateSet(setId, true);
	}
});

elements.manageSetsButton.addEventListener("click", openManageModal);
elements.uploadSetButton.addEventListener("click", openFilePicker);
elements.emptyUploadButton.addEventListener("click", openFilePicker);
elements.chooseJsonButton.addEventListener("click", openFilePicker);
elements.newSetButton.addEventListener("click", createBlankSet);
elements.closeManageButton.addEventListener("click", closeManageModal);

elements.manageModal.addEventListener("click", (event) => {
	if (event.target === elements.manageModal) {
		closeManageModal();
	}
});

elements.setFileInput.addEventListener("change", () => {
	const file = elements.setFileInput.files[0];
	elements.setFileInput.value = "";

	if (file) {
		createSetFromFile(file);
	}
});

elements.manageSetList.addEventListener("click", (event) => {
	const button = event.target.closest("[data-set-id]");

	if (!button) {
		return;
	}

	const setId = button.dataset.setId;
	app.manageSelectedSetId = setId;
	app.manageSelectedCardId = null;
	app.cardFormMode = "view";
	app.editingCardId = null;

	if (setId !== app.currentSetId) {
		activateSet(setId);
	} else {
		renderManageModal();
	}
});

elements.renameSetButton.addEventListener("click", () => {
	renameSet(app.manageSelectedSetId, elements.manageSetName.value);
});

elements.manageSetName.addEventListener("keydown", (event) => {
	if (event.key === "Enter") {
		event.preventDefault();
		renameSet(app.manageSelectedSetId, elements.manageSetName.value);
	}
});

elements.downloadSetButton.addEventListener("click", () => {
	downloadSet(app.manageSelectedSetId || app.currentSetId);
});

elements.deleteSetButton.addEventListener("click", () => {
	deleteSet(app.manageSelectedSetId);
});

elements.manageCardSelect.addEventListener("change", () => {
	const value = elements.manageCardSelect.value;
	app.manageSelectedCardId = value ? Number(value) : null;
	setCardFormMode("view");
});

elements.editCardButton.addEventListener("click", () => {
	setCardFormMode("edit");
});

elements.deleteCardButton.addEventListener("click", () => {
	if (app.manageSelectedCardId == null) {
		return;
	}

	deleteCard(app.manageSelectedSetId, app.manageSelectedCardId);
});

elements.newCardButton.addEventListener("click", () => {
	setCardFormMode("add");
});

elements.saveCardButton.addEventListener("click", () => {
	const draft = {
		category: elements.cardCategoryInput.value,
		question: app.editingCardId
			? elements.cardQuestionInput.value
			: elements.newCardQuestionInput.value,
		answer: elements.cardAnswerInput.value,
	};
	const saved = app.editingCardId
		? updateCard(app.manageSelectedSetId, app.editingCardId, draft)
		: addCard(app.manageSelectedSetId, draft);

	if (saved) {
		resetCardForm();
	}
});

elements.cancelCardEditButton.addEventListener("click", resetCardForm);

["dragenter", "dragover"].forEach((type) => {
	window.addEventListener(type, (event) => {
		if (![...event.dataTransfer.types].includes("Files")) {
			return;
		}

		event.preventDefault();
		event.dataTransfer.dropEffect = "copy";

		if (type === "dragenter") {
			app.dragDepth += 1;
		}

		setDropHighlight(true);
	});
});

window.addEventListener("dragleave", (event) => {
	if (![...event.dataTransfer.types].includes("Files")) {
		return;
	}

	app.dragDepth = Math.max(0, app.dragDepth - 1);

	if (app.dragDepth === 0) {
		setDropHighlight(false);
	}
});

window.addEventListener("drop", (event) => {
	if (!event.dataTransfer || !event.dataTransfer.files.length) {
		return;
	}

	event.preventDefault();
	app.dragDepth = 0;
	setDropHighlight(false);
	handleDroppedFiles(event.dataTransfer.files);
});

elements.searchInput.addEventListener("input", (event) => {
	app.state.search = event.target.value;
	app.state.currentIndex = 0;
	app.state.flipped = false;
	render();
});

elements.flipButton.addEventListener("click", flipCard);
elements.flashcard.addEventListener("click", flipCard);

elements.previousButton.addEventListener("click", () => {
	moveCard(-1);
});

elements.nextButton.addEventListener("click", () => {
	moveCard(1);
});

elements.reviewStatusButton.addEventListener("click", () => {
	setStatus("review");
});

elements.knownStatusButton.addEventListener("click", () => {
	setStatus("known");
});

elements.starButton.addEventListener("click", (event) => {
	event.stopPropagation();
	toggleStar();
});

document.getElementById("reviewButton").addEventListener("click", startReview);

document.getElementById("quizButton").addEventListener("click", startQuiz);

document.getElementById("randomButton").addEventListener("click", randomCard);

document.getElementById("printButton").addEventListener("click", () => {
	const hasCards = buildPrintDeck();

	if (!hasCards) {
		return;
	}

	/*
		Wait for layout and fonts to settle before opening print
		preview. This makes measurements reliable in Chromium,
		Firefox, and Safari.
	*/
	requestAnimationFrame(() => {
		requestAnimationFrame(() => {
			window.print();
		});
	});
});

document.getElementById("resetButton").addEventListener("click", resetProgress);

elements.nextQuizButton.addEventListener("click", nextQuizQuestion);

document.addEventListener("keydown", (event) => {
	if (event.key === "Escape" && isManageOpen()) {
		closeManageModal();
		return;
	}

	const tag = document.activeElement.tagName.toLowerCase();

	if (tag === "input" || tag === "textarea" || tag === "select" || isManageOpen()) {
		return;
	}

	if (event.code === "Space") {
		event.preventDefault();

		if (app.state.mode === "review") {
			flipCard();
		}
	}

	if (event.key === "ArrowLeft" && app.state.mode === "review") {
		moveCard(-1);
	}

	if (event.key === "ArrowRight" && app.state.mode === "review") {
		moveCard(1);
	}

	if (event.key.toLowerCase() === "k" && app.state.mode === "review") {
		setStatus("known");
	}

	if (event.key.toLowerCase() === "r" && app.state.mode === "review") {
		setStatus("review");
	}

	if (event.key.toLowerCase() === "s" && app.state.mode === "review") {
		toggleStar();
	}
});

init();
