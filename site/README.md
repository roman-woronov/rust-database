# Project site

A one-page static site for rust-database in a Y2K style: liquid chrome,
holographic edges, a Bondi-blue gadget and Windows-2000-style dialogs on a
deep-space navy page.

What it shows, all taken from `src/`:

- **Hero**: a WebGL scene of three chrome metaballs (T1, T2 and the store)
  that merge as they orbit. A fourth blob follows the pointer.
- **The other Y2K bug**: the Version-o-matic 2000 plays the ledger for one
  key. Delete resets the version, so the key comes back at v01.
- **Millennium console**: two transactions race on one counter. Press Start
  to play it, or step with the taskbar. Packets fly between the windows and
  step t6 ends in the commit error dialog. Sound is off until you turn it on.
- **Specs, system check, known issues**: the API, the `cargo test` result
  and the open issues.

No build step. Serve the folder and open it:

```sh
python3 -m http.server 8000 --directory site
```

Then visit http://localhost:8000.

- `index.html` holds the content.
- `styles.css` holds the tokens (color, type, bevels) at the top.
- `chrome.js` is the WebGL hero. It falls back to a CSS blob without WebGL,
  draws one still frame when reduced motion is on, and pauses off screen.
- `main.js` drives the console race, the gadget, window minimize, sound and
  copy. Its `STEPS` array mirrors what `src/transaction.rs` does.
- `fonts/` holds Orbitron, Silkscreen and VT323 (latin subsets), all under
  the SIL Open Font License. Body text uses the system's Verdana or Tahoma.
