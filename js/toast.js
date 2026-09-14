import { elements } from "./elements.js";

let toastTimer;

export function showToast(message) {
	clearTimeout(toastTimer);
	elements.toast.textContent = message;
	elements.toast.classList.add("show");

	toastTimer = setTimeout(() => {
		elements.toast.classList.remove("show");
	}, 2200);
}
