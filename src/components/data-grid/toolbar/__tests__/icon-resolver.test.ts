// src/components/data-grid/toolbar/__tests__/icon-resolver.test.ts
import { describe, expect, it } from "vitest";
import { resolveLucideIcon } from "../icon-resolver";
import { Download, AlertCircle } from "lucide-react";

describe("resolveLucideIcon", () => {
	it("resolves a known lucide icon name to a component", () => {
		const icon = resolveLucideIcon("Download");
		expect(icon).toBe(Download);
	});

	it("falls back to AlertCircle for unknown icon names", () => {
		const icon = resolveLucideIcon("NonExistentIcon_XYZ");
		expect(icon).toBe(AlertCircle);
	});

	it("falls back to AlertCircle for empty string", () => {
		const icon = resolveLucideIcon("");
		expect(icon).toBe(AlertCircle);
	});

	it("resolves Search icon", () => {
		const { Search } = require("lucide-react");
		const icon = resolveLucideIcon("Search");
		expect(icon).toBe(Search);
	});

	it("resolves RefreshCw icon", () => {
		const { RefreshCw } = require("lucide-react");
		const icon = resolveLucideIcon("RefreshCw");
		expect(icon).toBe(RefreshCw);
	});
});
