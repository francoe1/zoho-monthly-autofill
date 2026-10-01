/*
 * Trust boundary: no guessed Save/OK selectors.
 * A reviewed adapter must prove that confirmation edits the pending cell only,
 * and verify the stored description for that exact row/date after closing.
 * DOM labels or data attributes alone cannot establish non-persistence.
 * This module lives in the isolated extension world, never in page storage.
 */
(() => {
  "use strict";
  function one(popup, selector, visible) {
    const matches = [...popup.querySelectorAll(selector)].filter(visible);
    if (matches.length !== 1) throw new Error(`Description: expected exactly one ${selector}.`);
    return matches[0];
  }
  function controls(popup, visible) {
    if (popup.id !== "bulklog_add_edit") throw new Error("Unknown Description popup. Nothing was confirmed.");
    const editor = one(popup, "textarea#bulk_timelog_desc", visible);
    const confirm = one(popup, "button#bulklog_submit", visible);
    const cancel = one(popup, "button#bulklog_cancel", visible);
    if ([confirm, cancel].some(button => button.type !== "button" || button.disabled)) throw new Error("Description controls changed or are disabled.");
    return { editor, confirm, cancel };
  }
  globalThis.ZohoDescriptionAdapter = Object.freeze({
    // User verified on 2026-09-30: Confirm applies to the pending form only.
    // HTML supplied by user includes all three selectors below. No generic Save fallback.
    verified: true,
    async apply({ popup, description, setNativeInputValue, waitFor, visible, signal, reopen, guard }) {
      const { editor, confirm } = controls(popup, visible);
      guard();
      setNativeInputValue(editor, description);
      // The supplied Zoho textarea updates its length counter on keyup.
      editor.dispatchEvent(new KeyboardEvent("keyup", { bubbles: true, key: "Unidentified" }));
      if (editor.value !== description || !editor.isConnected) throw new Error("Zoho rejected the description.");
      guard();
      confirm.click();
      await waitFor(() => !visible(popup), { signal });
      guard();
      const reopened = await reopen();
      const check = controls(reopened, visible);
      if (check.editor.value !== description) throw new Error("The reopened description does not match the global text. It was left open for review.");
      guard();
      check.cancel.click();
      await waitFor(() => !visible(reopened), { signal });
    }
  });
})();
