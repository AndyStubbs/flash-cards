import { elements } from "./elements.js";

export const storageKeyPrefix = "interview-flashcards-v2";
export const lastSetStorageKey = `${storageKeyPrefix}:last-set`;
export const libraryStorageKey = `${storageKeyPrefix}:library`;
export const legacyStorageKey = storageKeyPrefix;

export function createDefaultState() {
	return {
		filter: "all",
		category: "",
		search: "",
		currentIndex: 0,
		flipped: false,
		mode: "review",
		status: {},
		starred: {},
		quiz: {
			index: 0,
			score: 0,
			answered: false,
			questions: [],
		},
	};
}

export function createEmptyLibrary() {
	return {
		version: 1,
		activeSetId: "",
		sets: {},
	};
}

export const app = {
	storageKey: storageKeyPrefix,
	cards: [],
	currentSetId: "",
	library: createEmptyLibrary(),
	manageSelectedSetId: "",
	manageSelectedCardId: null,
	cardFormMode: "view",
	editingCardId: null,
	dragDepth: 0,
	state: createDefaultState(),
};

export function loadState() {
	app.state = createDefaultState();

	try {
		const saved = JSON.parse(localStorage.getItem(app.storageKey));

		if (saved) {
			app.state = {
				...app.state,
				...saved,
				quiz: {
					...app.state.quiz,
					...(saved.quiz || {}),
				},
			};
		}

		if (
			app.state.category &&
			!app.cards.some((card) => card.category === app.state.category)
		) {
			app.state.category = "";
		}

		elements.searchInput.value = app.state.search || "";
	} catch (error) {
		console.warn("Could not load saved progress.", error);
	}
}

export function saveState() {
	if (!app.currentSetId) {
		return;
	}

	localStorage.setItem(app.storageKey, JSON.stringify(app.state));
}

export function migrateLegacyProgress(setId) {
	if (setId !== "flash-initial") {
		return;
	}

	const namespacedKey = `${storageKeyPrefix}:${setId}`;

	if (localStorage.getItem(namespacedKey)) {
		return;
	}

	const legacy = localStorage.getItem(legacyStorageKey);

	if (legacy) {
		localStorage.setItem(namespacedKey, legacy);
	}
}
