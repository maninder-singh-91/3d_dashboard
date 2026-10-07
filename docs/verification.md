# Verification · 29 September 2026

## Automated checks

- Production build succeeds with TypeScript validation.
- 12 tests pass across workflow/import and repository suites.
- Coverage: claim ownership, invalid second claim, model URL/checklist prerequisites, review comment requirement, role restrictions (including a reviewer who is also the named assignee), corrections/resubmission/approval, finalized-task protections, invalid URL schemes, quoted CSV fields and original sheet headers, unknown assignees/statuses, duplicate SKUs, transaction-safe imports and simultaneous claims.
- The large 3D renderer is loaded separately on demand. Vite reports a size advisory for the viewer chunk; it does not block the build.

## Browser checks

Verified through the running app in the Codex in-app browser:

1. Imported a product URL and reviewed its editable extracted demo record.
2. Changed to Artist, found the product in Available Tasks, and claimed it.
3. Verified assignment to Maninder and In Progress status in My Tasks.
4. Saved the locally served sample GLB, completed all ten checklist entries, and submitted.
5. Switched to Reviewer and found the task in the review queue.
6. Opened the interactive 3D model and verified rendered geometry; exercised zoom, reset and background toggle.
7. Confirmed the corrections action cannot send an empty comment; sent correction feedback.
8. Switched back to Artist, read the exact feedback, and resubmitted.
9. Approved as Reviewer and verified Approved review status, artist, model link, and approval date in Completed.
10. Reloaded the page and verified the completed product remained saved.
11. Uploaded an invalid CSV and observed specific field-level validation messages and disabled submission.
12. Uploaded and imported a valid CSV containing a quoted product name, then verified the resulting Available card.
13. Opened a second browser tab as another artist. Both sessions attempted to claim the same CSV product; only one In Progress record with one assignee persisted. Both available lists refreshed.
14. Verified the dashboard at 1440px and the available marketplace at 1680px/1920px. Verified mobile navigation and available cards at 390px. Document width matched viewport width at each checked breakpoint.
15. Restored the clean 33-product sample workspace, retaining the verification records in the reversible backup.

No browser console errors were observed during the model preview test. The model-viewer dependency emits development-only Lit warnings in the development server.

## Intentional first-milestone limits

- Demo identities/roles; no authentication or server-enforced authorization.
- Browser-local data persistence and same-browser, same-origin claim locking. No shared backend or cross-device locking yet.
- URL extraction is a replaceable mock adapter. CSV import is functional.
- Product images are real reference images where available; missing images use category placeholders.
- Seed GLB previews are explicitly labeled sample assets, not actual commissioned product models.
- No writes were made to the source Google Sheet, product sites, or any external account.

### 3D AI Generation UI demo

Verified reference upload through the browser file chooser, thumbnail rendering, enabling Generate after upload, loading-to-demo-preview flow, returning to the saved model, and removing the test reference. The saved model URL remained unchanged. Test reference was removed afterward.
