# How a blog post is made (the default, from 3 Nov 2026)

The rules are in code, in one file: `server/lib/blogStandards.js`. The admin editor, the weekly importer and the draft importer all use it. Posts created before 3 Nov 2026 are left alone.

1. **Find the source.** From the Grok trend brief or a content idea. Open the primary source yourself and read it in full, including supplementary files. Do not write from an abstract.
2. **Write the draft** in `drafts/<name>/`: `draft.html` (first line `<!-- Title -->`, second line `<!-- meta: description -->`, then the body) and `post.json` (slug, category, keyword, notes, review ticks). Start from the template: the admin "New post" page is pre-filled with it, or use `POST_TEMPLATE_HTML` in the standards file.
3. **Check and save it as a draft:** `node server/scripts/add-blog-draft.js <name>` (dry run, shows every error and warning), then add `--apply` (and `--update` to refresh the same draft). Nothing is published by this.
4. **Review.** Grok and ChatGPT each review the final text, with the source open. Record what was adopted and rejected in `drafts/<name>/REVIEW.md`. Re-send after any big change.
5. **Share card.** `node server/scripts/render-og-images.js --slug=<slug>` (needs local Chrome). Commit and deploy the card (needs Ajith's yes to push). A hero image also counts.
6. **Ajith reads the final wording** and says yes.
7. **Publish in the admin** (`/admin/posts`, open the post). The checklist panel must show "ready to publish": lint clean, related and service links real, all four review boxes ticked, share image present. Publishing is blocked until then; saving a draft never is.
8. **After publishing:** `node server/scripts/after-publish.js <slug>` (indexing watchlist, live check), then the carousel, social captions (all channels, UTM links, teaser) and translations.

Checks to run after any change to this: `node server/scripts/test-blog-standards.js`, `node server/scripts/test-admin-blog-standards.js`, and `node server/scripts/admin-smoke-test.js` (all 13 admin tabs, throwaway database).
