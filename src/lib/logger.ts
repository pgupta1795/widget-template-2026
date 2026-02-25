type LogLevel = "info" | "warn" | "error" | "debug";

class Logger {
	private prefix: string;

	constructor(prefix: string = "WIDGET") {
		this.prefix = prefix;
	}

	private formatMessage(level: LogLevel, message: string): string {
		const timestamp = new Date().toLocaleTimeString();
		return `%c[${timestamp}] [${this.prefix}] [${level.toUpperCase()}]:%c ${message}`;
	}

	private getStyles(level: LogLevel): string[] {
		const base = "font-weight: bold;";
		switch (level) {
			case "info":
				return [`${base}color: #3b82f6;`, "color: inherit;"];
			case "warn":
				return [`${base}color: #f59e0b;`, "color: inherit;"];
			case "error":
				return [`${base}color: #ef4444;`, "color: inherit;"];
			case "debug":
				return [`${base}color: #10b981;`, "color: inherit;"];
			default:
				return [base, "color: inherit;"];
		}
	}

	info(message: string, ...args: any[]) {
		console.info(
			this.formatMessage("info", message),
			...this.getStyles("info"),
			...args,
		);
	}

	warn(message: string, ...args: any[]) {
		console.warn(
			this.formatMessage("warn", message),
			...this.getStyles("warn"),
			...args,
		);
	}

	error(message: string, ...args: any[]) {
		console.error(
			this.formatMessage("error", message),
			...this.getStyles("error"),
			...args,
		);
	}

	debug(message: string, ...args: any[]) {
		if (import.meta.env.DEV) {
			console.debug(
				this.formatMessage("debug", message),
				...this.getStyles("debug"),
				...args,
			);
		}
	}
}

export const logger = new Logger();
export default logger;
