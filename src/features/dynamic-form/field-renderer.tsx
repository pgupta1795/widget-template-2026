import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import type { FormFieldDefinition } from "@/types/config"
import type { UseFormRegister, FieldErrors } from "react-hook-form"

type FieldRendererProps = {
  field: FormFieldDefinition
  register: UseFormRegister<Record<string, unknown>>
  errors: FieldErrors
  defaultValue?: unknown
}

export function FieldRenderer({ field, register, errors, defaultValue }: FieldRendererProps) {
  const error = errors[field.accessorKey]

  return (
    <div className={field.colSpan === 2 ? "col-span-2" : ""}>
      <Label htmlFor={field.id} className="text-xs">
        {field.label}
        {field.required && <span className="text-destructive ml-0.5">*</span>}
      </Label>

      {field.type === "textarea" ? (
        <Textarea
          id={field.id}
          placeholder={field.placeholder}
          defaultValue={defaultValue as string}
          readOnly={field.readOnly}
          className="mt-1 text-xs"
          {...register(field.accessorKey, { required: field.required })}
        />
      ) : field.type === "select" && field.options ? (
        <select
          id={field.id}
          defaultValue={defaultValue as string}
          disabled={field.readOnly}
          className="mt-1 flex h-7 w-full rounded-md border border-input bg-background px-2 text-xs ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          {...register(field.accessorKey, { required: field.required })}
        >
          <option value="">{field.placeholder ?? "Select..."}</option>
          {field.options.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      ) : field.type === "toggle" ? (
        <div className="mt-1">
          <Switch
            id={field.id}
            defaultChecked={!!defaultValue}
            disabled={field.readOnly}
            {...register(field.accessorKey)}
          />
        </div>
      ) : field.type === "hidden" ? (
        <input
          type="hidden"
          defaultValue={defaultValue as string}
          {...register(field.accessorKey)}
        />
      ) : (
        <Input
          id={field.id}
          type={field.type === "number" ? "number" : field.type === "date" ? "date" : "text"}
          placeholder={field.placeholder}
          defaultValue={defaultValue as string}
          readOnly={field.readOnly}
          className="mt-1 text-xs"
          {...register(field.accessorKey, { required: field.required })}
        />
      )}

      {error && (
        <p className="mt-0.5 text-[0.625rem] text-destructive">
          {error.message as string ?? "This field is required"}
        </p>
      )}
    </div>
  )
}
