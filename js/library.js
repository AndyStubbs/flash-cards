import {
	app,
	createDefaultState,
	createEmptyLibrary,
	lastSetStorageKey,
	libraryStorageKey,
	loadState,
	migrateLegacyProgress,
	storageKeyPrefix,
} from "./state.js";
import { elements } from "./elements.js";
import { showToast } from "./toast.js";
import { render, renderCategories, syncNav } from "./render.js";
import { openManageModal, renderManageModal } from "./manage.js";

export function getSetList() {
	return Object.values(app.library.sets).sort((a, b) =>
		a.name.localeCompare(b.name, undefined, { sensitivity: "base" }),
	);
}

export function loadLibrary() {
	app.library = createEmptyLibrary();

	try {
		const saved = JSON.parse(localStorage.getItem(libraryStorageKey));

		if (saved && saved.sets && typeof saved.sets === "object") {
			app.library.sets = saved.sets;
			app.library.activeSetId =
				typeof saved.activeSetId === "string" ? saved.activeSetId : "";
		}
	} catch (error) {
		console.warn("Could not load flash-card library.", error);
	}

	const lastSet = localStorage.getItem(lastSetStorageKey);

	if (!app.library.activeSetId && lastSet && app.library.sets[lastSet]) {
		app.library.activeSetId = lastSet;
	}
}

export function saveLibrary() {
	app.library.activeSetId = app.currentSetId;
	localStorage.setItem(libraryStorageKey, JSON.stringify(app.library));

	if (app.currentSetId) {
		localStorage.setItem(lastSetStorageKey, app.currentSetId);
	} else {
		localStorage.removeItem(lastSetStorageKey);
	}
}

function slugify(value) {
	return (
		String(value || "")
			.toLowerCase()
			.replace(/[^a-z0-9]+/g, "-")
			.replace(/^-+|-+$/g, "")
			.slice(0, 40) || "set"
	);
}

function uniqueSetId(name) {
	const base = slugify(name);
	let id = base;
	let n = 2;

	while (app.library.sets[id]) {
		id = `${base}-${n++}`;
	}

	return id;
}

function uniqueSetName(name) {
	const base = (name && name.trim()) || "Untitled set";
	const existing = new Set(Object.values(app.library.sets).map((set) => set.name));

	if (!existing.has(base)) {
		return base;
	}

	let n = 2;

	while (existing.has(`${base} (${n})`)) {
		n += 1;
	}

	return `${base} (${n})`;
}

function filenameStem(filename) {
	return String(filename || "")
		.replace(/\.json$/i, "")
		.replace(/[_-]+/g, " ")
		.trim();
}

function normalizeImportedCards(rawCards) {
	if (!Array.isArray(rawCards)) {
		throw new Error("JSON must include a cards array.");
	}

	const imported = [];

	rawCards.forEach((item, index) => {
		if (!item || typeof item !== "object") {
			return;
		}

		const question = String(item.question || "").trim();
		const answer = String(item.answer || "").trim();

		if (!question || !answer) {
			return;
		}

		imported.push({
			id: index + 1,
			category: String(item.category || "").trim() || "General",
			question,
			answer,
		});
	});

	if (!imported.length) {
		throw new Error("No valid cards found. Each card needs a question and answer.");
	}

	return imported;
}

function parseSetJson(text, filename) {
	let data;

	try {
		data = JSON.parse(text);
	} catch (error) {
		throw new Error("That file is not valid JSON.");
	}

	if (!data || typeof data !== "object" || Array.isArray(data)) {
		throw new Error("JSON must be an object with a cards array.");
	}

	const importedCards = normalizeImportedCards(data.cards);
	const name =
		(typeof data.name === "string" && data.name.trim()) ||
		filenameStem(filename) ||
		"Untitled set";

	return { name, cards: importedCards };
}

export function populateSetSelect() {
	const sets = getSetList();
	elements.setSelect.innerHTML = "";

	if (!sets.length) {
		const option = document.createElement("option");
		option.value = "";
		option.textContent = "No sets yet";
		elements.setSelect.appendChild(option);
		elements.setSelect.disabled = true;
		return;
	}

	elements.setSelect.disabled = false;

	sets.forEach((set) => {
		const option = document.createElement("option");
		option.value = set.id;
		option.textContent = `${set.name} (${set.cards.length})`;
		elements.setSelect.appendChild(option);
	});

	if (app.currentSetId && app.library.sets[app.currentSetId]) {
		elements.setSelect.value = app.currentSetId;
	}
}

export function activateSet(setId, announce) {
	const set = app.library.sets[setId];

	if (!set) {
		showToast("Could not load that flash-card set.");
		return;
	}

	app.currentSetId = setId;
	app.manageSelectedSetId = setId;
	app.storageKey = `${storageKeyPrefix}:${setId}`;
	migrateLegacyProgress(setId);
	app.cards = set.cards.map((card) => ({ ...card }));
	saveLibrary();
	populateSetSelect();
	renderCategories();
	loadState();
	syncNav();
	render();
	renderManageModal();

	if (announce) {
		showToast(`Loaded ${set.name}.`);
	}
}

export function clearActiveSet() {
	app.currentSetId = "";
	app.manageSelectedSetId = "";
	app.cards = [];
	app.storageKey = storageKeyPrefix;
	app.state = createDefaultState();
	elements.searchInput.value = "";
	saveLibrary();
	populateSetSelect();
	renderCategories();
	syncNav();
	render();
	renderManageModal();
}

function createSetFromParsed(parsed) {
	const name = uniqueSetName(parsed.name);
	const id = uniqueSetId(name);

	app.library.sets[id] = {
		id,
		name,
		cards: parsed.cards.map((card, index) => ({
			id: index + 1,
			category: card.category,
			question: card.question,
			answer: card.answer,
		})),
	};
	saveLibrary();
	activateSet(id);
	showToast(`Created ${name}.`);
}

export async function createSetFromFile(file) {
	try {
		const text = await file.text();
		const parsed = parseSetJson(text, file.name);
		createSetFromParsed(parsed);
	} catch (error) {
		console.warn(error);
		showToast(error.message || "Could not import that file.");
	}
}

export function downloadSet(setId) {
	const set = app.library.sets[setId];

	if (!set) {
		showToast("Choose a set to download.");
		return;
	}

	const payload = {
		name: set.name,
		cards: set.cards.map((card) => ({
			category: card.category,
			question: card.question,
			answer: card.answer,
		})),
	};
	const blob = new Blob([`${JSON.stringify(payload, null, "\t")}\n`], {
		type: "application/json",
	});
	const url = URL.createObjectURL(blob);
	const link = document.createElement("a");
	link.href = url;
	link.download = `${slugify(set.name)}.json`;
	document.body.appendChild(link);
	link.click();
	link.remove();
	URL.revokeObjectURL(url);
	showToast(`Downloaded ${set.name}.`);
}

export function renameSet(setId, nextName) {
	const set = app.library.sets[setId];
	const name = String(nextName || "").trim();

	if (!set || !name) {
		showToast("Enter a set name.");
		return;
	}

	set.name = name;
	saveLibrary();
	populateSetSelect();
	renderManageModal();
	showToast("Set renamed.");
}

export function deleteSet(setId) {
	const set = app.library.sets[setId];

	if (!set) {
		return;
	}

	const confirmed = confirm(
		`Delete “${set.name}” and its cards? This cannot be undone.`,
	);

	if (!confirmed) {
		return;
	}

	delete app.library.sets[setId];
	localStorage.removeItem(`${storageKeyPrefix}:${setId}`);

	const remaining = getSetList();

	if (setId === app.currentSetId) {
		if (remaining[0]) {
			activateSet(remaining[0].id);
		} else {
			clearActiveSet();
		}
	} else {
		saveLibrary();
		populateSetSelect();

		if (app.manageSelectedSetId === setId) {
			app.manageSelectedSetId = app.currentSetId;
		}

		renderManageModal();
	}

	showToast(`Deleted ${set.name}.`);
}

function persistSetCards(setId, nextCards) {
	const set = app.library.sets[setId];

	if (!set) {
		return;
	}

	set.cards = nextCards.map((card) => ({ ...card }));
	saveLibrary();

	if (setId === app.currentSetId) {
		app.cards = set.cards.map((card) => ({ ...card }));
		renderCategories();
		render();
	}

	populateSetSelect();
	renderManageModal();
}

function nextCardId(set) {
	return set.cards.reduce((max, card) => Math.max(max, Number(card.id) || 0), 0) + 1;
}

export function addCard(setId, draft) {
	const set = app.library.sets[setId];

	if (!set) {
		showToast("Create or select a set first.");
		return false;
	}

	const category = String(draft.category || "").trim() || "General";
	const question = String(draft.question || "").trim();
	const answer = String(draft.answer || "").trim();

	if (!question || !answer) {
		showToast("Question and answer are required.");
		return false;
	}

	const id = nextCardId(set);
	app.manageSelectedCardId = id;
	app.editingCardId = null;
	app.cardFormMode = "view";
	persistSetCards(setId, [
		...set.cards,
		{
			id,
			category,
			question,
			answer,
		},
	]);
	showToast("Card added.");
	return true;
}

export function updateCard(setId, cardId, draft) {
	const set = app.library.sets[setId];

	if (!set) {
		return false;
	}

	const category = String(draft.category || "").trim() || "General";
	const question = String(draft.question || "").trim();
	const answer = String(draft.answer || "").trim();

	if (!question || !answer) {
		showToast("Question and answer are required.");
		return false;
	}

	app.cardFormMode = "view";
	persistSetCards(
		setId,
		set.cards.map((card) =>
			card.id === cardId ? { ...card, category, question, answer } : card,
		),
	);
	showToast("Card updated.");
	return true;
}

export function deleteCard(setId, cardId) {
	const set = app.library.sets[setId];

	if (!set) {
		return;
	}

	if (app.manageSelectedCardId === cardId) {
		app.manageSelectedCardId = null;
	}

	app.editingCardId = null;
	app.cardFormMode = "view";
	persistSetCards(
		setId,
		set.cards.filter((card) => card.id !== cardId),
	);

	showToast("Card deleted.");
}

export function createBlankSet() {
	const name = uniqueSetName("Untitled set");
	const id = uniqueSetId(name);
	app.library.sets[id] = { id, name, cards: [] };
	saveLibrary();
	activateSet(id);
	openManageModal();
	showToast("Created an empty set.");
}

export function openFilePicker() {
	elements.setFileInput.click();
}

export function handleDroppedFiles(fileList) {
	const files = Array.from(fileList || []);
	const file =
		files.find(
			(item) => item.type === "application/json" || /\.json$/i.test(item.name),
		) || files[0];

	if (!file) {
		showToast("Drop a .json flash-card file.");
		return;
	}

	createSetFromFile(file);
}

export function setDropHighlight(on) {
	elements.setPicker.classList.toggle("drop-target", on);
	elements.manageDropzone.classList.toggle("drop-target", on);
	elements.emptyState.classList.toggle("drop-target", on);
	elements.dragOverlay.classList.toggle("visible", on);
}

export function init() {
	loadLibrary();
	populateSetSelect();

	const lastSet = localStorage.getItem(lastSetStorageKey);
	const preferred =
		(app.library.activeSetId &&
			app.library.sets[app.library.activeSetId] &&
			app.library.activeSetId) ||
		(lastSet && app.library.sets[lastSet] && lastSet) ||
		(getSetList()[0] && getSetList()[0].id);

	if (!preferred) {
		clearActiveSet();
		return;
	}

	activateSet(preferred);
}
