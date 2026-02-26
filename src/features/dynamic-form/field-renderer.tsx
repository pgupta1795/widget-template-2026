import {
	type Control,
	Controller,
	type FieldErrors,
	type UseFormRegister,
} from "react-hook-form";
import {
	Field,
	FieldContent,
	FieldError,
	FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import type { FormFieldDefinition } from "@/types/config";

type FieldRendererProps = {
	field: FormFieldDefinition;
	register: UseFormRegister<Record<string, unknown>>;
	control: Control<Record<string, unknown>>;
	errors: FieldErrors;
	defaultValue?: unknown;
};

export function FieldRenderer({
	field,
	register,
	control,
	errors,
	defaultValue,
}: FieldRendererProps) {
	const error = errors[field.accessorKey];

	if (field.type === "hidden") {
		return (
			<input
				type="hidden"
				defaultValue={defaultValue as string}
				{...register(field.accessorKey)}
			/>
		);
	}

	return (
		<Field className={field.colSpan === 2 ? "col-span-2" : ""}>
			<FieldLabel htmlFor={field.id} className="px-0 py-0 text-xs">
				{field.label}
				{field.required && <span className="ml-0.5 text-destructive">*</span>}
			</FieldLabel>
			<FieldContent>
				{field.type === "textarea" ? (
					<Textarea
						id={field.id}
						placeholder={field.placeholder}
						defaultValue={defaultValue as string}
						readOnly={field.readOnly}
						className="text-xs"
						{...register(field.accessorKey, { required: field.required })}
					/>
				) : field.type === "select" && field.options ? (
					<Controller
						name={field.accessorKey}
						control={control}
						defaultValue={defaultValue as string}
						rules={{ required: field.required }}
						render={({ field: controlledField }) => (
							<Select
								value={String(controlledField.value ?? "")}
								onValueChange={controlledField.onChange}
								disabled={field.readOnly}
							>
								<SelectTrigger id={field.id} className="w-full text-xs">
									<SelectValue>
										{controlledField.value
											? String(controlledField.value)
											: (field.placeholder ?? "Select...")}
									</SelectValue>
								</SelectTrigger>
								<SelectContent>
									{field.options?.map((opt) => (
										<SelectItem key={opt.value} value={opt.value}>
											{opt.label}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						)}
					/>
				) : field.type === "toggle" ? (
					<Controller
						name={field.accessorKey}
						control={control}
						defaultValue={Boolean(defaultValue)}
						render={({ field: controlledField }) => (
							<Switch
								id={field.id}
								checked={Boolean(controlledField.value)}
								onCheckedChange={controlledField.onChange}
								disabled={field.readOnly}
							/>
						)}
					/>
				) : (
					<Input
						id={field.id}
						type={
							field.type === "number"
								? "number"
								: field.type === "date"
									? "date"
									: "text"
						}
						placeholder={field.placeholder}
						defaultValue={defaultValue as string}
						readOnly={field.readOnly}
						className="text-xs"
						{...register(field.accessorKey, { required: field.required })}
					/>
				)}
				<FieldError errors={[error as { message?: string }]} />
			</FieldContent>
		</Field>
	);
}
