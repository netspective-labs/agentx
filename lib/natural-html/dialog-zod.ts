// lib/natural-html/dialog-zod.ts
import type { Attrs, Child } from "./elements.ts";
import { z } from "@zod";
import {
  createDialog,
  type Dialog,
  type DialogFieldName,
  type DialogFieldRenderer,
  type DialogFieldSpec,
  type DialogRenderOptions,
  type DialogZodObject,
  inputField,
} from "./dialog.ts";

const schemaMetaMap = new WeakMap<
  DialogZodObject,
  DialogSchemaMeta<DialogZodObject>
>();
const fieldMetaMap = new WeakMap<z.ZodTypeAny, DialogFieldMeta>();

export interface DialogSchemaMeta<Schema extends DialogZodObject> {
  readonly headerTitle?: Child;
  readonly headerDescription?: Child;
  readonly submitLabel?: Child;
  readonly cancelLabel?: Child;
  readonly fieldOrder?: readonly DialogFieldName<Schema>[];
  readonly autoFocusField?: DialogFieldName<Schema>;
  readonly hiddenFields?: Record<
    string,
    string | number | boolean | null | undefined
  >;
  readonly data?: Partial<z.infer<Schema>>;
  readonly dialogAttrs?: Attrs;
  readonly formAttrs?: Attrs;
  readonly action?: string;
  readonly method?: string;
}

export interface DialogFieldMeta {
  readonly label?: Child;
  readonly description?: Child;
  readonly placeholder?: string;
  readonly renderer?: DialogFieldRenderer<
    DialogZodObject,
    DialogFieldName<DialogZodObject>
  >;
  readonly wrapper?: DialogFieldSpec<
    DialogZodObject,
    DialogFieldName<DialogZodObject>
  >["wrapper"];
}

export function withDialogSchemaMeta<Schema extends DialogZodObject>(
  schema: Schema,
  meta: DialogSchemaMeta<Schema>,
): Schema {
  schemaMetaMap.set(schema, meta as DialogSchemaMeta<DialogZodObject>);
  schema.meta(meta as never);
  return schema;
}

export function withDialogFieldMeta<Field extends z.ZodTypeAny>(
  field: Field,
  meta: DialogFieldMeta,
): Field {
  fieldMetaMap.set(field, meta);
  field.meta(meta as never);
  return field;
}

function getSchemaMeta<Schema extends DialogZodObject>(
  schema: Schema,
): DialogSchemaMeta<Schema> | undefined {
  return schemaMetaMap.get(schema) as DialogSchemaMeta<Schema> | undefined;
}

function getFieldMeta(field: z.ZodTypeAny): DialogFieldMeta | undefined {
  return fieldMetaMap.get(field);
}

function captureShape<Schema extends DialogZodObject>(
  schema: Schema,
): Record<string, z.ZodTypeAny> {
  const def = schema._def as unknown as {
    shape?:
      | Readonly<Record<string, z.ZodTypeAny>>
      | (() => Record<string, z.ZodTypeAny>);
  };
  if (typeof def.shape === "function") {
    return def.shape();
  }
  if (def.shape) return { ...def.shape };
  throw new Error("dialog-zod: unable to read schema shape");
}

function makeFieldSpec<
  Schema extends DialogZodObject,
  Name extends DialogFieldName<Schema>,
>(
  schema: Schema,
  fieldName: Name,
): DialogFieldSpec<Schema, Name> {
  const shape = captureShape(schema);
  const field = shape[fieldName];
  const meta = field ? getFieldMeta(field) : undefined;
  const renderer = (meta?.renderer as DialogFieldRenderer<Schema, Name>) ??
    inputField({ placeholder: meta?.placeholder });

  return {
    label: meta?.label,
    description: meta?.description,
    renderer,
    wrapper: meta?.wrapper as
      | DialogFieldSpec<Schema, Name>["wrapper"]
      | undefined,
  };
}

function buildRenderDefaults<Schema extends DialogZodObject>(
  meta: DialogSchemaMeta<Schema>,
): DialogRenderOptions<Schema> {
  return {
    headerTitle: meta.headerTitle,
    headerDescription: meta.headerDescription,
    hiddenFields: meta.hiddenFields,
    data: meta.data as Partial<z.infer<Schema>>,
    dialogAttrs: meta.dialogAttrs,
    formAttrs: meta.formAttrs,
    action: meta.action,
    method: meta.method,
    autoFocusField: meta.autoFocusField,
    fieldOrder: meta.fieldOrder,
    submit: meta.submitLabel ? { label: meta.submitLabel } : undefined,
    cancel: meta.cancelLabel ? { label: meta.cancelLabel } : undefined,
  };
}

function mergeRenderOptions<Schema extends DialogZodObject>(
  defaults: DialogRenderOptions<Schema>,
  overrides?: DialogRenderOptions<Schema>,
): DialogRenderOptions<Schema> {
  if (!overrides) return defaults;
  return {
    ...defaults,
    ...overrides,
    data: {
      ...(defaults.data ?? {}),
      ...(overrides.data ?? {}),
    } as Partial<z.infer<Schema>>,
    hiddenFields: {
      ...(defaults.hiddenFields ?? {}),
      ...(overrides.hiddenFields ?? {}),
    },
    submit: overrides.submit ?? defaults.submit,
    cancel: overrides.cancel ?? defaults.cancel,
  };
}

function wrapDialog<Schema extends DialogZodObject>(
  dialog: Dialog<Schema>,
  defaults?: DialogRenderOptions<Schema>,
): Dialog<Schema> {
  if (!defaults) return dialog;
  const wrapped: Dialog<Schema> = {
    ...dialog,
    render(options?: DialogRenderOptions<Schema>) {
      return dialog.render(mergeRenderOptions(defaults, options));
    },
  };
  return wrapped;
}

export interface SchemaDialogBuilder<Schema extends DialogZodObject> {
  field<Name extends DialogFieldName<Schema>>(
    name: Name,
    spec: DialogFieldSpec<Schema, Name>,
  ): SchemaDialogBuilder<Schema>;
  order(
    order: readonly DialogFieldName<Schema>[],
  ): SchemaDialogBuilder<Schema>;
  build(): Dialog<Schema>;
}

export function createSchemaDialog<Schema extends DialogZodObject>(
  name: string,
  schema: Schema,
): SchemaDialogBuilder<Schema> {
  const shape = captureShape(schema);
  const defaultOrder = Object.keys(shape) as DialogFieldName<Schema>[];
  const initialSpecs = new Map<
    DialogFieldName<Schema>,
    DialogFieldSpec<Schema, DialogFieldName<Schema>>
  >();

  for (const fieldName of defaultOrder) {
    initialSpecs.set(fieldName, makeFieldSpec(schema, fieldName));
  }

  let orderOverride: readonly DialogFieldName<Schema>[] | undefined;
  const builder: SchemaDialogBuilder<Schema> = {
    field<Name extends DialogFieldName<Schema>>(
      name: Name,
      spec: DialogFieldSpec<Schema, Name>,
    ) {
      initialSpecs.set(
        name,
        spec as DialogFieldSpec<Schema, DialogFieldName<Schema>>,
      );
      return this;
    },
    order(order) {
      orderOverride = order;
      return this;
    },
    build() {
      const dialogBuilder = createDialog(name, schema);
      const schemaMeta = getSchemaMeta(schema);
      const ordering = orderOverride ??
        schemaMeta?.fieldOrder ??
        defaultOrder;
      for (const fieldName of ordering) {
        const spec = initialSpecs.get(fieldName);
        if (!spec) continue;
        dialogBuilder.field(fieldName, spec);
      }
      const dialog = dialogBuilder.build();
      const defaults = schemaMeta ? buildRenderDefaults(schemaMeta) : undefined;
      return wrapDialog(dialog, defaults);
    },
  };

  return builder;
}
