console.log("script loaded");

let selectedWidget = null;

/* GRID INIT – Power BI Behavior */
const grid = GridStack.init({
  float: true,                // absolute positioning
  cellHeight: 10,
  margin: 5,
  disableOneColumnMode: true,
  resizable: true
});

/* SELECT VISUAL */
document.addEventListener("click", (e) => {
  const widget = e.target.closest(".grid-stack-item");
  document.querySelectorAll(".grid-stack-item").forEach(w =>
    w.classList.remove("selected")
  );
  if (widget) {
    widget.classList.add("selected");
    selectedWidget = widget;
  }
});

/* ADD VISUAL */
let idCounter = 0;
function addWidget() {
  const name = metricName.value;
  const type = chartType.value;
  if (!name) return alert("Enter metric name");

  const id = `chart-${idCounter++}`;

  grid.addWidget({
    x: 0,
    y: 0,
    w: 30,
    h: 20,
    content: `
      <div class="grid-stack-item-content">
        <span class="delete-btn" onclick="removeWidget(this)">✖</span>
        <h4>${name}</h4>
        ${type === "kpi" ? `<div class="kpi">₹ 1,23,000</div>` : `<canvas id="${id}"></canvas>`}
      </div>
    `
  });

  if (type !== "kpi") setTimeout(() => renderChart(id, type), 50);
  metricName.value = "";
}

/* REMOVE */
function removeWidget(el) {
  grid.removeWidget(el.closest(".grid-stack-item"));
}

/* IMAGE */
function addImage(input) {
  const file = input.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = e => {
    grid.addWidget({
      x: 0,
      y: 0,
      w: 30,
      h: 20,
      content: `
        <div class="grid-stack-item-content">
          <span class="delete-btn" onclick="removeWidget(this)">✖</span>
          <img src="${e.target.result}" style="width:100%;height:100%;object-fit:contain">
        </div>
      `
    });
  };
  reader.readAsDataURL(file);
}

/* FORMAT */
function formatTitle(color) {
  if (!selectedWidget) return;
  selectedWidget.querySelector("h4").style.color = color;
}

function formatBackground(color) {
  if (!selectedWidget) return;
  selectedWidget.querySelector(".grid-stack-item-content").style.background = color;
}

function formatDashboard(color) {
  document.querySelector(".canvas-wrapper").style.background = color;
}

/* CHARTS */
function renderChart(id, type) {
  const ctx = document.getElementById(id);
  if (!ctx) return;

  const data = type === "scatter"
    ? { datasets: [{ data: [{x:5,y:10},{x:10,y:20},{x:15,y:15}] }] }
    : {
        labels: ["Jan","Feb","Mar","Apr"],
        datasets: [{ data: [10,20,15,30], fill: type === "line" }]
      };

  new Chart(ctx, {
    type: type === "scatter" ? "scatter" : type,
    data,
    options: { responsive: true, maintainAspectRatio: false }
  });
}
