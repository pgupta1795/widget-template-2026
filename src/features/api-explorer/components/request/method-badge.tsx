import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { HttpMethod } from "../../openapi/types";

const methodVariant: Record<
	HttpMethod,
	"success" | "info" | "warning" | "destructive"
> = {
	GET: "success",
	POST: "info",
	PUT: "warning",
	PATCH: "warning",
	DELETE: "destructive",
};

export function MethodBadge({
	method,
	className,
	/** @deprecated — kept for backward compat; ignored */
	variant: _variant,
	size = "default",
}: {
	method: HttpMethod;
	className?: string;
	variant?: string;
	size?: "sm" | "default";
}) {
	return (
		<Badge
			variant={methodVariant[method] ?? "secondary"}
			className={cn(
				"font-mono font-bold tracking-wide rounded-full shrink-0",
				size === "sm"
					? "text-[9px] px-1.5 min-w-[32px] h-4"
					: "text-[10px] px-2 min-w-[40px]",
				className,
			)}
		>
			{method}
		</Badge>
	);
}
