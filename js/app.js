document.addEventListener("DOMContentLoaded", () => {
  // Elements
  const algorithmSelect = document.getElementById("algorithm-select");
  const speedInput = document.getElementById("speed-input");
  const newArrayBtn = document.getElementById("new-array");
  const playPauseBtn = document.getElementById("play-pause");
  const stepBtn = document.getElementById("step-button");
  const resetBtn = document.getElementById("reset-button");
  const statusEl = document.getElementById("operation-status");
  const stepCountEl = document.getElementById("step-count");
  const barChart = document.getElementById("bar-chart");
  const loadButtons = document.querySelectorAll("[data-load-algorithm]");

  // State
  let array = [];
  let originalArray = [];
  let steps = [];
  let currentStep = 0;
  let isPlaying = false;
  let timer = null;

  // Speeds in ms (Inverted: range 1-5 -> 600ms to 100ms)
  const getDelay = () => 700 - speedInput.value * 120;

  // Generate Array
  function generateArray(size = 12) {
    array = Array.from({ length: size }, () => Math.floor(Math.random() * 80) + 20);
    originalArray = [...array];
    resetState();
  }

  function resetState() {
    stop();
    array = [...originalArray];
    steps = generateSteps(algorithmSelect.value, [...array]);
    currentStep = 0;
    renderBars(array);
    updateMeta("Ready to start.", 0);
  }

  // Pre-generate steps for visualization
  function generateSteps(algo, arr) {
    const history = [];
    
    if (algo === "bubble") {
      let n = arr.length;
      for (let i = 0; i < n; i++) {
        for (let j = 0; j < n - i - 1; j++) {
          history.push({ type: "compare", indices: [j, j + 1], array: [...arr] });
          if (arr[j] > arr[j + 1]) {
            [arr[j], arr[j + 1]] = [arr[j + 1], arr[j]];
            history.push({ type: "swap", indices: [j, j + 1], array: [...arr] });
          }
        }
        history.push({ type: "sorted", index: n - 1 - i, array: [...arr] });
      }
    } else if (algo === "selection") {
      let n = arr.length;
      for (let i = 0; i < n; i++) {
        let minIdx = i;
        history.push({ type: "target", indices: [minIdx], array: [...arr] });
        for (let j = i + 1; j < n; j++) {
          history.push({ type: "compare", indices: [j, minIdx], array: [...arr] });
          if (arr[j] < arr[minIdx]) {
            minIdx = j;
            history.push({ type: "target", indices: [minIdx], array: [...arr] });
          }
        }
        if (minIdx !== i) {
          [arr[i], arr[minIdx]] = [arr[minIdx], arr[i]];
          history.push({ type: "swap", indices: [i, minIdx], array: [...arr] });
        }
        history.push({ type: "sorted", index: i, array: [...arr] });
      }
    } else if (algo === "insertion") {
      let n = arr.length;
      history.push({ type: "sorted", index: 0, array: [...arr] });
      for (let i = 1; i < n; i++) {
        let key = arr[i];
        let j = i - 1;
        history.push({ type: "target", indices: [i], array: [...arr] });
        while (j >= 0 && arr[j] > key) {
          history.push({ type: "compare", indices: [j, j + 1], array: [...arr] });
          arr[j + 1] = arr[j];
          j--;
          history.push({ type: "swap", indices: [j + 1, j + 2], array: [...arr] });
        }
        arr[j + 1] = key;
      }
      for (let i = 0; i < n; i++) {
        history.push({ type: "sorted", index: i, array: [...arr] });
      }
    }
    return history;
  }

  // Render Bar Elements
  function renderBars(arr, highlights = {}) {
    barChart.innerHTML = "";
    const maxVal = Math.max(...arr, 100);

    arr.forEach((val, i) => {
      const bar = document.createElement("div");
      bar.className = "bar";
      bar.style.height = `${(val / maxVal) * 100}%`;
      bar.textContent = val;

      if (highlights.active && highlights.active.includes(i)) {
        bar.classList.add("bar-active");
      }
      if (highlights.target && highlights.target.includes(i)) {
        bar.classList.add("bar-candidate");
      }
      if (highlights.changed && highlights.changed.includes(i)) {
        bar.classList.add("bar-changed");
      }
      if (highlights.sorted && highlights.sorted.includes(i)) {
        bar.classList.add("bar-sorted");
      }

      barChart.appendChild(bar);
    });
  }

  // Animation Control
  function step() {
    if (currentStep >= steps.length) {
      stop();
      updateMeta("Sorting completed!", steps.length);
      renderBars(array, { sorted: array.map((_, i) => i) });
      return;
    }

    const state = steps[currentStep];
    const highlights = {};

    if (state.type === "compare") highlights.active = state.indices;
    if (state.type === "target") highlights.target = state.indices;
    if (state.type === "swap") highlights.changed = state.indices;

    renderBars(state.array, highlights);
    currentStep++;
    updateMeta(`Step ${currentStep}: ${state.type}`, currentStep);
  }

  function play() {
    if (currentStep >= steps.length) resetState();
    isPlaying = true;
    playPauseBtn.textContent = "Pause";
    timer = setInterval(() => {
      if (currentStep < steps.length) {
        step();
      } else {
        stop();
      }
    }, getDelay());
  }

  function stop() {
    isPlaying = false;
    playPauseBtn.textContent = "Start";
    if (timer) clearInterval(timer);
  }

  function updateMeta(statusText, stepNum) {
    statusEl.textContent = statusText;
    stepCountEl.textContent = `Step ${stepNum} of ${steps.length}`;
  }

  // Event Listeners
  playPauseBtn.addEventListener("click", () => (isPlaying ? stop() : play()));
  stepBtn.addEventListener("click", () => { stop(); step(); });
  resetBtn.addEventListener("click", resetState);
  newArrayBtn.addEventListener("click", () => generateArray());
  
  algorithmSelect.addEventListener("change", resetState);
  speedInput.addEventListener("change", () => {
    if (isPlaying) { stop(); play(); }
  });

  loadButtons.forEach((btn) => {
    btn.addEventListener("click", (e) => {
      const algo = e.target.getAttribute("data-load-algorithm");
      if (algo) {
        algorithmSelect.value = algo;
        resetState();
        document.getElementById("playground").scrollIntoView({ behavior: "smooth" });
      }
    });
  });

  // Initialize
  generateArray();
});