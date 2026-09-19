document.addEventListener("DOMContentLoaded", () => {
  const menuButton = document.querySelector(".menu-button");
  const navigation = document.querySelector(".site-nav");
  const algorithmSelect = document.querySelector("#algorithm-select");
  const speedInput = document.querySelector("#speed-input");
  const speedLabel = document.querySelector("#speed-label");
  const newArrayButton = document.querySelector("#new-array");
  const playPauseButton = document.querySelector("#play-pause");
  const stepButton = document.querySelector("#step-button");
  const resetButton = document.querySelector("#reset-button");
  const chart = document.querySelector("#bar-chart");
  const operationStatus = document.querySelector("#operation-status");
  const stepCount = document.querySelector("#step-count");
  const activeMethod = document.querySelector("#active-method");

  const state = {
    algorithm: "bubble",
    original: [],
    steps: [],
    index: 0,
    running: false,
    timer: null
  };

  const speedNames = ["Slowest", "Slow", "Medium", "Fast", "Fastest"];
  const speedDelays = [1200, 800, 500, 280, 140];

  const copyValues = (values) => values.slice();
  const sortedIndexes = (length) => Array.from({ length }, (_, index) => index);

  const makeStep = (values, message, options = {}) => ({
    values: copyValues(values),
    message,
    active: options.active || [],
    candidate: options.candidate || [],
    changed: options.changed || [],
    sorted: options.sorted || []
  });

  const bubbleSteps = (input) => {
    const values = copyValues(input);
    const steps = [makeStep(values, "Ready to compare adjacent values.")];
    const sorted = new Set();

    for (let end = values.length - 1; end > 0; end -= 1) {
      let swapped = false;
      for (let index = 0; index < end; index += 1) {
        steps.push(makeStep(values, `Comparing ${values[index]} and ${values[index + 1]}.`, { active: [index, index + 1], sorted: [...sorted] }));
        if (values[index] > values[index + 1]) {
          [values[index], values[index + 1]] = [values[index + 1], values[index]];
          swapped = true;
          steps.push(makeStep(values, `Swapped the pair because the left value was larger.`, { changed: [index, index + 1], sorted: [...sorted] }));
        }
      }
      sorted.add(end);
      steps.push(makeStep(values, `${values[end]} is fixed at the end of the unsorted region.`, { sorted: [...sorted] }));
      if (!swapped) {
        steps.push(makeStep(values, "No swaps were needed in this pass. The array is sorted.", { sorted: sortedIndexes(values.length) }));
        return steps;
      }
    }
    steps.push(makeStep(values, "All values are sorted.", { sorted: sortedIndexes(values.length) }));
    return steps;
  };

  const selectionSteps = (input) => {
    const values = copyValues(input);
    const steps = [makeStep(values, "Ready to find the smallest remaining value.")];
    const sorted = new Set();

    for (let start = 0; start < values.length - 1; start += 1) {
      let minimum = start;
      steps.push(makeStep(values, `Starting a scan at position ${start + 1}.`, { candidate: [minimum], sorted: [...sorted] }));
      for (let index = start + 1; index < values.length; index += 1) {
        steps.push(makeStep(values, `Comparing ${values[index]} with current minimum ${values[minimum]}.`, { active: [index], candidate: [minimum], sorted: [...sorted] }));
        if (values[index] < values[minimum]) {
          minimum = index;
          steps.push(makeStep(values, `${values[minimum]} is the new candidate minimum.`, { candidate: [minimum], sorted: [...sorted] }));
        }
      }
      if (minimum !== start) {
        [values[start], values[minimum]] = [values[minimum], values[start]];
        steps.push(makeStep(values, `Placed the minimum value at position ${start + 1}.`, { changed: [start, minimum], sorted: [...sorted] }));
      } else {
        steps.push(makeStep(values, `The current value is already the minimum for this position.`, { candidate: [start], sorted: [...sorted] }));
      }
      sorted.add(start);
      steps.push(makeStep(values, `Position ${start + 1} is now sorted.`, { sorted: [...sorted] }));
    }
    steps.push(makeStep(values, "All values are sorted.", { sorted: sortedIndexes(values.length) }));
    return steps;
  };

  const insertionSteps = (input) => {
    const values = copyValues(input);
    const steps = [makeStep(values, "The first value starts the sorted section.", { sorted: [0] })];

    for (let index = 1; index < values.length; index += 1) {
      const key = values[index];
      let position = index - 1;
      steps.push(makeStep(values, `Selected ${key} as the key to insert.`, { candidate: [index], sorted: Array.from({ length: index }, (_, item) => item) }));
      while (position >= 0 && values[position] > key) {
        values[position + 1] = values[position];
        steps.push(makeStep(values, `Shifted ${values[position]} right to make room for ${key}.`, { changed: [position, position + 1], candidate: [position + 1], sorted: Array.from({ length: index }, (_, item) => item) }));
        position -= 1;
      }
      values[position + 1] = key;
      steps.push(makeStep(values, `Inserted ${key} at position ${position + 2}.`, { changed: [position + 1], sorted: Array.from({ length: index + 1 }, (_, item) => item) }));
    }
    steps.push(makeStep(values, "All values are sorted.", { sorted: sortedIndexes(values.length) }));
    return steps;
  };

  const generators = { bubble: bubbleSteps, selection: selectionSteps, insertion: insertionSteps };
  const methodNames = { bubble: "bubble_sort", selection: "selection_sort", insertion: "insertion_sort" };

  const makeArray = () => Array.from({ length: 10 }, () => Math.floor(Math.random() * 85) + 10);

  const stopPlayback = () => {
    state.running = false;
    if (state.timer) {
      window.clearTimeout(state.timer);
      state.timer = null;
    }
    playPauseButton.textContent = "Start";
  };

  const render = () => {
    const step = state.steps[state.index] || makeStep(state.original, "Ready to begin.");
    const maxValue = Math.max(...step.values, 1);
    const active = new Set(step.active);
    const candidate = new Set(step.candidate);
    const changed = new Set(step.changed);
    const sorted = new Set(step.sorted);

    chart.replaceChildren();
    step.values.forEach((value, index) => {
      const bar = document.createElement("div");
      let className = "bar";
      if (sorted.has(index)) className += " bar-sorted";
      if (candidate.has(index)) className += " bar-candidate";
      if (changed.has(index)) className += " bar-changed";
      if (active.has(index)) className += " bar-active";
      bar.className = className;
      bar.style.height = `${Math.max(12, (value / maxValue) * 100)}%`;
      bar.textContent = value;
      bar.setAttribute("aria-hidden", "true");
      chart.append(bar);
    });

    operationStatus.textContent = step.message;
    stepCount.textContent = `Step ${state.index} of ${Math.max(0, state.steps.length - 1)}`;
    chart.setAttribute("aria-label", `Current array: ${step.values.join(", ")}. ${step.message}`);
    stepButton.disabled = state.index >= state.steps.length - 1;
    resetButton.disabled = state.index === 0 && !state.running;
  };

  const advance = () => {
    if (state.index >= state.steps.length - 1) {
      stopPlayback();
      render();
      return false;
    }
    state.index += 1;
    render();
    return true;
  };

  const play = () => {
    if (!state.running) return;
    if (!advance()) return;
    const delay = speedDelays[Number(speedInput.value) - 1];
    state.timer = window.setTimeout(play, delay);
  };

  const rebuild = (newValues = false) => {
    stopPlayback();
    if (newValues || !state.original.length) state.original = makeArray();
    state.steps = generators[state.algorithm](state.original);
    state.index = 0;
    activeMethod.textContent = methodNames[state.algorithm];
    render();
  };

  menuButton.addEventListener("click", () => {
    const expanded = menuButton.getAttribute("aria-expanded") === "true";
    menuButton.setAttribute("aria-expanded", String(!expanded));
    navigation.classList.toggle("is-open", !expanded);
  });

  navigation.querySelectorAll("a").forEach((link) => {
    link.addEventListener("click", () => {
      menuButton.setAttribute("aria-expanded", "false");
      navigation.classList.remove("is-open");
    });
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      menuButton.setAttribute("aria-expanded", "false");
      navigation.classList.remove("is-open");
    }
  });

  algorithmSelect.addEventListener("change", () => {
    state.algorithm = algorithmSelect.value;
    rebuild();
  });

  speedInput.addEventListener("input", () => {
    speedLabel.textContent = speedNames[Number(speedInput.value) - 1];
  });

  newArrayButton.addEventListener("click", () => rebuild(true));
  resetButton.addEventListener("click", () => rebuild());

  stepButton.addEventListener("click", () => {
    stopPlayback();
    advance();
  });

  playPauseButton.addEventListener("click", () => {
    if (state.running) {
      stopPlayback();
      return;
    }
    if (state.index >= state.steps.length - 1) {
      state.index = 0;
      render();
    }
    state.running = true;
    playPauseButton.textContent = "Pause";
    play();
  });

  document.querySelectorAll("[data-load-algorithm]").forEach((button) => {
    button.addEventListener("click", () => {
      state.algorithm = button.dataset.loadAlgorithm;
      algorithmSelect.value = state.algorithm;
      rebuild();
      document.querySelector("#playground").scrollIntoView({ behavior: "smooth" });
    });
  });

  rebuild(true);
});
