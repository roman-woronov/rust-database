# Project site

A one-page static site for rust-database in a neo-Swiss style: a 12-column
grid, hairline rules, flush-left type and one signal red. Press `G` on the
page to show the grid.

No build step. Serve the folder and open it:

```sh
python3 -m http.server 8000 --directory site
```

Then visit http://localhost:8000. Opening `index.html` from disk also works.
Browsers may block the web fonts on `file://`, so the page falls back to
Helvetica or Arial there.

- `index.html` holds the content.
- `styles.css` holds the tokens (color, type, grid) at the top.
- `main.js` adds the grid toggle and the copy button.
- `fonts/` holds Schibsted Grotesk and Fragment Mono (latin subsets). Both
  are under the SIL Open Font License; the license texts sit next to the files.

The facts on the page (test names, method signatures, line counts) come from
`src/`. Update the page when those change.
