import { useCallback, useEffect, useState } from "react";

const STORAGE_KEY = "ae_active_spec_ids";

function loadActiveIds(): Set<string> {
	try {
		const stored = localStorage.getItem(STORAGE_KEY);
		return stored ? new Set(JSON.parse(stored)) : new Set();
	} catch {
		return new Set();
	}
}

export function useActiveSpecs() {
	const [activeIds, setActiveIds] = useState<Set<string>>(() =>
		loadActiveIds(),
	);

	useEffect(() => {
		localStorage.setItem(STORAGE_KEY, JSON.stringify(Array.from(activeIds)));
	}, [activeIds]);

	const activate = useCallback((id: string) => {
		setActiveIds((prev) => new Set([...prev, id]));
	}, []);

	const deactivate = useCallback((id: string) => {
		setActiveIds((prev) => {
			const next = new Set(prev);
			next.delete(id);
			return next;
		});
	}, []);

	const toggle = useCallback((id: string) => {
		setActiveIds((prev) => {
			const next = new Set(prev);
			next.has(id) ? next.delete(id) : next.add(id);
			return next;
		});
	}, []);

	const isActive = useCallback((id: string) => activeIds.has(id), [activeIds]);

	return { activeIds, activate, deactivate, toggle, isActive };
}
