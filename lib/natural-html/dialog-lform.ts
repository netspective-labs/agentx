// lib/natural-html/dialog-lform.ts
import { z } from "@zod";
import {
  checkboxField,
  createDialog,
  type Dialog,
  type DialogFieldName,
  type DialogFieldRenderer,
  type DialogFieldSpec,
  type DialogRenderOptions,
  type DialogSelectOption,
  type DialogZodObject,
  inputField,
  selectField,
} from "./dialog.ts";

interface LhcForm {
  readonly resourceType?: string;
  readonly id?: string;
  readonly title?: string;
  readonly description?: string;
  readonly text?: string;
  readonly item?: readonly LhcFormItem[];
}

interface LhcFormItem {
  readonly linkId: string;
  readonly text?: string;
  readonly definition?: string;
  readonly type?: string;
  readonly required?: boolean;
  readonly repeats?: boolean;
  readonly item?: readonly LhcFormItem[];
  readonly answerOption?: readonly LhcFormAnswerOption[];
  readonly initialBoolean?: boolean;
  readonly initialInteger?: number;
  readonly initialDecimal?: number;
  readonly initialString?: string;
  readonly initialDate?: string;
  readonly initialDateTime?: string;
  readonly extension?: readonly { url: string; valueString?: string }[];
}

interface LhcFormAnswerOption {
  readonly valueString?: string;
  readonly valueInteger?: number;
  readonly valueDecimal?: number;
  readonly valueCoding?: { readonly code?: string; readonly display?: string };
}

interface LhcFormDialogOptions {
  readonly requestInit?: RequestInit;
}

const REMOTE_RE = /^https?:\/\//i;

async function loadLhcForm(
  source: string,
  options?: LhcFormDialogOptions,
): Promise<LhcForm> {
  if (REMOTE_RE.test(source)) {
    const res = await fetch(source, options?.requestInit ?? {});
    if (!res.ok) {
      throw new Error(`lhc form fetch failed: ${res.status} ${res.statusText}`);
    }
    return await res.json();
  }
  const text = await Deno.readTextFile(source);
  return JSON.parse(text);
}

function flattenItems(items: readonly LhcFormItem[]): LhcFormItem[] {
  const out: LhcFormItem[] = [];
  for (const item of items) {
    if (item.type?.toLowerCase() !== "group") {
      out.push(item);
    }
    if (item.item) {
      out.push(...flattenItems(item.item));
    }
  }
  return out;
}

function coercePlaceholder(item: LhcFormItem): string | undefined {
  return item.definition ?? item.text;
}

function answerOptionsToSelect(
  options: readonly LhcFormAnswerOption[],
): {
  readonly renderer: DialogFieldRenderer<DialogZodObject, string>;
  readonly schemaType: z.ZodTypeAny;
  readonly defaultValue?: string;
} {
  const opts = options.map<DialogSelectOption | null>((opt) => {
    const value = opt.valueString ??
      (opt.valueCoding?.code
        ? opt.valueCoding.code
        : opt.valueInteger?.toString() ??
          opt.valueDecimal?.toString() ??
          undefined);
    const label = opt.valueCoding?.display ?? value ?? "";
    return (value ?? label) !== undefined
      ? { value: value ?? label, label }
      : null;
  }).filter((opt): opt is DialogSelectOption => opt !== null);
  const renderer = selectField({
    options: opts,
    includeBlank: "",
    blankValue: "",
  });
  return { renderer, schemaType: z.string(), defaultValue: undefined };
}

function makeRenderer(
  type: string | undefined,
  item: LhcFormItem,
): {
  renderer: DialogFieldRenderer<DialogZodObject, string>;
  schemaType: z.ZodTypeAny;
  defaultValue?: unknown;
} {
  const normalized = (type ?? "string").toLowerCase();
  const placeholder = coercePlaceholder(item);
  const defaultValue = item.initialString ??
    item.initialBoolean ??
    item.initialInteger ??
    item.initialDecimal ??
    item.initialDate ??
    item.initialDateTime;
  switch (normalized) {
    case "boolean":
      return {
        renderer: checkboxField(),
        schemaType: item.required ? z.boolean() : z.boolean().optional(),
        defaultValue,
      };
    case "choice":
    case "open-choice":
      if (item.answerOption && item.answerOption.length > 0) {
        const { renderer, schemaType } = answerOptionsToSelect(
          item.answerOption,
        );
        return {
          renderer,
          schemaType: item.required ? schemaType : schemaType.optional(),
          defaultValue,
        };
      }
      return {
        renderer: inputField({ placeholder }),
        schemaType: item.required ? z.string() : z.string().optional(),
        defaultValue,
      };
    case "integer":
      return {
        renderer: inputField({ type: "number", placeholder }),
        schemaType: item.required
          ? z.number().int()
          : z.number().int().optional(),
        defaultValue,
      };
    case "decimal":
      return {
        renderer: inputField({ type: "number", placeholder }),
        schemaType: item.required ? z.number() : z.number().optional(),
        defaultValue,
      };
    case "date":
    case "date-time":
      return {
        renderer: inputField({ type: "date", placeholder }),
        schemaType: item.required ? z.string() : z.string().optional(),
        defaultValue,
      };
    case "string":
    case "text":
    default:
      return {
        renderer: inputField({ placeholder }),
        schemaType: item.required ? z.string() : z.string().optional(),
        defaultValue,
      };
  }
}

function wrapDialog<Schema extends DialogZodObject>(
  dialog: Dialog<Schema>,
  defaults?: DialogRenderOptions<Schema>,
): Dialog<Schema> {
  if (!defaults) return dialog;
  return {
    ...dialog,
    render(options?: DialogRenderOptions<Schema>) {
      const defaultData: Partial<z.infer<Schema>> = defaults.data ??
        ({} as Partial<z.infer<Schema>>);
      const optionData: Partial<z.infer<Schema>> = options?.data ??
        ({} as Partial<z.infer<Schema>>);
      const data: Partial<z.infer<Schema>> = {
        ...defaultData,
        ...optionData,
      };
      const hiddenFields = options?.hiddenFields || defaults.hiddenFields
        ? {
          ...(defaults.hiddenFields ?? {}),
          ...(options?.hiddenFields ?? {}),
        }
        : undefined;
      const submit = options?.submit ?? defaults.submit;
      const cancel = options?.cancel ?? defaults.cancel;
      const merged: DialogRenderOptions<Schema> = {
        ...defaults,
        ...options,
        data,
        hiddenFields,
        submit,
        cancel,
      };
      return dialog.render(merged);
    },
  };
}

export async function createLhcFormDialog(
  name: string,
  source: string,
  options?: LhcFormDialogOptions,
): Promise<Dialog<DialogZodObject>> {
  const form = await loadLhcForm(source, options);
  const items = form.item ? flattenItems(form.item) : [];
  const order = items.map((item) => item.linkId);
  const shape: Record<string, z.ZodTypeAny> = {};
  const specs: Array<{
    readonly name: string;
    readonly spec: DialogFieldSpec<DialogZodObject, string>;
  }> = [];
  const defaults: Record<string, unknown> = {};

  for (const item of items) {
    const name = item.linkId;
    const label = item.text;
    const description = item.definition;
    const { renderer, schemaType, defaultValue } = makeRenderer(
      item.type,
      item,
    );
    shape[name] = schemaType;
    if (defaultValue !== undefined) defaults[name] = defaultValue;

    specs.push({
      name,
      spec: {
        label,
        description,
        renderer,
      },
    });
  }

  const schema = z.object(shape) as DialogZodObject;
  const builder = createDialog(name, schema);
  for (const field of specs) {
    builder.field(field.name as DialogFieldName<DialogZodObject>, field.spec);
  }

  const dialog = builder.build();
  const renderDefaults: DialogRenderOptions<DialogZodObject> = {
    headerTitle: form.title,
    headerDescription: form.description ?? form.text,
    fieldOrder: order as readonly DialogFieldName<DialogZodObject>[],
    data: defaults as Partial<z.infer<DialogZodObject>>,
  };

  return wrapDialog(dialog, renderDefaults);
}
