import type { ClassValue } from "clsx";
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
	return twMerge(clsx(inputs));
}

export function highlightJson(obj: any): string {
	const json = typeof obj === "string" ? obj : JSON.stringify(obj, null, 2);
	if (!json) return "";

	return json
		.replace(/&/g, "&amp;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;")
		.replace(
			/"([^"\\]*(\\.[^"\\]*)*)"\s*:/g,
			'"<span class="json-key">$1</span>":',
		)
		.replace(
			/:\s*"([^"\\]*(\\.[^"\\]*)*)"/g,
			': "<span class="json-string">$1</span>"',
		)
		.replace(
			/:\s*(-?\d+\.?\d*([eE][+-]?\d+)?)/g,
			': <span class="json-number">$1</span>',
		)
		.replace(/:\s*(true|false)/g, ': <span class="json-boolean">$1</span>')
		.replace(/:\s*(null)/g, ': <span class="json-null">$1</span>');
}

export function formatBytes(bytes: number): string {
	if (bytes === 0) return "0 B";
	const k = 1024;
	const sizes = ["B", "KB", "MB"];
	const i = Math.floor(Math.log(bytes) / Math.log(k));
	return parseFloat((bytes / k ** i).toFixed(1)) + " " + sizes[i];
}
