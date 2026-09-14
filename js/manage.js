import { app } from "./state.js";
import { elements } from "./elements.js";
import { getSetList } from "./library.js";

export function isManageOpen() {
	return elements.manageModal.classList.contains("open");
}

export function openManageModal() {
	if (!app.manageSelectedSetId || !app.library.sets[app.manageSelectedSetId]) {
		app.manageSelectedSetId = app.currentSetId;
	}

	resetCardForm();
	renderManageModal();
	elements.manageModal.classList.add("open");
}

export function closeManageModal() {
	elements.manageModal.classList.remove("open");
	resetCardForm();
}

export function resetCardForm() {
	app.editingCardId = null;
	setCardFormMode("view");
}

export function setCardFormMode(mode) {
	app.cardFormMode = mode;

	if (mode === "add") {
		app.editingCardId = null;
		clearCardFields();
	} else if (mode === "edit") {
		const card = getSelectedCard();

		if (!card) {
			app.cardFormMode = "view";
			fillCardFieldsFromSelection();
		} else {
			app.editingCardId = card.id;
			fillCardFieldsFromSelection();
		}
	} else {
		app.editingCardId = null;
		fillCardFieldsFromSelection();
	}

	applyCardFormChrome();

	if (app.cardFormMode === "add") {
		elements.newCardQuestionInput.focus();
	} else if (app.cardFormMode === "edit") {
		elements.cardQuestionInput.focus();
	}
}

export function renderManageModal() {
	const sets = getSetList();
	const selectedId =
		(app.manageSelectedSetId &&
			app.library.sets[app.manageSelectedSetId] &&
			app.manageSelectedSetId) ||
		app.currentSetId;
	app.manageSelectedSetId = selectedId || "";
	elements.manageSetList.innerHTML = "";

	if (!sets.length) {
		const empty = document.createElement("p");
		empty.className = "modal-lead";
		empty.textContent =
			"No sets stored yet. Upload a JSON file or create an empty set.";
		elements.manageSetList.appendChild(empty);
	} else {
		sets.forEach((set) => {
			const button = document.createElement("button");
			button.type = "button";
			button.className = `set-list-item${
				set.id === app.manageSelectedSetId ? " active" : ""
			}`;
			button.dataset.setId = set.id;

			const name = document.createElement("span");
			name.textContent = set.name;

			const count = document.createElement("span");
			count.className = "count";
			count.textContent = String(set.cards.length);

			button.append(name, count);
			elements.manageSetList.appendChild(button);
		});
	}

	const selected = app.library.sets[app.manageSelectedSetId];

	if (document.activeElement !== elements.manageSetName) {
		elements.manageSetName.value = selected ? selected.name : "";
	}

	elements.manageSetName.disabled = !selected;
	elements.renameSetButton.disabled = !selected;
	elements.downloadSetButton.disabled = !selected;
	elements.deleteSetButton.disabled = !selected;
	elements.manageCardsHeading.textContent = selected
		? `Cards in ${selected.name} (${selected.cards.length})`
		: "Cards";

	populateCardSelect(selected);

	if (app.cardFormMode === "edit" && !getSelectedCard()) {
		app.cardFormMode = "view";
		app.editingCardId = null;
	}

	if (app.cardFormMode === "view") {
		fillCardFieldsFromSelection();
	}

	applyCardFormChrome();
}

function populateCardSelect(selected) {
	elements.manageCardSelect.innerHTML = "";

	if (!selected || !selected.cards.length) {
		const option = document.createElement("option");
		option.value = "";
		option.textContent = "No cards";
		elements.manageCardSelect.appendChild(option);
		app.manageSelectedCardId = null;
		return;
	}

	const stillSelected = selected.cards.some(
		(card) => card.id === app.manageSelectedCardId,
	);

	if (!stillSelected) {
		app.manageSelectedCardId = selected.cards[0].id;
	}

	selected.cards.forEach((card) => {
		const option = document.createElement("option");
		option.value = String(card.id);
		option.textContent = cardOptionLabel(card);
		elements.manageCardSelect.appendChild(option);
	});

	elements.manageCardSelect.value = String(app.manageSelectedCardId);
}

function cardOptionLabel(card) {
	const question = String(card.question || "").replace(/\s+/g, " ").trim();
	const truncated =
		question.length > 72 ? `${question.slice(0, 69)}…` : question;
	return `${card.category} — ${truncated}`;
}

function getSelectedCard() {
	const selected = app.library.sets[app.manageSelectedSetId];

	if (!selected) {
		return null;
	}

	return (
		selected.cards.find((card) => card.id === app.manageSelectedCardId) || null
	);
}

function clearCardFields() {
	elements.cardCategoryInput.value = "";
	elements.cardQuestionInput.value = "";
	elements.newCardQuestionInput.value = "";
	elements.cardAnswerInput.value = "";
}

function fillCardFieldsFromSelection() {
	const card = getSelectedCard();
	elements.cardCategoryInput.value = card ? card.category : "";
	elements.cardQuestionInput.value = card ? card.question : "";
	elements.cardAnswerInput.value = card ? card.answer : "";
}

function applyCardFormChrome() {
	const selected = app.library.sets[app.manageSelectedSetId];
	const card = getSelectedCard();
	const isView = app.cardFormMode === "view";
	const isAdd = app.cardFormMode === "add";
	const isEdit = app.cardFormMode === "edit";
	const readOnly = isView;

	elements.cardCategoryInput.readOnly = readOnly;
	elements.cardQuestionInput.readOnly = readOnly;
	elements.cardAnswerInput.readOnly = readOnly;

	elements.manageCardSelect.disabled = !selected || !selected.cards.length || isAdd;
	elements.cardSelectField.hidden = isAdd;
	elements.newCardQuestionField.hidden = !isAdd;
	elements.cardQuestionField.hidden = isAdd;

	elements.cardViewActions.hidden = !isView;
	elements.cardEditActions.hidden = isView;
	elements.editCardButton.disabled = !card;
	elements.deleteCardButton.disabled = !card;
	elements.newCardButton.disabled = !selected;
	elements.saveCardButton.disabled = !selected;

	if (isAdd) {
		elements.saveCardButton.textContent = "Add card";
		elements.cardFormTitle.textContent = "New card";
	} else if (isEdit) {
		elements.saveCardButton.textContent = "Save card";
		elements.cardFormTitle.textContent = "Edit card";
	} else {
		elements.cardFormTitle.textContent = "Card";
	}
}
