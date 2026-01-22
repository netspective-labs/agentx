// lib/natural-html/dialog-lform_test.ts
import { assertEquals } from "@std/assert";
import * as h from "./elements.ts";
import { createLhcFormDialog } from "./dialog-lform.ts";

Deno.test("LHC form dialog renders expected fields", async () => {
  const dialog = await createLhcFormDialog(
    "lhc-test",
    new URL("./fixtures/lhc-simple-form.json", import.meta.url).pathname,
  );
  const html = h.renderPretty(dialog.render()).trim();

  assertEquals(
    html,
    `<dialog aria-describedby="lhc-test-dialog-description" aria-labelledby="lhc-test-dialog-title" class="natural-dialog" id="lhc-test-dialog" open role="dialog">
  <div class="natural-dialog__surface">
    <header class="natural-dialog__header">
      <h2 class="natural-dialog__title" id="lhc-test-dialog-title">Simple Survey</h2>
      <p class="natural-dialog__description" id="lhc-test-dialog-description">Tell us about yourself</p>
    </header>
    <form action="" class="natural-dialog__form" id="lhc-test-dialog-form" method="dialog">
      <div class="natural-dialog__body">
        <div class="natural-dialog__field" data-field="name"><label class="natural-dialog__label" for="lhc-test-dialog-form-name">Full name</label><input class="natural-dialog__control" id="lhc-test-dialog-form-name" name="name" placeholder="First and last name" type="text" value="Jordan">
          <p class="natural-dialog__field-description">First and last name</p>
        </div>
        <div class="natural-dialog__field" data-field="subscribe"><label class="natural-dialog__label" for="lhc-test-dialog-form-subscribe">Newsletter</label><input class="natural-dialog__control" id="lhc-test-dialog-form-subscribe" name="subscribe" type="checkbox" value="true"></div>
        <div class="natural-dialog__field" data-field="favorite_color"><label class="natural-dialog__label" for="lhc-test-dialog-form-favorite_color">Favorite color</label><select class="natural-dialog__control" id="lhc-test-dialog-form-favorite_color" name="favorite_color"><option value="red">Red</option><option value="blue">Blue</option></select>
          <p class="natural-dialog__field-description">Pick one</p>
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
