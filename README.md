# Zoho Monthly Autofill

Independent Chrome Manifest V3 extension by Franco Rosatto. Prepare hours and descriptions in an existing Zoho Monthly Log, review the preview, then save manually in Zoho.

## Install and use

Clone this repository, open `chrome://extensions`, enable Developer mode, and load the `src` folder as an unpacked extension. No dependencies or build step are required.

See [the extension guide](src/README.md) for usage, permissions and limitations.

## Website, privacy and support

- [Extension website](https://frosatto.github.io/zoho-monthly-autofill/)
- [Privacy policy](https://frosatto.github.io/zoho-monthly-autofill/privacy-policy.html)
- [Legal information](https://frosatto.github.io/zoho-monthly-autofill/legal.html)
- [Support](https://frosatto.github.io/zoho-monthly-autofill/support.html)

The extension stores settings locally, including the description. It has no telemetry or developer server. Zoho processes interactions with its own page. This project is not affiliated with or endorsed by Zoho.

## Repository layout

- `src/`: installable extension source and icons.
- `docs/`: public website, legal information, privacy policy and support.

For a store upload, create a ZIP of the runtime files and icons inside `src/`, with `manifest.json` at its root. Review changes in an authenticated Zoho session before saving manually.

## Public legal pages

GitHub Pages serves only `docs/` from the `main` branch. `docs/privacy-policy.html` is the policy source and published policy. Use its direct URL in the Chrome Web Store Privacy Policy field, rather than this repository or its homepage, and resubmit the corrected item for review.

