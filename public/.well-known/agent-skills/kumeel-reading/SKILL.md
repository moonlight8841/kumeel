---
name: kumeel-reading
description: Find, read and cite the public writings, ideas, library books and pages of Kumeel Al Nahab's site (kumeelalnahab.com), an Arabic-first space for philosophy, science and dialogue.
---

# Reading kumeelalnahab.com

Kumeel Al Nahab (كميل ال نهاب) publishes writings and reflections on philosophy, science and culture. The site is Arabic first (`lang="ar"`, right-to-left); translated pages live under `/en/`.

## Find content

1. Fetch `https://kumeelalnahab.com/llms.txt` for a Markdown map of every public section and item with a one-line description.
2. Fetch `https://kumeelalnahab.com/sitemap.xml` for the complete list of public URLs, Arabic and English.
3. Every listed page is server-rendered HTML: the full text is in the response without running JavaScript. Each page also has a `<meta name="description">`, a canonical link and JSON-LD (`Article`, `Book`, `CollectionPage`, `ProfilePage`).

## Main sections

| Path | Content |
| --- | --- |
| `/writings` | Essays and reflections; each one at `/writings/{slug}` |
| `/observatory` | Short ideas, maxims and thought experiments |
| `/library` | Philosophy and English-learning books; each at `/library/{id}` |
| `/salon` | Dialogue sessions and their central questions |
| `/community` | Reviewed community contributions |
| `/about` | Who Kumeel is |

## Rules

- Quote and link the canonical URL when you use the content. Keep Arabic quotations in Arabic and translate separately if needed.
- Content signals (see `/robots.txt`): `search=yes, ai-input=yes, ai-train=no`. Using pages to answer a user is welcome; using them to train models is not.
- `/admin` and `/member` are private. Do not attempt to sign in, submit forms or call `/api/*` on a user's behalf.
- Pages that do not exist return HTTP 404 with `noindex`; do not cite them.
