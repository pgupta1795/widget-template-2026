import { Button } from "@/components/ui/button"
import type { FormConfig } from "@/types/config"
import { useForm } from "react-hook-form"
import { useFormSubmit } from "./use-form-submit"
import { FieldRenderer } from "./field-renderer"
import { Loader2 } from "lucide-react"

type DynamicFormProps = {
  config: FormConfig
  initialData?: Record<string, unknown>
  onSuccess?: (data: unknown) => void
  onCancel?: () => void
  invalidateKeys?: string[][]
}

export function DynamicForm({
  config,
  initialData,
  onSuccess,
  onCancel,
  invalidateKeys,
}: DynamicFormProps) {
  const form = useForm<Record<string, unknown>>({
    defaultValues: initialData,
  })

  const mutation = useFormSubmit(config.submitEndpoint, {
    invalidateKeys,
    onSuccess,
  })

  const isViewMode = config.mode === "view"

  const onSubmit = form.handleSubmit((data) => {
    mutation.mutate({ body: data })
  })

  return (
    <form onSubmit={onSubmit} className="space-y-4 p-4">
      <div className={`grid gap-3 ${config.columns === 2 ? "grid-cols-2" : "grid-cols-1"}`}>
        {config.fields.map((field) => (
          <FieldRenderer
            key={field.id}
            field={{ ...field, readOnly: isViewMode || field.readOnly }}
            register={form.register}
            errors={form.formState.errors}
            defaultValue={initialData?.[field.accessorKey]}
          />
        ))}
      </div>

      {!isViewMode && (
        <div className="flex items-center justify-end gap-2 pt-2">
          {onCancel && (
            <Button type="button" variant="outline" size="sm" onClick={onCancel}>
              Cancel
            </Button>
          )}
          <Button type="submit" size="sm" disabled={mutation.isPending}>
            {mutation.isPending && <Loader2 className="animate-spin" />}
            {config.mode === "create" ? "Create" : "Save"}
          </Button>
        </div>
      )}
    </form>
  )
}
