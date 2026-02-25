export function mapResponse(
	data: unknown,
	mapping: Record<string, string> | undefined,
	defaultValues: Record<string, unknown> | undefined,
): Record<string, unknown>[] {
	const items = extractItems(data);
	if (!mapping && !defaultValues) return items;

	return items.map((item) => {
		const mapped = defaultValues ? { ...defaultValues } : {};

		for (const [key, value] of Object.entries(item)) {
			const cleanKey = key.replace(/^ds6w:|^ds6wg:/, "");
			const mappedKey = mapping?.[key] ?? mapping?.[cleanKey] ?? cleanKey;
			mapped[mappedKey] = value;
		}

		return mapped;
	});
}

function extractItems(data: unknown): Record<string, unknown>[] {
	if (Array.isArray(data)) return data;
	if (data && typeof data === "object") {
		const obj = data as Record<string, unknown>;
		if (Array.isArray(obj.data)) return obj.data;
		if (Array.isArray(obj.results)) return obj.results;
		if (Array.isArray(obj.member)) return obj.member;
		if (Array.isArray(obj.elements)) return obj.elements;
		return [obj];
	}
	return [];
}

export function mapSingleResponse(
	data: unknown,
	mapping: Record<string, string> | undefined,
	defaultValues: Record<string, unknown> | undefined,
): Record<string, unknown> {
	const items = mapResponse(data, mapping, defaultValues);
	return items[0] ?? {};
}
