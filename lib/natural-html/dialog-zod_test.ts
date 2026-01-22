// lib/natural-html/dialog-zod_test.ts
import { assertEquals } from "@std/assert";
import * as h from "./elements.ts";
import { z } from "@zod";
import {
  createSchemaDialog,
  withDialogFieldMeta,
  withDialogSchemaMeta,
} from "./dialog-zod.ts";

Deno.test("schema dialog honors field metadata", () => {
  const nameField = withDialogFieldMeta(z.string(), {
    label: "Full name",
    description: "Your legal name",
    placeholder: "First and last",
  });

  const schema = z.object({ name: nameField });
  const dialog = createSchemaDialog("meta", schema).build();
  const html = h
    .renderPretty(dialog.render({ data: { name: "Alex" } }))
    .trim();

  assertEquals(
    html,
    `<dialog class="natural-dialog" id="meta-dialog" open role="dialog">
  <div class="natural-dialog__surface">
    <form action="" class="natural-dialog__form" id="meta-dialog-form" method="dialog">
      <div class="natural-dialog__body">
        <div class="natural-dialog__field" data-field="name"><label class="natural-dialog__label" for="meta-dialog-form-name">Full name</label><input class="natural-dialog__control" id="meta-dialog-form-name" name="name" placeholder="First and last" type="text" value="Alex">
          <p class="natural-dialog__field-description">Your legal name</p>
        </div>
      </div>
      <div class="natural-dialog__footer">
        <div class="natural-dialog__actions"><button class="natural-dialog__action natural-dialog__action--primary" type="submit">Submit</button></div>
      </div>
    </form>
  </div>
</dialog>`,
  );
});

Deno.test("schema metadata controls headers, hidden fields, and actions", () => {
  const nameField = withDialogFieldMeta(z.string(), {
    label: "Full name",
    placeholder: "First and last",
  });
  const emailField = withDialogFieldMeta(z.string(), {
    label: "Email",
    placeholder: "you@host",
    description: "We will never spam",
  });

  const schema = withDialogSchemaMeta(
    z.object({ name: nameField, email: emailField }),
    {
      headerTitle: "Join now",
      headerDescription: "Share your info",
      submitLabel: "Create account",
      cancelLabel: "Not now",
      hiddenFields: { source: "meta" },
      data: { name: "Sam" },
      fieldOrder: ["email", "name"],
      autoFocusField: "email",
    },
  );

  const dialog = createSchemaDialog("onboard", schema).build();
  const html = h.renderPretty(dialog.render()).trim();

  assertEquals(
    html,
    `<dialog aria-describedby="onboard-dialog-description" aria-labelledby="onboard-dialog-title" class="natural-dialog" id="onboard-dialog" open role="dialog">
  <div class="natural-dialog__surface">
    <header class="natural-dialog__header">
      <h2 class="natural-dialog__title" id="onboard-dialog-title">Join now</h2>
      <p class="natural-dialog__description" id="onboard-dialog-description">Share your info</p>
    </header>
    <form action="" class="natural-dialog__form" id="onboard-dialog-form" method="dialog"><input name="source" type="hidden" value="meta">
      <div class="natural-dialog__body">
        <div class="natural-dialog__field" data-field="email"><label class="natural-dialog__label" for="onboard-dialog-form-email">Email</label><input autofocus class="natural-dialog__control" id="onboard-dialog-form-email" name="email" placeholder="you@host" type="text" value="">
          <p class="natural-dialog__field-description">We will never spam</p>
        </div>
        <div class="natural-dialog__field" data-field="name"><label class="natural-dialog__label" for="onboard-dialog-form-name">Full name</label><input class="natural-dialog__control" id="onboard-dialog-form-name" name="name" placeholder="First and last" type="text" value="Sam"></div>
      </div>
      <div class="natural-dialog__footer">
        <div class="natural-dialog__actions"><button class="natural-dialog__action natural-dialog__action--secondary" type="button">Not now</button><button class="natural-dialog__action natural-dialog__action--primary" type="submit">Create account</button></div>
      </div>
    </form>
  </div>
</dialog>`,
  );
});
