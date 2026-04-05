(function () {
  "use strict";

  const NAME_POOL = [
    "James",
    "Mary",
    "Robert",
    "Patricia",
    "John",
    "Jennifer",
    "Michael",
    "Linda",
    "David",
    "Elizabeth",
    "William",
    "Barbara",
    "Richard",
    "Susan",
    "Joseph",
    "Jessica",
    "Thomas",
    "Sarah",
    "Charles",
    "Karen",
    "Christopher",
    "Lisa",
    "Daniel",
    "Nancy",
    "Matthew",
    "Betty",
    "Anthony",
    "Margaret",
    "Mark",
    "Sandra",
    "Donald",
    "Ashley",
    "Steven",
    "Kimberly",
    "Paul",
    "Emily",
    "Andrew",
    "Donna",
    "Joshua",
    "Michelle",
    "Kenneth",
    "Dorothy",
    "Kevin",
    "Carol",
    "Brian",
    "Amanda",
    "George",
    "Melissa",
    "Timothy",
    "Deborah",
    "Ronald",
    "Stephanie",
    "Jason",
    "Rebecca",
    "Edward",
    "Sharon",
    "Jeffrey",
    "Laura",
    "Ryan",
    "Cynthia",
    "Jacob",
    "Kathleen",
    "Gary",
    "Amy",
    "Nicholas",
    "Angela",
    "Eric",
    "Shirley",
    "Jonathan",
    "Anna",
    "Stephen",
    "Brenda",
    "Larry",
    "Pamela",
    "Justin",
    "Emma",
    "Scott",
    "Nicole",
    "Brandon",
    "Helen",
    "Benjamin",
    "Samantha",
    "Samuel",
    "Katherine",
    "Frank",
    "Christine",
    "Gregory",
    "Debra",
    "Raymond",
    "Rachel",
    "Alexander",
    "Carolyn",
    "Patrick",
    "Janet",
    "Jack",
    "Catherine",
    "Dennis",
    "Maria",
    "Jerry",
    "Heather",
  ];

  const COLS = 5;
  const SWAP_DELAY_MS = 380;

  const topRow = document.getElementById("top-row");
  const bottomRow = document.getElementById("bottom-row");
  const btnStart = document.getElementById("btn-start");
  const btnCheck = document.getElementById("btn-check");
  const btnReset = document.getElementById("btn-reset");
  const statusEl = document.getElementById("status");

  /** @type {string[]} name at column i at game start (paired with number i+1) */
  let originalNames = [];
  let phase = "idle"; // idle | swapping | play
  /** @type {{ card: HTMLElement, offsetX: number, offsetY: number, pointerId: number, placeholder: HTMLElement } | null} */
  let pointerDrag = null;
  /** Bumped on Reset to cancel an in-flight shuffle */
  let swapRunId = 0;

  function shuffle(arr) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  function pickFiveNames() {
    const shuffled = shuffle(NAME_POOL);
    return shuffled.slice(0, COLS);
  }

  function createSlot(rowEl) {
    const slot = document.createElement("div");
    slot.className = "slot";
    rowEl.appendChild(slot);
    return slot;
  }

  function createNumberCard(num, faceDown) {
    const card = document.createElement("div");
    card.className = "card number" + (faceDown ? " face-down" : "");
    card.dataset.kind = "number";
    card.dataset.value = String(num);
    if (faceDown) {
      const span = document.createElement("span");
      span.className = "face-down-label";
      span.textContent = String(num);
      card.appendChild(span);
    } else {
      card.textContent = String(num);
    }
    return card;
  }

  function createNameCard(name) {
    const card = document.createElement("div");
    card.className = "card name";
    card.dataset.kind = "name";
    card.dataset.name = name;
    card.textContent = name;
    return card;
  }

  function clearRow(rowEl) {
    rowEl.innerHTML = "";
  }

  function getSlotCard(slot) {
    return slot.querySelector(".card");
  }

  function isNumberCard(card) {
    return card && card.dataset.kind === "number";
  }

  function isNameCard(card) {
    return card && card.dataset.kind === "name";
  }

  function topAllNamesBottomAllNumbers() {
    const tops = [...topRow.children].map(getSlotCard);
    const bottoms = [...bottomRow.children].map(getSlotCard);
    if (tops.some((c) => !c) || bottoms.some((c) => !c)) return false;
    return tops.every(isNameCard) && bottoms.every(isNumberCard);
  }

  function setStatus(text, cls) {
    statusEl.textContent = text;
    statusEl.className = "status" + (cls ? " " + cls : "");
  }

  function setupInitialBoard() {
    phase = "idle";
    originalNames = pickFiveNames();
    clearRow(topRow);
    clearRow(bottomRow);

    for (let i = 0; i < COLS; i++) {
      const topSlot = createSlot(topRow);
      topSlot.appendChild(createNumberCard(i + 1, true));
    }
    for (let i = 0; i < COLS; i++) {
      const bottomSlot = createSlot(bottomRow);
      bottomSlot.appendChild(createNameCard(originalNames[i]));
    }

    btnStart.disabled = false;
    btnCheck.disabled = true;
    setStatus("Press Start to shuffle.", "info");
    teardownDnD();
  }

  function sleep(ms) {
    return new Promise((r) => setTimeout(r, ms));
  }

  async function animateSwap(cardA, cardB) {
    cardA.classList.add("swapping");
    cardB.classList.add("swapping");
    await sleep(SWAP_DELAY_MS);
    cardA.classList.remove("swapping");
    cardB.classList.remove("swapping");
  }

  async function runShuffleSwaps() {
    const myRun = ++swapRunId;
    phase = "swapping";
    btnStart.disabled = true;
    btnCheck.disabled = true;
    setStatus("Shuffling…", "info");

    let guard = 0;
    const maxIterations = 500;

    while (!topAllNamesBottomAllNumbers() && guard < maxIterations) {
      if (swapRunId !== myRun) return;
      guard++;
      const topSlots = [...topRow.children];
      const bottomSlots = [...bottomRow.children];
      const topWithNum = topSlots.filter((s) => isNumberCard(getSlotCard(s)));
      const bottomWithName = bottomSlots.filter((s) => isNameCard(getSlotCard(s)));

      if (topWithNum.length === 0 || bottomWithName.length === 0) break;

      const ti = topWithNum[Math.floor(Math.random() * topWithNum.length)];
      const bj = bottomWithName[Math.floor(Math.random() * bottomWithName.length)];

      const cardTop = getSlotCard(ti);
      const cardBottom = getSlotCard(bj);

      await animateSwap(cardTop, cardBottom);
      if (swapRunId !== myRun) return;
      ti.appendChild(cardBottom);
      bj.appendChild(cardTop);
    }

    if (swapRunId !== myRun) return;
    phase = "play";
    btnStart.disabled = false;
    btnCheck.disabled = false;
    setStatus(
      "Drag each name onto the hidden number it started above, then tap Check.",
      "info"
    );
    setupDnD();
  }

  function slotForBottomSlot(slot) {
    return slot.closest("#bottom-row .slot");
  }

  function clearSlotHighlights() {
    bottomRow.querySelectorAll(".slot").forEach((s) => {
      s.classList.remove("drag-over", "invalid-drop");
    });
  }

  /** @param {number} clientX @param {number} clientY */
  function slotFromPoint(clientX, clientY) {
    const el = document.elementFromPoint(clientX, clientY);
    if (!el) return null;
    const slot = el.closest("#bottom-row .slot");
    return slot || null;
  }

  function moveNameToSlot(card, slot) {
    if (!card || !slot || !slotForBottomSlot(slot)) return false;
    const numCard = slot.querySelector(".card.number");
    if (!numCard) return false;

    const existingName = slot.querySelector(".card.name");
    const sourceSlot = card.parentElement;

    if (existingName && existingName !== card) {
      if (sourceSlot && sourceSlot.classList.contains("slot")) {
        sourceSlot.appendChild(existingName);
      }
    }

    slot.appendChild(card);
    setStatus("", "");
    return true;
  }

  function abortPointerDrag() {
    if (!pointerDrag) return;
    const { card, pointerId, placeholder } = pointerDrag;
    window.removeEventListener("pointermove", onPointerMoveWindow);
    window.removeEventListener("pointerup", onPointerUpWindow);
    window.removeEventListener("pointercancel", onPointerUpWindow);
    try {
      card.releasePointerCapture(pointerId);
    } catch (_) {
      /* already released */
    }
    if (placeholder && placeholder.parentNode) placeholder.remove();
    clearSlotHighlights();
    card.style.position = "";
    card.style.left = "";
    card.style.top = "";
    card.style.width = "";
    card.style.height = "";
    card.style.zIndex = "";
    card.style.pointerEvents = "";
    card.style.margin = "";
    card.classList.remove("dragging");
    pointerDrag = null;
  }

  function onPointerMoveWindow(e) {
    if (!pointerDrag || e.pointerId !== pointerDrag.pointerId) return;
    const { card, offsetX, offsetY } = pointerDrag;
    card.style.left = e.clientX - offsetX + "px";
    card.style.top = e.clientY - offsetY + "px";

    clearSlotHighlights();
    const slot = slotFromPoint(e.clientX, e.clientY);
    if (slot && slot.querySelector(".card.number")) {
      slot.classList.add("drag-over");
    }
  }

  /** @param {PointerEvent} e */
  function onPointerUpWindow(e) {
    if (!pointerDrag || e.pointerId !== pointerDrag.pointerId) return;
    const { card, pointerId, placeholder } = pointerDrag;

    window.removeEventListener("pointermove", onPointerMoveWindow);
    window.removeEventListener("pointerup", onPointerUpWindow);
    window.removeEventListener("pointercancel", onPointerUpWindow);

    try {
      card.releasePointerCapture(pointerId);
    } catch (_) {
      /* already released */
    }

    if (placeholder && placeholder.parentNode) placeholder.remove();
    clearSlotHighlights();

    if (e.type !== "pointercancel") {
      const dropSlot = slotFromPoint(e.clientX, e.clientY);
      if (dropSlot) moveNameToSlot(card, dropSlot);
    }

    card.style.position = "";
    card.style.left = "";
    card.style.top = "";
    card.style.width = "";
    card.style.height = "";
    card.style.zIndex = "";
    card.style.pointerEvents = "";
    card.style.margin = "";
    card.classList.remove("dragging");
    pointerDrag = null;
  }

  /** @param {PointerEvent} e */
  function onPointerDownName(e) {
    if (phase !== "play" || pointerDrag) return;
    if (e.pointerType === "mouse" && e.button !== 0) return;
    const card = e.target.closest(".card.name");
    if (!card) return;

    e.preventDefault();

    const rect = card.getBoundingClientRect();
    const placeholder = document.createElement("div");
    placeholder.setAttribute("aria-hidden", "true");
    placeholder.className = "drag-placeholder";
    placeholder.style.width = rect.width + "px";
    placeholder.style.height = rect.height + "px";
    placeholder.style.margin = "0 auto";
    placeholder.style.flexShrink = "0";
    card.parentElement.insertBefore(placeholder, card);

    pointerDrag = {
      card,
      offsetX: e.clientX - rect.left,
      offsetY: e.clientY - rect.top,
      pointerId: e.pointerId,
      placeholder,
    };

    card.classList.add("dragging");
    card.style.boxSizing = "border-box";
    card.style.position = "fixed";
    card.style.left = rect.left + "px";
    card.style.top = rect.top + "px";
    card.style.width = rect.width + "px";
    card.style.height = rect.height + "px";
    card.style.zIndex = "1000";
    card.style.pointerEvents = "none";
    card.style.margin = "0";

    card.setPointerCapture(e.pointerId);

    window.addEventListener("pointermove", onPointerMoveWindow);
    window.addEventListener("pointerup", onPointerUpWindow);
    window.addEventListener("pointercancel", onPointerUpWindow);
  }

  function setupDnD() {
    teardownDnD();

    const rowsEl = document.querySelector(".rows");
    if (rowsEl) rowsEl.classList.add("can-drag");

    topRow.querySelectorAll(".card.name").forEach((card) => {
      card.addEventListener("pointerdown", onPointerDownName);
    });
    bottomRow.querySelectorAll(".card.name").forEach((card) => {
      card.addEventListener("pointerdown", onPointerDownName);
    });
  }

  function teardownDnD() {
    abortPointerDrag();

    const rowsEl = document.querySelector(".rows");
    if (rowsEl) rowsEl.classList.remove("can-drag");

    topRow.querySelectorAll(".card.name").forEach((card) => {
      card.removeEventListener("pointerdown", onPointerDownName);
      card.classList.remove("dragging");
    });
    bottomRow.querySelectorAll(".card.name").forEach((card) => {
      card.removeEventListener("pointerdown", onPointerDownName);
      card.classList.remove("dragging");
    });
    bottomRow.querySelectorAll(".slot").forEach((slot) => {
      slot.classList.remove("drag-over", "invalid-drop");
    });
  }

  function checkAnswer() {
    if (phase !== "play") return;

    const bottomSlots = [...bottomRow.children];
    let allFilled = true;
    for (const slot of bottomSlots) {
      const nameCard = slot.querySelector(".card.name");
      const numCard = slot.querySelector(".card.number");
      if (!nameCard || !numCard) {
        allFilled = false;
        break;
      }
    }

    if (!allFilled) {
      setStatus("Place every name on a number card first.", "info");
      return;
    }

    let ok = true;
    for (let i = 0; i < COLS; i++) {
      const slot = bottomSlots[i];
      const numCard = slot.querySelector(".card.number");
      const nameCard = slot.querySelector(".card.name");
      const num = parseInt(numCard.dataset.value, 10);
      const placedName = nameCard.dataset.name;
      const expectedName = originalNames[num - 1];
      if (placedName !== expectedName) {
        ok = false;
        break;
      }
    }

    if (ok) {
      setStatus("Success! Every name is on its original number.", "success");
    } else {
      setStatus("Fail — at least one name is on the wrong number.", "fail");
    }
  }

  btnStart.addEventListener("click", () => {
    if (phase === "swapping") return;
    if (phase === "idle") {
      runShuffleSwaps();
      return;
    }
    setupInitialBoard();
    runShuffleSwaps();
  });

  btnCheck.addEventListener("click", checkAnswer);

  btnReset.addEventListener("click", () => {
    swapRunId++;
    setupInitialBoard();
  });

  setupInitialBoard();
})();
