/* ===============================
   Dashboard Builder – script.js
   =============================== */

console.log("script loaded");

/* Initialize Grid */
const grid = GridStack.init({
  cellHeight: 120,
  draggable: {
    handle: ".grid-stack-item-content"
  },
  resizable: true
});

let widgetId = 0;

/* Add Widget */
function addWidget() {
  const metric = document.getElementById("metricName").value;
  const type = document.getElementById("chartType").value;

  if (!metric) {
    alert("Please enter a metric name");
    return;
  }

  const canvasId = `chart-${widgetId++}`;

  const content = `
    <div class="grid-stack-item-content">
      <span class="delete-btn" onclick="removeWidget(this)">✖</span>
      <h4>${metric}</h4>
      ${
        type === "kpi"
          ? `<h2 class="kpi-value">₹ 1,23,000</h2>`
          : `<canvas id="${canvasId}"></canvas>`
      }
    </div>
  `;

  grid.addWidget({
    w: 4,
    h: 3,
    content: content
  });

  if (type !== "kpi") {
    setTimeout(() => renderChart(canvasId, type), 50);
  }

  document.getElementById("metricName").value = "";
}

/* Remove Widget */
function removeWidget(el) {
  const widget = el.closest(".grid-stack-item");
  grid.removeWidget(widget);
}

/* Render Charts */
function renderChart(canvasId, type) {
  const ctx = document.getElementById(canvasId);
  if (!ctx) return;

  let chartType = type;
  let data;

  /* Default Data */
  const standardData = {
    labels: ["Jan", "Feb", "Mar", "Apr"],
    datasets: [
      {
        label: "Value",
        data: [10, 20, 15, 30],
        fill: type === "line", // Area chart effect
        tension: 0.4
      }
    ]
  };

  /* Scatter Data */
  const scatterData = {
    datasets: [
      {
        label: "Scatter Data",
        data: [
          { x: 5, y: 10 },
          { x: 10, y: 20 },
          { x: 15, y: 15 },
          { x: 20, y: 30 }
        ]
      }
    ]
  };

  if (type === "scatter") {
    chartType = "scatter";
    data = scatterData;
  } else {
    data = standardData;
  }

  new Chart(ctx, {
    type: chartType,
    data: data,
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: type !== "kpi"
        }
      },
      scales:
        type === "pie" || type === "doughnut"
          ? {}
          : {
              x: { beginAtZero: true },
              y: { beginAtZero: true }
            }
    }
  });
}
