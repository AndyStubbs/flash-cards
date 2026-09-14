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
	elements.cardCategoryInput.value = "";
	elements.cardQuestionInput.value = "";
	elements.cardAnswerInput.value = "";
	elements.saveCardButton.textContent = "Add card";
	elements.cancelCardEditButton.hidden = true;
	elements.cardFormTitle.textContent = "Add card";
}

export function startEditCard(card) {
	app.editingCardId = card.id;
	elements.cardCategoryInput.value = card.category;
	elements.cardQuestionInput.value = card.question;
	elements.cardAnswerInput.value = card.answer;
	elements.saveCardButton.textContent = "Save card";
	elements.cancelCardEditButton.hidden = false;
	elements.cardFormTitle.textContent = "Edit card";
	elements.cardQuestionInput.focus();
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
	elements.saveCardButton.disabled = !selected;
	elements.manageCardsHeading.textContent = selected
		? `Cards in ${selected.name} (${selected.cards.length})`
		: "Cards";
	elements.manageCardList.innerHTML = "";

	if (!selected) {
		return;
	}

	if (!selected.cards.length) {
		const empty = document.createElement("p");
		empty.className = "modal-lead";
		empty.textContent = "No cards yet. Add one below.";
		elements.manageCardList.appendChild(empty);
		return;
	}

	selected.cards.forEach((card) => {
		const item = document.createElement("div");
		item.className = "card-manager-item";

		const badge = document.createElement("span");
		badge.className = "badge";
		badge.textContent = card.category;

		const question = document.createElement("p");
		question.textContent = card.question;

		const actions = document.createElement("div");
		actions.className = "modal-actions";

		const editButton = document.createElement("button");
		editButton.className = "small-button";
		editButton.type = "button";
		editButton.dataset.editCard = String(card.id);
		editButton.textContent = "Edit";

		const deleteButton = document.createElement("button");
		deleteButton.className = "small-button";
		deleteButton.type = "button";
		deleteButton.dataset.deleteCard = String(card.id);
		deleteButton.textContent = "Delete";

		actions.append(editButton, deleteButton);
		item.append(badge, question, actions);
		elements.manageCardList.appendChild(item);
	});
}
