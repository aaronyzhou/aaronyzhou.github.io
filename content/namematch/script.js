(function () {
  "use strict";

  const NAME_POOL = [
    "Alex",
    "Jordan",
    "Sam",
    "Riley",
    "Casey",
    "Morgan",
    "Quinn",
    "Avery",
    "Blake",
    "Cameron",
    "Drew",
    "Emery",
    "Finley",
    "Harper",
    "Indigo",
    "Jamie",
    "Kai",
    "Logan",
    "Noah",
    "Parker",
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
  let draggedCard = null;
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

  function setupDnD() {
    teardownDnD();

    topRow.querySelectorAll(".card.name").forEach((card) => {
      card.setAttribute("draggable", "true");
      card.addEventListener("dragstart", onDragStart);
      card.addEventListener("dragend", onDragEnd);
    });

    bottomRow.querySelectorAll(".slot").forEach((slot) => {
      slot.addEventListener("dragover", onDragOver);
      slot.addEventListener("dragleave", onDragLeave);
      slot.addEventListener("drop", onDrop);
    });
  }

  function teardownDnD() {
    document.querySelectorAll(".card.name").forEach((card) => {
      card.removeAttribute("draggable");
      card.removeEventListener("dragstart", onDragStart);
      card.removeEventListener("dragend", onDragEnd);
      card.classList.remove("dragging");
    });
    bottomRow.querySelectorAll(".slot").forEach((slot) => {
      slot.removeEventListener("dragover", onDragOver);
      slot.removeEventListener("dragleave", onDragLeave);
      slot.removeEventListener("drop", onDrop);
      slot.classList.remove("drag-over", "invalid-drop");
    });
    draggedCard = null;
  }

  function onDragStart(e) {
    if (phase !== "play") {
      e.preventDefault();
      return;
    }
    draggedCard = e.target.closest(".card.name");
    if (!draggedCard) return;
    draggedCard.classList.add("dragging");
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", draggedCard.dataset.name || "");
  }

  function onDragEnd() {
    if (draggedCard) draggedCard.classList.remove("dragging");
    draggedCard = null;
    bottomRow.querySelectorAll(".slot").forEach((s) => {
      s.classList.remove("drag-over", "invalid-drop");
    });
  }

  function onDragOver(e) {
    const slot = e.currentTarget;
    if (!slotForBottomSlot(slot)) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    slot.classList.add("drag-over");
  }

  function onDragLeave(e) {
    const slot = e.currentTarget;
    if (slot.contains(e.relatedTarget)) return;
    slot.classList.remove("drag-over", "invalid-drop");
  }

  function onDrop(e) {
    e.preventDefault();
    const slot = e.currentTarget;
    slot.classList.remove("drag-over");

    if (phase !== "play" || !draggedCard) return;

    const numCard = slot.querySelector(".card.number");
    if (!numCard) return;

    const existingName = slot.querySelector(".card.name");
    const sourceSlot = draggedCard.parentElement;

    if (existingName && existingName !== draggedCard) {
      if (sourceSlot && sourceSlot.classList.contains("slot")) {
        sourceSlot.appendChild(existingName);
      }
    }

    slot.appendChild(draggedCard);
    setStatus("", "");
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
