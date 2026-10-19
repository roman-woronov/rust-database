// The race stepper and the copy button. Without this file the page still
// shows step t1 and the full log.

(() => {
  // State after each step. Mirrors what src/transaction.rs does when two
  // transactions both read "counter" (v1) and both try to write "1".
  const STEPS = [
    {
      store: ['"0"', 1],
      t1: ["open", "counter: v1", "none"],
      t2: ["not started", "none", "none"],
      mark: { "t1-reads": "hot" },
    },
    {
      store: ['"0"', 1],
      t1: ["open", "counter: v1", "none"],
      t2: ["open", "counter: v1", "none"],
      mark: { "t2-reads": "hot" },
    },
    {
      store: ['"0"', 1],
      t1: ["open", "counter: v1", 'counter = "1"'],
      t2: ["open", "counter: v1", "none"],
      mark: { "t1-pending": "hot" },
    },
    {
      store: ['"1"', 2],
      bumped: true,
      t1: ["committed, Ok(())", "counter: v1", "applied"],
      t2: ["open", "counter: v1", "none"],
      mark: { "t1-status": "good" },
    },
    {
      store: ['"1"', 2],
      t1: ["committed, Ok(())", "counter: v1", "applied"],
      t2: ["open", "counter: v1", 'counter = "1"'],
      mark: { "t2-pending": "hot" },
    },
    {
      store: ['"1"', 2],
      t1: ["committed, Ok(())", "counter: v1", "applied"],
      t2: ["Err(Conflict)", "counter: v1 (now v2)", "discarded"],
      mark: { "t2-status": "bad" },
    },
  ];

  const field = (name) => document.querySelector(`[data-field="${name}"]`);
  const logButtons = [...document.querySelectorAll("#race-log button")];
  const back = document.getElementById("race-back");
  const next = document.getElementById("race-next");
  const reset = document.getElementById("race-reset");
  const counter = document.getElementById("race-counter");
  let current = 0;

  function show(index) {
    current = Math.max(0, Math.min(STEPS.length - 1, index));
    const step = STEPS[current];

    for (const who of ["t1", "t2"]) {
      ["status", "reads", "pending"].forEach((key, i) => {
        const el = field(`${who}-${key}`);
        el.textContent = step[who][i];
        el.className = step.mark[`${who}-${key}`] || "";
      });
    }

    field("store-value").textContent = step.store[0];
    const ver = field("store-ver");
    ver.textContent = `v${step.store[1]}`;
    ver.classList.toggle("bumped", Boolean(step.bumped));

    logButtons.forEach((button, i) => {
      if (i === current) button.setAttribute("aria-current", "step");
      else button.removeAttribute("aria-current");
    });

    counter.textContent = `Step ${current + 1} of ${STEPS.length}`;
    back.disabled = current === 0;
    next.disabled = current === STEPS.length - 1;
  }

  back.addEventListener("click", () => show(current - 1));
  next.addEventListener("click", () => show(current + 1));
  reset.addEventListener("click", () => show(0));
  logButtons.forEach((button, i) => button.addEventListener("click", () => show(i)));

  document.getElementById("race-controls").hidden = false;
  show(0);

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
    if (!navigator.clipboard) {
      selectBlock();
      flash("Selected, press Ctrl+C");
      return;
    }
    navigator.clipboard.writeText(copy.dataset.copy).then(
      () => flash("Copied"),
      () => {
        selectBlock();
        flash("Selected, press Ctrl+C");
      },
    );
  });
})();
