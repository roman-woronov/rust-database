# Project site

A one-page static site for rust-database in a neo-brutalist style: 3px black
borders, hard offset shadows, flat saturated fills and heavy expanded type on
a concrete-grey page. The fills carry meaning. Yellow is staged, green is ok,
pink is a conflict, blue and violet are the two transactions in the race.

No build step. Serve the folder and open it:

```sh
python3 -m http.server 8000 --directory site
```

Then visit http://localhost:8000. Opening `index.html` from disk also works,
but browsers may block the web fonts on `file://`.

- `index.html` holds the content.
- `styles.css` holds the tokens (color, type, shape) at the top. The `.fill-*`
  classes sit at the end of the file on purpose, so they win the cascade.
- `main.js` drives the "Run the race" stepper and the copy button. Its `STEPS`
  array mirrors what `src/transaction.rs` does.
- `fonts/` holds Archivo and Martian Mono (latin subsets). Both are under the
  SIL Open Font License; the license texts sit next to the files.

The facts on the page (test names, method signatures, the race) come from
`src/`. Update the page when those change.
