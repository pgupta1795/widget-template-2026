import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useApiExplorer } from "@/features/api-explorer/context/api-explorer-context";
import { formatBytes, highlightJson } from "@/lib/utils";
import {
	Braces,
	Check,
	CheckCircle2,
	Copy,
	Database,
	List,
	Timer,
	XCircle,
} from "lucide-react";
import { useState } from "react";

type ViewMode = "pretty" | "raw";

function StatusBadge({
	status,
	statusText,
}: {
	status: number;
	statusText: string;
}) {
	if (status === 0) {
		return (
			<Badge variant="destructive" className="font-mono text-xs gap-1">
				<XCircle size={11} /> Network Error
			</Badge>
		);
	}
	if (status < 300) {
		return (
			<Badge variant="success" className="font-mono text-xs gap-1">
				<CheckCircle2 size={11} /> {status} {statusText}
			</Badge>
		);
	}
	if (status < 400) {
		return (
			<Badge variant="warning" className="font-mono text-xs gap-1">
				{status} {statusText}
			</Badge>
		);
	}
	if (status < 500) {
		return (
			<Badge variant="warning" className="font-mono text-xs gap-1">
				<XCircle size={11} /> {status} {statusText}
			</Badge>
		);
	}
	return (
		<Badge variant="destructive" className="font-mono text-xs gap-1">
			<XCircle size={11} /> {status} {statusText}
		</Badge>
	);
}

function HeadersTable({ headers }: { headers: Record<string, string> }) {
	const [copiedKey, setCopiedKey] = useState<string | null>(null);
	const entries = Object.entries(headers);

	const copyValue = (key: string, value: string) => {
		navigator.clipboard.writeText(value);
		setCopiedKey(key);
		setTimeout(() => setCopiedKey(null), 1500);
	};

	if (entries.length === 0) {
		return (
			<p className="text-xs text-muted-foreground text-center py-8">
				No headers returned
			</p>
		);
	}

	return (
		<div className="divide-y divide-border/50">
			{entries.map(([key, value]) => (
				<div
					key={key}
					className="group grid grid-cols-[auto_1fr_28px] gap-3 px-4 py-2 hover:bg-muted/20 transition-colors items-start"
				>
					<span className="font-mono text-xs font-semibold text-primary/80 shrink-0 pt-px leading-5 min-w-35 max-w-50 truncate">
						{key}
					</span>
					<span className="font-mono text-xs text-foreground/80 break-all leading-5">
						{value}
					</span>
					<Button
						variant="ghost"
						size="icon"
						onClick={() => copyValue(key, value)}
						className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-foreground shrink-0"
					>
						{copiedKey === key ? (
							<Check size={11} className="text-emerald-500" />
						) : (
							<Copy size={11} />
						)}
					</Button>
				</div>
			))}
		</div>
	);
}

export function ResponsePanel() {
	const { response, loading } = useApiExplorer();
	const [viewMode, setViewMode] = useState<ViewMode>("pretty");
	const [copied, setCopied] = useState(false);

	const copyResponse = () => {
		if (!response) return;
		const text =
			typeof response.data === "string"
				? response.data
				: JSON.stringify(response.data, null, 2);
		navigator.clipboard.writeText(text);
		setCopied(true);
		setTimeout(() => setCopied(false), 2000);
	};

	if (loading) {
		return (
			<div className="flex flex-col items-center justify-center h-full gap-3">
				<div className="flex gap-1.5">
					{[0, 0.2, 0.4].map((delay, i) => (
						<div
							key={i}
							className="w-2 h-2 rounded-full bg-primary animate-pulse-dot"
							style={{ animationDelay: `${delay}s` }}
						/>
					))}
				</div>
				<span className="text-sm text-muted-foreground">Sending request…</span>
			</div>
		);
	}

	if (!response) {
		return (
			<div className="flex flex-col items-center justify-center h-full text-muted-foreground/30">
				<Database size={36} className="mb-3" />
				<p className="text-sm font-medium text-muted-foreground/50">
					No response yet
				</p>
				<p className="text-xs mt-1 text-muted-foreground/40">
					Send a request to see results
				</p>
			</div>
		);
	}

	const headerCount = Object.keys(response.headers).length;

	return (
		<div className="flex flex-col h-full">
			{/* Status bar */}
			<div className="flex items-center gap-3 px-4 py-2 border-b border-border shrink-0 bg-card/30">
				<StatusBadge
					status={response.status}
					statusText={response.statusText}
				/>

				<Separator orientation="vertical" className="h-4" />

				<div className="flex items-center gap-1 text-xs text-muted-foreground">
					<Timer size={12} />
					<span className="tabular-nums font-mono">{response.time}ms</span>
				</div>

				<div className="flex items-center gap-1 text-xs text-muted-foreground">
					<span className="tabular-nums font-mono">
						{formatBytes(response.size)}
					</span>
				</div>

				<div className="ml-auto">
					<Button
						variant="ghost"
						size="sm"
						onClick={copyResponse}
						className="h-7 px-2 gap-1.5 text-xs text-muted-foreground hover:text-foreground"
					>
						{copied ? (
							<Check size={12} className="text-emerald-500" />
						) : (
							<Copy size={12} />
						)}
						{copied ? "Copied" : "Copy"}
					</Button>
				</div>
			</div>

			{/* Tabs */}
			<Tabs
				defaultValue="body"
				className="flex-1 flex flex-col gap-0 overflow-hidden"
			>
				<TabsList
					variant="line"
					className="w-full rounded-none border-b border-border h-9 px-2 justify-start gap-0 shrink-0"
				>
					<TabsTrigger
						value="body"
						className="text-[11px] gap-1.5 px-3 data-[state=active]:bg-primary/10 data-[state=active]:text-primary transition-colors"
					>
						<Braces size={12} /> Body
					</TabsTrigger>
					<TabsTrigger
						value="headers"
						className="text-[11px] gap-1.5 px-3 data-[state=active]:bg-primary/10 data-[state=active]:text-primary transition-colors"
					>
						<List size={12} /> Headers
						<Badge
							variant="secondary"
							className="text-[9px] px-1 h-3.5 min-w-0"
						>
							{headerCount}
						</Badge>
					</TabsTrigger>
				</TabsList>

				<TabsContent
					value="body"
					className="flex-1 overflow-hidden mt-0 flex flex-col"
				>
					{/* View mode toggle */}
					<div className="flex items-center gap-1 px-3 py-1.5 border-b border-border/50 shrink-0">
						<span className="text-[10px] text-muted-foreground/60 mr-1">
							View:
						</span>
						{(["pretty", "raw"] as const).map((mode) => (
							<button
								key={mode}
								onClick={() => setViewMode(mode)}
								className={`px-2 py-0.5 rounded text-[10px] font-medium capitalize transition-colors cursor-pointer ${
									viewMode === mode
										? "bg-accent text-foreground"
										: "text-muted-foreground hover:text-foreground"
								}`}
							>
								{mode}
							</button>
						))}
					</div>

					<ScrollArea className="flex-1 min-h-0">
						<div className="p-4">
							{viewMode === "pretty" && typeof response.data === "object" ? (
								<pre
									className="text-sm font-mono leading-relaxed whitespace-pre-wrap break-all"
									dangerouslySetInnerHTML={{
										__html: highlightJson(response.data),
									}}
								/>
							) : (
								<pre className="text-sm font-mono text-foreground leading-relaxed whitespace-pre-wrap break-all">
									{typeof response.data === "string"
										? response.data
										: JSON.stringify(response.data, null, 2)}
								</pre>
							)}
						</div>
					</ScrollArea>
				</TabsContent>

				<TabsContent value="headers" className="flex-1 overflow-hidden mt-0">
					<ScrollArea className="h-full">
						{/* Column header */}
						<div className="grid grid-cols-[auto_1fr_28px] gap-3 px-4 py-1.5 border-b border-border/50 bg-muted/20">
							<span className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground/60 min-w-35">
								Header
							</span>
							<span className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground/60">
								Value
							</span>
							<span />
						</div>
						<HeadersTable headers={response.headers} />
					</ScrollArea>
				</TabsContent>
			</Tabs>
		</div>
	);
}
