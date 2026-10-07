# GlamAR branding

## Current application theme — 30 September 2026

The user requested a full makeover to match the signed-in Fynd Central GlamAR application studied in `fynd-central-reference-study.md`. `src/fynd-theme.css` is the final shared theme layer, imported after the original structural stylesheet. It applies across all production pages and dialogs.

- Dark header and compact labelled navigation rail, Fynd GlamAR lockup in the header, and a single account control at top right.
- Pink primary actions and selected states (`#e50071`, hover `#c60061`, soft `#fff0f7`), white panels, grey borders, and the user's retained `#F4F4F4` page background. These are implementation tokens chosen to match the observed appearance, not claimed extracted source CSS values.
- Inter typography: compact 24px page headings, 28px product title, 14px body/controls, 12px captions and rail labels.
- Consistent pill buttons, underlined tabs, compact form groups, themed dropdowns, and rounded dialogs with a dimmed/blurred backdrop.
- Existing production data and lifecycle retained. Large white model viewport, small product reference, collapsible specifications, and explicitly dummy AI generation remain.
- Verified all main desktop pages for horizontal overflow; checked phone-width product, dashboard, product list, available tasks, team, settings, and mobile navigation. Build and all 13 workflow/repository tests passed.

The earlier configurator-specific branding decisions below describe the previous theme and are superseded where they differ from this application theme.

## Previous configurator reference

Visual source: https://glamar-kitchen-configurator.vercel.app/product.html

A separate brand-guide document was not available during this update. The console uses verified assets and measurements from the supplied GlamAR reference page:

- GlamAR-only wordmark: original GlamAR letter paths from the official website’s vector lockup, with the Fynd symbol and letters omitted at the user’s request. Stored in `public/brand/glamar-wordmark.svg`. Source: https://cdn.prod.website-files.com/667123ad86370a1578710764/69cc905d9710577bdce7f6ed_Fynd%20GlamAR.svg
- Standalone GlamAR mark/favicon: official website icon, cached unchanged in `public/brand/glamar-icon.png`. Source: https://cdn.pixelbin.io/v2/falling-surf-7c8bb8/original/webflow-team/GlamAR/Assests/668cbda3b273b4ef4404acc1_256.png
- Main page and promotional-card backgrounds: `#F4F4F4`, as requested. Warm surface, border, hover, and decorative progress colors are replaced with neutral greys.
- Black primary and white outlined secondary pill buttons: 999px radius, 48px standard minimum height, 13px 18px padding, Inter 12px / 500, 10px icon gap.
- Lucide outline icons: 24-unit viewBox, 1.6px stroke, round joins and caps; 18px in standard buttons.
- Custom 3D scan glyph: exact paths from the reference’s “View in My Space” control, implemented in `src/components/Brand.tsx`.
- Internal navigation uses the reference’s right arrow. External product/model links retain an external-link arrow to communicate opening another page.
- Table actions remain compact for the production workflow; icon-only header controls use the reference’s 40px circular treatment.

The GlamAR letterforms retain the original vector paths and proportions. The sidebar shows the full wordmark; compact navigation uses the supplied mark.

Typography uses the reference site's Inter files directly (`inter-regular.ttf`, `inter-medium.woff2`, `inter-semibold.ttf`), stored locally under `public/brand/`. Titles follow its 30–46px responsive scale, body and actions use 12px, navigation uses 13px, and captions use 10–11px. The GlamAR-only vector letterforms remain intact and render at a 124px wordmark width; the logo is not recreated using a text font.

Readability update: body, navigation, fields and actions now use 14px, section titles 16px, and small captions/status labels have a 12px minimum. This deliberately increases the reference theme’s smaller text at the user’s request. The visible search shortcut badge has been removed.
