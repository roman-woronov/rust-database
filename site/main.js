// Two small enhancements. The page reads the same without them.

(() => {
  const STORAGE_KEY = "rust-database:grid";
  const toggle = document.getElementById("grid-toggle");
  const overlay = document.getElementById("grid-overlay");

  function setGrid(on) {
    overlay.hidden = !on;
    toggle.setAttribute("aria-pressed", String(on));
    try {
      localStorage.setItem(STORAGE_KEY, on ? "1" : "0");
    } catch {
      // Storage can be unavailable; the toggle still works for this visit.
    }
  }

  let saved = false;
  try {
    saved = localStorage.getItem(STORAGE_KEY) === "1";
  } catch {
    saved = false;
  }

  toggle.hidden = false;
  setGrid(saved);

  toggle.addEventListener("click", () => setGrid(overlay.hidden));

  document.addEventListener("keydown", (event) => {
    if (event.key !== "g" && event.key !== "G") return;
    if (event.metaKey || event.ctrlKey || event.altKey) return;
    if (event.target.closest("input, textarea, select, [contenteditable]")) return;
    setGrid(overlay.hidden);
  });

  // Copy the clone-and-test commands.
  const copy = document.getElementById("copy-run");
  const block = document.getElementById("run-cmd");
  const label = copy.textContent;
  let timer;

  function flash(text) {
    copy.textContent = text;
    clearTimeout(timer);
    timer = setTimeout(() => {
      copy.textContent = label;
    }, 1600);
  }

  function selectBlock() {
    const range = document.createRange();
    range.selectNodeContents(block);
    const selection = window.getSelection();
    selection.removeAllRanges();
    selection.addRange(range);
  }

  copy.hidden = false;
  copy.addEventListener("click", () => {
    const text = copy.dataset.copy;
    if (!navigator.clipboard) {
      selectBlock();
      flash("Selected, press Ctrl+C");
      return;
    }
    navigator.clipboard.writeText(text).then(
      () => flash("Copied"),
      () => {
        selectBlock();
        flash("Selected, press Ctrl+C");
      },
    );
  });
})();
