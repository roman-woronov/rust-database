// The millennium console (the race), the Version-o-matic gadget, window
// minimize buttons, optional sound and the copy button. Without this file
// the page still shows step t1, the full event log and the final ledger.

(() => {
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

  // Sound: off until the visitor turns it on, so the first click unlocks audio.

  let audio = null;
  const soundButton = document.getElementById("sound");

  function tone(freq, start, length, type = "square", gain = 0.05) {
    const osc = audio.createOscillator();
    const amp = audio.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    amp.gain.setValueAtTime(gain, audio.currentTime + start);
    amp.gain.exponentialRampToValueAtTime(0.0001, audio.currentTime + start + length);
    osc.connect(amp).connect(audio.destination);
    osc.start(audio.currentTime + start);
    osc.stop(audio.currentTime + start + length + 0.02);
  }

  function play(name) {
    if (!audio) return;
    if (name === "blip") tone(1320, 0, 0.06, "triangle", 0.04);
    if (name === "ok") {
      tone(660, 0, 0.1, "sine", 0.08);
      tone(990, 0.1, 0.18, "sine", 0.08);
    }
    if (name === "err") {
      tone(440, 0, 0.12);
      tone(311, 0.13, 0.26);
    }
  }

  soundButton.addEventListener("click", () => {
    const on = soundButton.getAttribute("aria-pressed") !== "true";
    soundButton.setAttribute("aria-pressed", String(on));
    soundButton.textContent = on ? "Sound on" : "Sound off";
    if (on && !audio) {
      const Context = window.AudioContext || window.webkitAudioContext;
      audio = Context ? new Context() : null;
    } else if (!on && audio) {
      audio.close();
      audio = null;
    }
    if (on) play("blip");
  });

  // Minimize buttons on every window.

  document.querySelectorAll("[data-min]").forEach((button) => {
    button.addEventListener("click", () => {
      const win = button.closest(".win");
      const minimized = win.classList.toggle("min");
      button.setAttribute("aria-expanded", String(!minimized));
      button.textContent = minimized ? "□" : "_";
    });
  });

  // The race. State after each step mirrors src/transaction.rs when two
  // transactions both read "counter" at v1 and both try to write "1".

  const STEPS = [
    {
      clock: "t1",
      store: ['"0"', 1],
      t1: ["open", "counter: v1", "none"],
      t2: ["not started", "none", "none"],
      mark: { "t1-reads": "hot" },
      packet: { from: "store", to: "t1", label: "read v1" },
      sound: "blip",
    },
    {
      clock: "t2",
      store: ['"0"', 1],
      t1: ["open", "counter: v1", "none"],
      t2: ["open", "counter: v1", "none"],
      mark: { "t2-reads": "hot" },
      packet: { from: "store", to: "t2", label: "read v1" },
      sound: "blip",
    },
    {
      clock: "t3",
      store: ['"0"', 1],
      t1: ["open", "counter: v1", 'counter = "1"'],
      t2: ["open", "counter: v1", "none"],
      mark: { "t1-pending": "hot" },
    },
    {
      clock: "t4",
      store: ['"1"', 2],
      bumped: true,
      t1: ["committed, Ok(())", "counter: v1", "applied"],
      t2: ["open", "counter: v1", "none"],
      mark: { "t1-status": "good" },
      packet: { from: "t1", to: "store", label: 'write "1"' },
      sound: "ok",
    },
    {
      clock: "t5",
      store: ['"1"', 2],
      t1: ["committed, Ok(())", "counter: v1", "applied"],
      t2: ["open", "counter: v1", 'counter = "1"'],
      mark: { "t2-pending": "hot" },
    },
    {
      clock: "t6",
      store: ['"1"', 2],
      t1: ["committed, Ok(())", "counter: v1", "applied"],
      t2: ["Err(Conflict)", "counter: v1, now v2", "discarded"],
      mark: { "t2-status": "bad" },
      packet: { from: "t2", to: "store", label: 'write "1"', reject: true },
      sound: "err",
      dialog: true,
    },
  ];

  const desktop = document.getElementById("desktop");
  const field = (name) => desktop.querySelector(`[data-field="${name}"]`);
  const windows = {
    t1: document.getElementById("win-t1"),
    t2: document.getElementById("win-t2"),
    store: document.getElementById("win-store"),
  };
  const lcd = document.getElementById("store-lcd");
  const dialog = document.getElementById("err-dialog");
  const okButton = document.getElementById("err-ok");
  const logButtons = [...document.querySelectorAll("#race-log button")];
  const playButton = document.getElementById("race-play");
  const playLabel = document.getElementById("race-play-label");
  const back = document.getElementById("race-back");
  const next = document.getElementById("race-next");
  const reset = document.getElementById("race-reset");
  const clock = document.getElementById("race-clock");

  let current = 0;
  let run = 0;
  let playing = false;

  function renderStore(store, bumped) {
    field("store-value").textContent = store[0];
    const ver = field("store-ver");
    ver.textContent = `v${store[1]}`;
    ver.classList.toggle("bumped", Boolean(bumped));
  }

  function render(index, { holdStore = false } = {}) {
    const step = STEPS[index];
    for (const who of ["t1", "t2"]) {
      ["status", "reads", "pending"].forEach((key, i) => {
        const el = field(`${who}-${key}`);
        el.textContent = step[who][i];
        el.className = `sunken ${step.mark[`${who}-${key}`] || ""}`.trim();
      });
    }
    if (holdStore) renderStore(STEPS[index - 1].store, STEPS[index - 1].bumped);
    else renderStore(step.store, step.bumped);

    logButtons.forEach((button, i) => {
      if (i === index) button.setAttribute("aria-current", "step");
      else button.removeAttribute("aria-current");
    });
    clock.textContent = `${step.clock} of 6`;
    back.disabled = index === 0;
    next.disabled = index === STEPS.length - 1;
  }

  function centerOf(win) {
    const target = win.classList.contains("min") ? win.querySelector(".titlebar") : win.querySelector(".win-body");
    const box = target.getBoundingClientRect();
    const frame = desktop.getBoundingClientRect();
    return { x: box.left - frame.left + box.width / 2, y: box.top - frame.top + box.height / 2 };
  }

  async function fly(packet) {
    const orb = document.createElement("span");
    orb.className = packet.reject ? "packet reject" : "packet";
    orb.textContent = packet.label;
    desktop.appendChild(orb);
    const from = centerOf(windows[packet.from]);
    const to = centerOf(windows[packet.to]);
    orb.style.left = `${from.x - orb.offsetWidth / 2}px`;
    orb.style.top = `${from.y - orb.offsetHeight / 2}px`;
    const dx = to.x - from.x;
    const dy = to.y - from.y;
    const frames = packet.reject
      ? [
          { transform: "translate(0, 0) scale(0.6)" },
          { transform: `translate(${dx * 0.86}px, ${dy * 0.86}px) scale(1.1)`, offset: 0.55 },
          { transform: `translate(${dx * 0.7}px, ${dy * 0.7 - 30}px) scale(1)`, offset: 0.72 },
          { transform: `translate(${dx * 0.15}px, ${dy * 0.15 + 20}px) scale(0.5)`, opacity: 0 },
        ]
      : [
          { transform: "translate(0, 0) scale(0.6)" },
          { transform: `translate(${dx * 0.5}px, ${dy * 0.5 - 40}px) scale(1.1)`, offset: 0.5 },
          { transform: `translate(${dx}px, ${dy}px) scale(0.8)`, opacity: 0.2 },
        ];
    try {
      await orb.animate(frames, { duration: packet.reject ? 1100 : 800, easing: "cubic-bezier(.3,.7,.3,1)" }).finished;
    } catch {
      // Cancelled; nothing to do.
    }
    orb.remove();
  }

  function openDialog(focus) {
    dialog.hidden = false;
    if (focus) okButton.focus({ preventScroll: true });
  }

  function closeDialog() {
    dialog.hidden = true;
  }

  async function show(index, { animate = false, focus = false } = {}) {
    index = Math.max(0, Math.min(STEPS.length - 1, index));
    const id = ++run;
    current = index;
    const step = STEPS[index];
    closeDialog();
    desktop.querySelectorAll(".packet").forEach((orb) => orb.remove());

    const motion = animate && step.packet && !reduceMotion.matches;
    const storeWaits = motion && step.packet.to === "store" && !step.packet.reject;
    render(index, { holdStore: storeWaits });

    if (motion) {
      await fly(step.packet);
      if (id !== run) return;
      if (storeWaits) {
        renderStore(step.store, step.bumped);
        lcd.classList.remove("flash");
        void lcd.offsetWidth;
        lcd.classList.add("flash");
      }
    }
    if (animate) play(step.sound);
    if (step.dialog) openDialog(focus);
  }

  function stop() {
    playing = false;
    playLabel.textContent = "Start";
  }

  async function autoplay() {
    if (playing) {
      stop();
      return;
    }
    playing = true;
    playLabel.textContent = "Pause";
    if (current === STEPS.length - 1) {
      await show(0, { animate: true });
    }
    while (playing && current < STEPS.length - 1) {
      await wait(1400);
      if (!playing) break;
      await show(current + 1, { animate: true });
    }
    stop();
  }

  playButton.addEventListener("click", autoplay);
  next.addEventListener("click", () => {
    stop();
    show(current + 1, { animate: true, focus: true });
  });
  back.addEventListener("click", () => {
    stop();
    show(current - 1);
  });
  reset.addEventListener("click", () => {
    stop();
    show(0);
  });
  logButtons.forEach((button, i) =>
    button.addEventListener("click", () => {
      stop();
      show(i, { animate: true, focus: true });
    }),
  );
  okButton.addEventListener("click", () => {
    closeDialog();
    back.focus({ preventScroll: true });
  });
  dialog.addEventListener("keydown", (event) => {
    if (event.key === "Escape") okButton.click();
  });

  document.getElementById("taskbar").hidden = false;
  render(0);

  // Version-o-matic: the ledger for key "k", one operation at a time.

  const OPS = [
    { op: 'insert("k", "a")', val: '"a"', ver: "v01", flag: "" },
    { op: 'insert("k", "b")', val: '"b"', ver: "v02", flag: "" },
    { op: 'delete("k")', val: "none", ver: "v--", flag: "entry gone, version too" },
    { op: 'insert("k", "c")', val: '"c"', ver: "v01", flag: "ROLLOVER: back to v01", warn: true },
  ];

  const lcdOp = document.getElementById("lcd-op");
  const lcdVal = document.getElementById("lcd-val");
  const lcdVer = document.getElementById("lcd-ver");
  const lcdFlag = document.getElementById("lcd-flag");
  const keys = [...document.querySelectorAll("#gadget .key")];
  const runAll = document.getElementById("gadget-run");
  let sequence = 0;

  function setOp(index) {
    const state = OPS[index];
    lcdOp.textContent = state.op;
    lcdVal.textContent = state.val;
    lcdVer.textContent = state.ver;
    lcdFlag.textContent = state.flag;
    lcdFlag.classList.toggle("on", Boolean(state.warn));
    keys.forEach((key, i) => key.setAttribute("aria-pressed", String(i === index)));
  }

  keys.forEach((key, i) =>
    key.addEventListener("click", () => {
      sequence++;
      setOp(i);
    }),
  );

  runAll.addEventListener("click", async () => {
    const id = ++sequence;
    for (let i = 0; i < OPS.length; i++) {
      if (id !== sequence) return;
      setOp(i);
      play(i === OPS.length - 1 ? "err" : "blip");
      await wait(reduceMotion.matches ? 600 : 1000);
    }
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
