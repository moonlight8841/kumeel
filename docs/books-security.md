# Books library

The initial collection contains 30 English-language PDF files: 20 language-learning books and 10 philosophy books, totaling 84,597,132 bytes. The owner confirmed permission to share these copies.

Microsoft Defender completed both a PowerShell custom scan and an explicit MpCmdRun file scan with DisableRemediation (ignoring file exclusions) of the local `books` folder on 2026-10-11. No threat detections for that folder were returned. This is a scan result, not a guarantee against every possible threat. The machine's engine and signature versions, scan event, PDF inspection, and individual SHA-256 hashes are recorded locally in ignored `artifacts/` files.

All PDFs parsed successfully. Inspection of PDF objects found no JavaScript, embedded files, rich media, launch actions, form-submit actions, or XFA. Five documents have an OpenAction that only navigates to an internal page or sets the initial zoom. Original files were preserved. Every uploaded file was downloaded and verified against its inspected SHA-256 hash.

Files live in the public Supabase Storage bucket `kumeel-books`, restricted to `application/pdf` and 50 MB per file. No browser role has been granted storage write access to this bucket. Initial uploads use a trusted local script and the server secret kept in ignored `.env`. Do not publish originals or secrets through the source repository.

Public routes: `/library` and `/library/:id`. The catalog contains titles, author attribution, pages, file sizes, reading prompts, and public PDF links. Book pages use Book metadata identifying each book's actual author. PDFs open in the browser's viewer in a separate tab; the app does not execute or embed them.

The owner can edit, add, reorder, remove, and publish catalog entries in the Books tab of administration. Changes use the existing editor membership and AAL2 protection. Hiding the library in the home layout does not remove its separate page. Empty `books: []` deliberately clears the catalog; absent `books` preserves compatibility by loading the initial catalog.

Visitors' reading shelves live only in localStorage on their browser and contain book IDs and reading states. They do not grant account or administrative permissions. Future PDFs must be scanned and their sharing permission confirmed before placing their URLs in the catalog.
