# GlamAR · 3D Production Console

React, TypeScript and Vite prototype for managing product references, 3D production, review and publishing, with a separate 3D generation demo.

## Run locally

Use Node.js 22.12+ (tested with Node 24).

```sh
npm ci
npm run dev
```

Open the local URL printed by Vite. For a production build:

```sh
npm run build
npm run preview
```

## Catalog workflow

1. Continue through the demo login and choose an organisation: GlamAR, WestElm, Eyewa, Swadesh or Vision Express.
2. Open **3D Assets**. Use **Import Catalog → Add Single Product** to add an image and product details.
3. Open a product and move it through **To do → In Progress → Review → Done**. The workspace supports assignees, product details, specifications, reference images, revision comments and a hold reason.
4. Upload a GLB model for review and inspect it in the 3D viewer.
5. In **Done**, select **Publish**. The app returns to the listing with **Published** selected and the product included.

Catalog counters and filters are calculated from the selected organisation's products. Organisation workspaces are stored separately; GlamAR contains the sample catalog.

## 3D Generation workflow

Open **3D Generation**, select catalog products or upload product images, configure generation settings and proceed to the generation workspace. The workspace includes a model preview, generation history, model download and **Sync** back to the catalog.

Generation is a UI demo: it shows a bundled sample chair and does not generate product geometry. No external AI service is connected and no generation credits are charged.

## Storage and integration boundary

All workspace data is stored in this browser using localStorage and IndexedDB. Uploaded files, organisation selections and local product edits are not included in this repository. Changing browser profile or origin (for example, `localhost` versus `127.0.0.1`) opens separate storage.

The demo login and roles are not real authentication. Publishing updates the local catalog's console status; it does not publish to an external commerce platform. Multi-user production use requires authenticated backend storage, server-side permissions, file hosting, catalog import and generation services.

The repository adapter is in `src/lib/repository.ts`, workflow checks in `src/lib/workflow.ts`, shared types in `src/lib/types.ts`, and UI components in `src/components/`. Web Locks serialize supported storage operations between tabs on the same browser origin; they do not coordinate users across devices.

## Known prototype limitations

- The bulk catalog import screen currently prepares demo products; the file parser is implemented and tested separately but is not connected to that screen.
- In the review/model workspace, header **Save** saves viewer settings. Product details and revision comments have separate save controls; save these before publishing or navigating away.
- Direct model upload and listing model metadata need further integration. Generation **Sync** updates the catalog model reference.
- Some generation history, profile labels and gallery references still use demo content.

## Validation

```sh
npm test
npm run build
```

The automated suite covers workflow and role checks, organisation storage, catalog parsing, model files and synchronization, generation selection/settings, and downloads. Browser checks have covered single-product import through publishing, organisation isolation, reload persistence, generation from catalog and manual upload, synchronization and GLB download. Earlier verification notes are in `docs/verification.md`.

## Assets and references

- Product imagery belongs to its respective West Elm / Pottery Barn sources and is retained as prototype reference material. This project does not grant an open-source license to those assets.
- The sample chair uses Khronos glTF Sample Assets **SheenChair**, created by Wayfair. See `public/models/ATTRIBUTION.md` for its source and license.
- Design/reference notes are in `docs/`; the supplied render dropdown reference is in `PDF/`.

Generated builds, dependency folders, local environment files and test screenshots are excluded from Git.
