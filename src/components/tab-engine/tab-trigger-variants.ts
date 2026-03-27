import { cva } from "class-variance-authority";

export const tabTriggerVariants = cva(
	"inline-flex items-center gap-1.5 whitespace-nowrap px-3 py-1.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50",
	{
		variants: {
			indicatorStyle: {
				underline: [
					"border-b-2 border-transparent rounded-none",
					"data-active:border-primary data-active:text-foreground",
					"text-muted-foreground hover:text-foreground",
				],
				filled: [
					"rounded-md",
					"data-active:bg-primary data-active:text-primary-foreground data-active:shadow-sm",
					"text-muted-foreground hover:text-foreground hover:bg-muted",
				],
				pill: [
					"rounded-full",
					"data-active:bg-primary data-active:text-primary-foreground",
					"text-muted-foreground hover:text-foreground hover:bg-muted",
				],
			},
		},
		defaultVariants: {
			indicatorStyle: "underline",
		},
	},
);
