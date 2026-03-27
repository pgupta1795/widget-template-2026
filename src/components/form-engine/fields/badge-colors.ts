// src/components/form-engine/fields/badge-colors.ts
// Maps color token strings to Tailwind classes
export const badgeColorClasses: Record<string, string> = {
	blue: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
	yellow:
		"bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
	green: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
	red: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
	gray: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200",
	purple:
		"bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
	orange:
		"bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200",
};

export function getBadgeClasses(
	colorMap: Record<string, string> | undefined,
	value: string,
): string {
	const token = colorMap?.[value] ?? "gray";
	return badgeColorClasses[token] ?? badgeColorClasses.gray;
}
