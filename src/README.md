# Zoho Monthly Autofill

A Chrome Manifest V3 extension with no dependencies, frameworks, or build step. Fills hours and **one global description** in the first Monthly Log row with both Project and Job selected. Saving the monthly log is always manual.

**Author:** Franco Rosatto — [francoe12012@gmail.com](mailto:francoe12012@gmail.com)

## Installation

1. Open `chrome://extensions` in Chrome.
2. Enable **Developer mode**.
3. Click **Load unpacked**.
4. Select the folder containing `manifest.json`:
   `src`
5. Optionally pin the extension to the toolbar. No npm installation or server is required.

After updating files, reload the extension in `chrome://extensions`, then reload Zoho after reviewing any pending changes. Previously injected scripts remain active until the page reloads.

## Usage

1. Open Zoho with your existing authenticated session and navigate to Monthly Log.
2. Select Project and Job manually. When several rows are configured, the extension uses the first from top to bottom. The preview displays its row number.
3. Open the extension from that active tab.
4. Enter **Hours per day**, such as `8`, `08:00`, or `07:30`. Allowed values range from `00:01` to `24:00`.
5. Enter **Description** once. The complete text, including spaces and line breaks, is reused for every filled day.
6. **Include weekends** is off and **Skip existing entries** is on by default.
7. Click **Fill Monthly Log**. Review the month, row, day count, total hours, and description. This preview does not modify Zoho.
8. Click **Confirm and fill**. Do not switch months, change Project or Job, or edit cells while the operation runs.
9. Review the summary and the filled values in Zoho. **Click the Monthly Log Save/Submit button manually.**

The interface shows one view at a time: an instruction to open Monthly Log when unavailable in the active tab, settings, confirmation, progress, or summary. The summary counts hours only for completed and verified days, excluding partially edited days with errors. The author footer appears in every view. There is no popup diagnostic button in the interface.

You can close and reopen the extension popup while it works: execution runs in the Zoho tab. Status remains in memory until that tab navigates or reloads. **Stop filling** cancels the current wait and prevents processing further days; it does not undo completed days.

Settings are saved in `chrome.storage.local`. They are not synchronized to other devices. No row or entry history is stored. Uninstalling the extension removes its local storage.

## Description handling

The selectors come from the supplied real HTML, rather than generic button text matching:

- Container: `#bulklog_add_edit`.
- Editor within the container: `textarea#bulk_timelog_desc`.
- Confirmation within the container: `button#bulklog_submit[type="button"]`.
- Cancellation within the container: `button#bulklog_cancel[type="button"]`.

On **September 30, 2026**, the user verified that **Confirm only applies changes to the pending form** and final persistence requires the Monthly Log Save/Submit action. This verification enabled the adapter; safety was not inferred from the button label or type. Zoho's internal handler code and real session network traffic were not inspected during development.

For each day, hours are set using the native setter with bubbling `input` and `change` events and actual focus loss. Only the visible Description icon beside the duration input is opened; the hidden from/to icon is ignored. A MutationObserver with a timeout waits for the popup. The extension sets the description, updates the counter through `keyup`, confirms, waits for closure, and reopens the same cell to verify an exact text match. It then clicks Cancel in this verification popup.

The extension never searches for or clicks the global Save/Submit button, submits a form, or calls the official Zoho API. Page events can execute Zoho's own logic. If Confirm behavior changes, review the adapter before using it again.

## Existing entries and failures

- With Skip existing entries enabled, only blank values or exactly `00:00` are filled, ignoring surrounding whitespace. Malformed existing values are also preserved.
- Skipped days retain their descriptions.
- Disabling Skip existing entries replaces hours and descriptions for eligible days, as shown in the preview.
- Saturdays and Sundays are calculated from dates in UTC. The `weekend="true"` attribute is also respected. No month or fixed day count is hardcoded.
- Daily inputs are queried within their row; global `daytxtN` IDs are not used.
- An ambiguous or non-editable eligible input stops the operation before the batch starts.
- Previews expire after two minutes. Changes to values before execution invalidate them.
- Rebuilding the view or row, or changing Project/Job during execution, stops the operation. The extension does not guess which replacement row to use.
- A description failure stops further processing. The summary identifies the failed date and any partially edited day. **That day's hours may already be entered, and previous days may be complete.** There is no automatic rollback that could overwrite page or user changes. Review and repair the partial day manually before retrying; Skip existing entries will skip it if it already contains hours.

## Permissions and privacy

| Permission | Purpose |
| --- | --- |
| `activeTab` | Temporary access to the tab where the user invokes the extension. |
| `scripting` | Inject local files into that tab's isolated world. |
| `storage` | Remember hours, description, includeWeekends, and skipExisting locally. |

The extension requests no cookies, history, credentials, OAuth, permanent site access, or additional network permissions. It contains no telemetry, remote code, service worker, or external dependencies. It operates only in the main document containing the expected DOM. The description remains stored locally until changed or the extension is uninstalled.

Permission references: [activeTab](https://developer.chrome.com/docs/extensions/develop/concepts/activeTab) and [chrome.scripting](https://developer.chrome.com/docs/extensions/reference/api/scripting).

## Debugging

In **the Zoho tab**, open DevTools → Console and enable **Verbose** to see `console.debug` messages. Filter by `[Zoho Monthly Autofill]`. Logs include dates and control structure, but not descriptions, project names, cookies, form values, or complete HTML.

To inspect `content.js`, open Sources → Content scripts → Zoho Monthly Autofill. To inspect the extension popup, right-click it and choose Inspect. Installation errors appear under `chrome://extensions` → Errors.

If Zoho changes its HTML, capture:

1. The `outerHTML` of a real row with Project and Job selected, anonymizing private names and identifiers.
2. The complete Description popup `outerHTML`, including its editor, attributes, and buttons. Remove private descriptions and attachment information.
3. The Confirm button's `click` handler from Elements → Event Listeners → click, including delegated listeners, if its behavior changed.
4. The failed date and this extension's structural debug logs.

Do not share cookies, tokens, authentication headers, complete session dumps, or unsanitized HAR files.

## Known limitations and validation

The extension supports the **HH:MM duration mode** shown in the supplied HTML, in the main document. It does not support from/to mode, iframes, shadow DOM, attachments, or automatic Project/Job selection. Components must accept synthetic events; `isTrusted` cannot be simulated. Holidays are treated as ordinary days unless Zoho marks them with `weekend="true"`.

All dates of the month must be rendered, even if horizontally outside the visible scroll area. Unknown editors can be detected for diagnostics but are not written to or confirmed automatically. The local description limit is 10,000 characters; the actual editor maxlength is checked before writing.

The popup uses explicit 390 × 580 pixel document dimensions. It avoids viewport-relative height limits because they can cause Chrome's action popup to collapse during initial sizing. Long descriptions and messages can scroll inside their own areas without expanding the outer popup.

Automated validation uses a synthetic fixture based on the supplied HTML with real Chrome DOM events. **This is not an end-to-end test against an authenticated Zoho account or an automated installation of the extension.** Review the first real run before manually saving.

Validate a real Monthly Log with a weekday, weekend and existing entry. Review hours and descriptions before saving manually. Synthetic development validation does not replace a real-account check.

## Files

- `manifest.json`: minimal permissions, author metadata, and popup configuration.
- `popup.html`, `popup.css`, `popup.js`: settings, preview, progress, and summary.
- `core.js`: validation and planning without DOM access.
- `content.js`: detection, events, waits, and sequential execution.
- `description-adapter.js`: integration with the verified popup.

No packages, build step, or credentials are required.

## Optional support

The footer includes an optional Buy Me a Coffee link to https://buymeacoffee.com/franco.rosatto. One of 30 gaming-themed messages is selected locally each time the popup opens. The link opens in a new tab only when clicked; no widget, tracking pixel, remote script, or payment logic is embedded. All extension features remain available without a contribution.

