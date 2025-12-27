/* ================================
   Dashboard Prototype – script.js
   Power BI–style behavior
================================ */

console.log("script loaded");

/* -------------------------------
   GLOBAL STATE
-------------------------------- */
let selectedVisual = null;
let charts = {};
let visualCounter = 0;

/* -------------------------------
   GRID INITIALIZATION
   (Fixed canvas, no auto reflow)
-------------------------------- */
const grid = GridStack.init({
  float: true,                 // absolute positioning (no jumping)
  cellHeight: 10,
  margin: 5,
  disableOneColumnMode: true,
  resizable: true
});

/* -------------------------------
   VISUAL SELECTION
-------------------------------- */
document.addEventListener("click", (e) => {
  const visual = e.target.closest(".grid-stack-item");

  document
    .querySelectorAll(".grid-stack-item")
    .forEach(v => v.classList.remove("selected"));

  if (visual) {
    visual.classList.add("selected");
    selectedVisual = visual;
  } else {
    selectedVisual = null;
  }
});

/* -------------------------------
   ADD VISUAL
-------------------------------- */
function addVisual() {
  const metricInput = document.getElementById("metricName");
  const chartSelect = document.getElementById("chartType");

  const metricName = metricInput.value.trim();
  const chartType = chartSelect.value;

  if (!metricName) {
    alert("Please enter a metric name");
    return;
  }

  const chartId = `chart_${visualCounter++}`;

  const content = `
    <div class="grid-stack-item-content">
      <span class="delete" onclick="removeVisual(this)">✖</span>
      <div class="visual-title">${metricName}</div>
      ${
        chartType === "card"
          ? `<div class="card">₹ 1,23,000</div>`
          : `<canvas id="${chartId}"></canvas>`
      }
    </div>
  `;

  grid.addWidget({
    x: 0,
    y: 0,
    w: 30,
    h: 20,
    content: content
  });

  if (chartType !== "card") {
    setTimeout(() => renderChart(chartId, chartType), 50);
  }

  metricInput.value = "";
}

/* -------------------------------
   REMOVE VISUAL
-------------------------------- */
function removeVisual(el) {
  const item = el.closest(".grid-stack-item");
  if (item) {
    grid.removeWidget(item);
  }
}

/* -------------------------------
   IMAGE VISUAL
-------------------------------- */
function addImage(input) {
  const file = input.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = (e) => {
    grid.addWidget({
      x: 0,
      y: 0,
      w: 30,
      h: 20,
      content: `
        <div class="grid-stack-item-content">
          <span class="delete" onclick="removeVisual(this)">✖</span>
          <img src="${e.target.result}"
               style="width:100%; height:100%; object-fit:contain;" />
        </div>
      `
    });
  };

  reader.readAsDataURL(file);
}

/* -------------------------------
   FORMAT FUNCTIONS (THEME LEVEL)
-------------------------------- */
function setTitleColor(color) {
  if (!selectedVisual) return;
  const title = selectedVisual.querySelector(".visual-title");
  if (title) title.style.color = color;
}

function setVisualBg(color) {
  if (!selectedVisual) return;
  const content = selectedVisual.querySelector(".grid-stack-item-content");
  if (content) content.style.background = color;
}

function setCanvasBg(color) {
  const canvas = document.querySelector(".canvas-wrapper");
  if (canvas) canvas.style.background = color;
}

function setSeriesColor(color) {
  if (!selectedVisual) return;
  const canvas = selectedVisual.querySelector("canvas");
  if (!canvas) return;

  const chart = charts[canvas.id];
  if (!chart) return;

  chart.data.datasets.forEach(ds => {
    ds.backgroundColor = color;
    ds.borderColor = color;
  });
  chart.update();
}

/* -------------------------------
   CHART RENDERING
   (Prototype-level only)
-------------------------------- */
function renderChart(id, type) {
  const ctx = document.getElementById(id);
  if (!ctx) return;

  let config = {
    type: "bar",
    data: {
      labels: ["Jan", "Feb", "Mar", "Apr"],
      datasets: [{
        label: "Value",
        data: [10, 20, 15, 30],
        backgroundColor: "#60a5fa",
        borderColor: "#60a5fa"
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false
    }
  };

  /* Chart Type Mapping (Power BI–style intent) */
  if (type.includes("line")) {
    config.type = "line";
    config.data.datasets[0].fill = false;
  }

  if (type === "area") {
    config.type = "line";
    config.data.datasets[0].fill = true;
  }

  if (type === "pie") {
    config.type = "pie";
  }

  if (type === "donut") {
    config.type = "doughnut";
  }

  if (type === "scatter") {
    config.type = "scatter";
    config.data = {
      datasets: [{
        data: [
          { x: 5, y: 10 },
          { x: 10, y: 20 },
          { x: 15, y: 15 },
          { x: 20, y: 30 }
        ],
        backgroundColor: "#60a5fa"
      }]
    };
  }

  charts[id] = new Chart(ctx, config);
}

/* -------------------------------
   EXPOSE FUNCTIONS TO HTML
   (Fixes addVisual not defined)
-------------------------------- */
window.addVisual = addVisual;
window.addImage = addImage;
window.setTitleColor = setTitleColor;
window.setVisualBg = setVisualBg;
window.setCanvasBg = setCanvasBg;
window.setSeriesColor = setSeriesColor;
window.removeVisual = removeVisual;
