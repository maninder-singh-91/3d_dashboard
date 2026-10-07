# Fynd Central GlamAR: theme and workflow study

Reviewed 30 September 2026 in the user's signed-in Chrome session.

Reference: https://central.sit.fyndx1.de/glamar/asia-south1/accounts/8335/dashboard

## Scope and evidence

Inspected the dashboard, 3D Asset Library, Analytics, Home & Decor product inventory, SDK configuration, Skin Analysis onboarding, and Team pages. This is a study only; no console styling was changed, assets uploaded, members invited, applications created, or configurations saved/published.

The account's asset and product inventories are empty. Add Products opens an All Plans dialog rather than a product editor. Analytics displays an Unauthorized access error. Consequently, populated asset cards, model editing, product creation, processing, analytics results, and successful publication were not verified.

## Visual system observed

| Area | Observed design |
| --- | --- |
| Application shell | Near-black top bar and narrow icon navigation rail. White logo and labels. Organization/profile controls at the top right. |
| Secondary navigation | Light flyout panels for grouped tools and settings. Try-Ons separates Lifestyle, Beauty, and Home & Decor. |
| Main surface | Light grey page canvas, white content panels, subtle grey borders, softly rounded corners. |
| Accent | Pink primary actions, selected tabs, radio buttons, and switches in the signed-in GlamAR app. Pale pink selected states. Yellow Upgrade button. |
| Buttons | Compact pill actions, outline/light secondary buttons, icons alongside action labels. Disabled actions use faded styling. |
| Typography | Compact sans-serif labels, bold page/section titles, grey helper text. The SDK Appearance panel explicitly shows Inter; this confirms an SDK typography setting, not the exact computed font of every admin element. |
| Layout | Page title and actions above the content. Horizontal tabs for related settings. Grouped white form cards with consistent inner spacing. Preview appears in a right-side column. |
| Empty states | Centered neutral illustration, short heading, explanatory text, and one or two clear next actions. |
| Dialogs | Rounded white panels with darkened backdrop. The user's notification screenshot has a heading, instructional illustration, and bottom-right secondary/primary actions. |

The sign-in screen and supplied notification dialog use blue-violet actions. The signed-in GlamAR admin pages use pink. These are different visual contexts; do not infer the whole dashboard palette from the notification screenshot.

Exact CSS colors, radii, font sizes, and spacing were not measured through Chrome's native UI. Visual observations should not be presented as exact design tokens. Screenshots are saved under `artifacts/fynd-reference-study/`.

## Functionality observed

| Section | Visible controls / behavior | Verification limits |
| --- | --- | --- |
| Dashboard | Personalized welcome, Get Started action, rotating preview illustrations. | Onboarding view in this account, not an operational KPI dashboard. |
| 3D Assets | Search input, Grid/List toggle, Upload action. Upload opens the system file picker. | No assets; picker cancelled without selecting/uploading a file. Processing and model viewer behavior unverified. |
| Analytics | Plans, AR Try-on, and AI facial skin analysis tabs; pooled credits usage and billing cycle panel. | Unauthorized access error beneath the credits area; no reliable usage conclusions. |
| Try-Ons | Lifestyle, Beauty, Home & Decor navigation; Products and SDK Configuration under Home & Decor. | Only Home & Decor pages inspected in detail. |
| Product Inventory | Empty-state guidance with Import and Add Products. | Add Products opened All Plans, so the editor is gated in this account. Import was visible but not executed. |
| SDK Configuration | General settings, Hero section, Appearance, Advance settings, Category tools, Custom code. Separate Reset To Default, Save, Publish actions. | General and Appearance panels inspected; nothing changed or published. |
| SDK General | Allowed domains, smartphone QR preview, share link, SDK version/update, language, try-on modes, watermark controls, right-side mobile preview. | Behavior after saving and downstream SDK behavior unverified. |
| SDK Appearance | Default/custom typography, Inter selected, light/dark/custom theme choices, right-side preview. | Choices observed, not changed. |
| Skin Analysis | Create App, introductory dialog, integration selection between Skin GPT and SDK. | Integration dialog cancelled; no app created or scans inspected. |
| Settings | Tokens, Team, Audit navigation. | Tokens and Audit entries observed only. |
| Team | Search by email, Add Member; Add Member opens email search/invite form. | Empty team state; no email entered and no invitation sent. |

## Application to the 3D Production Console

1. Treat the Fynd Central shell and the production workflow as separate concerns. Matching the reference would mean a dark header/rail, light secondary navigation, white cards, and pink primary/selected states.
2. Retain the console's operational dashboard, task ownership, checklist, review, corrections, and completion flow. The reference's welcome dashboard does not replace these requirements.
3. Reuse its search/view/action toolbar structure for product and asset libraries, and its grouped form tabs for Details & specifications.
4. Keep the large model viewport and small reference image the user requested. Use the reference's adjacent preview/configuration layout without making the model preview small.
5. Preserve readable 14px body/control text and 12px minimum captions requested earlier; do not reproduce the tiny apparent text in the Chrome screenshots without accounting for browser scaling.
6. Keep upload and AI generation as distinct actions. The console's generation remains an explicitly labeled dummy flow. This reference review did not establish a real image-to-3D generation API.
7. If the new theme is applied later, update shared tokens and components consistently, rather than mixing pink admin actions, black configurator actions, and blue-violet auth actions without a defined purpose.

These are implementation recommendations, not changes already applied to the console.
