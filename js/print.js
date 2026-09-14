import { app } from "./state.js";
import { elements } from "./elements.js";
import { splitIntoSentences } from "./render.js";
import { showToast } from "./toast.js";

const PRINT_GRID_COLUMNS = 2;
const PRINT_GRID_ROWS = 4;
const PRINT_CARDS_PER_PAGE = PRINT_GRID_COLUMNS * PRINT_GRID_ROWS;
const PRINT_QUESTION_FIT = { baseSizePt: 14, minSizePt: 9, stepPt: 0.5 };
const PRINT_ANSWER_FIT = { baseSizePt: 10, minSizePt: 7, stepPt: 0.4 };

function chunkCardsForPrint(list, size) {
	const groups = [];

	for (let start = 0; start < list.length; start += size) {
		groups.push(list.slice(start, start + size));
	}

	const lastGroup = groups[groups.length - 1];

	if (lastGroup) {
		while (lastGroup.length < size) {
			lastGroup.push(null);
		}
	}

	return groups;
}

/*
Long-edge (book-style) duplex printing flips a sheet about its
vertical axis: row position stays the same, but left/right column
position swaps. So the back page's cards must be reordered within
each row (not the whole page) for an answer to land directly
behind its matching question after the sheet is flipped and cut.
*/
function mirrorColumnsForBack(group, columns) {
	const mirrored = [];

	for (let start = 0; start < group.length; start += columns) {
		const row = group.slice(start, start + columns);
		mirrored.push(...row.reverse());
	}

	return mirrored;
}

function createPrintCategoryTag(card) {
	const category = document.createElement("div");
	category.className = "print-cell-category";
	category.textContent = card.category;
	return category;
}

function createBlankCell() {
	const cell = document.createElement("div");
	cell.className = "print-cell print-cell-blank";
	return cell;
}

function createQuestionCell(card) {
	if (!card) {
		return createBlankCell();
	}

	const article = document.createElement("article");
	article.className = "print-cell";

	const heading = document.createElement("h2");
	heading.className = "print-cell-question-text";
	heading.textContent = card.question;

	article.append(createPrintCategoryTag(card), heading);

	return article;
}

function createAnswerCell(card) {
	if (!card) {
		return createBlankCell();
	}

	const article = document.createElement("article");
	article.className = "print-cell";

	const list = document.createElement("ul");
	list.className = "print-cell-answer-list";

	splitIntoSentences(card.answer).forEach((sentence) => {
		const item = document.createElement("li");
		item.textContent = sentence;
		list.appendChild(item);
	});

	article.append(createPrintCategoryTag(card), list);

	return article;
}

function fitCellTextToHeight(textElement, config) {
	let size = config.baseSizePt;
	textElement.style.fontSize = `${size}pt`;

	while (size > config.minSizePt && textElement.scrollHeight > textElement.clientHeight) {
		size = Math.max(config.minSizePt, size - config.stepPt);
		textElement.style.fontSize = `${size}pt`;
	}
}

function createPrintGridPage(group, side) {
	const page = document.createElement("section");
	page.className = "print-page";

	const grid = document.createElement("div");
	grid.className = "print-grid";

	const slots = side === "back" ? mirrorColumnsForBack(group, PRINT_GRID_COLUMNS) : group;

	slots.forEach((card) => {
		grid.appendChild(side === "back" ? createAnswerCell(card) : createQuestionCell(card));
	});

	page.appendChild(grid);

	return page;
}

/*
Builds interleaved front (questions) / back (answers) pages sized
for duplex printing and cutting into individual flashcards. Always
prints the full deck, ignoring the current filter/search/category.
*/
export function buildPrintDeck() {
	if (!app.cards.length) {
		showToast("There are no cards to print.");
		return false;
	}

	elements.printDeck.innerHTML = "";

	const groups = chunkCardsForPrint(app.cards, PRINT_CARDS_PER_PAGE);

	groups.forEach((group) => {
		elements.printDeck.appendChild(createPrintGridPage(group, "front"));
		elements.printDeck.appendChild(createPrintGridPage(group, "back"));
	});

	elements.printDeck
		.querySelectorAll(".print-cell-question-text")
		.forEach((el) => fitCellTextToHeight(el, PRINT_QUESTION_FIT));

	elements.printDeck
		.querySelectorAll(".print-cell-answer-list")
		.forEach((el) => fitCellTextToHeight(el, PRINT_ANSWER_FIT));

	return true;
}
