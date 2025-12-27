console.log("script loaded");

let selected = null;
let charts = {};
let counter = 0;

let palette = ["#60a5fa", "#34d399", "#fbbf24"];

/* GRID INIT */
const grid = GridStack.init({
  float: true,
  cellHeight: 10,
  margin: 0,
  disableOneColumnMode: true,
  resizable: true
});

/* SELECT */
document.addEventListener("click", e => {
  const item = e.target.closest(".grid-stack-item");
  document.querySelectorAll(".grid-stack-item").forEach(i => i.classList.remove("selected"));
  selected = item || null;
  if (selected) selected.classList.add("selected");
});

/* ADD VISUAL */
function addVisual() {
  const name = metricName.value.trim();
  const type = chartType.value;
  if (!name) return alert("Metric name required");

  const id = `chart_${counter++}`;

  grid.addWidget({
    x: 0, y: 0, w: 30, h: 20,
    content: `
      <div class="grid-stack-item-content">
        <span class="delete" onclick="removeVisual(this)">✖</span>
        <div class="visual-title">${name}</div>
        ${type === "card" ? `<div class="card">₹ 1,23,000</div>` : `<canvas id="${id}"></canvas>`}
      </div>`
  });

  if (type !== "card") setTimeout(() => renderChart(id, type), 20);
  metricName.value = "";
}

/* REMOVE */
function removeVisual(el) {
  grid.removeWidget(el.closest(".grid-stack-item"));
}

/* FORMAT */
function setTitleColor(c) {
  if (selected) selected.querySelector(".visual-title").style.color = c;
}

function setCanvasBg(c) {
  document.querySelector(".canvas-wrapper").style.background = c;
}

function updatePalette(i, c) {
  palette[i] = c;
  if (!selected) return;
  const canvas = selected.querySelector("canvas");
  if (!canvas) return;
  const chart = charts[canvas.id];
  chart.data.datasets.forEach((ds, idx) => {
    ds.backgroundColor = palette[idx] || ds.backgroundColor;
    ds.borderColor = palette[idx] || ds.borderColor;
  });
  chart.update();
}

/* RENDER DISTINCT PROTOTYPES */
function renderChart(id, type) {
  const ctx = document.getElementById(id);
  const labels = ["Jan", "Feb", "Mar", "Apr"];

  let config = { type: "bar", data: {}, options: { responsive: true, maintainAspectRatio: false } };

  if (type === "bar-clustered") {
    config.options.indexAxis = "y";
    config.data = { labels, datasets: [{ data: [10,20,15,30], backgroundColor: palette[0] }] };
  }

  if (type === "bar-stacked") {
    config.options.indexAxis = "y";
    config.options.scales = { x:{stacked:true}, y:{stacked:true} };
    config.data = {
      labels,
      datasets: [
        { data:[10,15,10,20], backgroundColor: palette[0] },
        { data:[5,10,8,12], backgroundColor: palette[1] }
      ]
    };
  }

  if (type === "bar-100") {
    config.options.indexAxis = "y";
    config.options.scales = { x:{stacked:true}, y:{stacked:true} };
    config.data = {
      labels,
      datasets: [
        { data:[60,50,40,70], backgroundColor: palette[0] },
        { data:[40,50,60,30], backgroundColor: palette[1] }
      ]
    };
  }

  if (type === "col-clustered") {
    config.data = { labels, datasets:[{ data:[10,20,15,30], backgroundColor: palette[0] }] };
  }

  if (type === "col-stacked") {
    config.options.scales = { x:{stacked:true}, y:{stacked:true} };
    config.data = {
      labels,
      datasets:[
        { data:[10,15,10,20], backgroundColor: palette[0] },
        { data:[5,10,8,12], backgroundColor: palette[1] }
      ]
    };
  }

  if (type === "line") {
    config.type = "line";
    config.data = { labels, datasets:[{ data:[10,20,15,30], borderColor: palette[0] }] };
  }

  if (type === "area") {
    config.type = "line";
    config.data = {
      labels,
      datasets:[{
        data:[10,20,15,30],
        borderColor: palette[0],
        backgroundColor: "rgba(96,165,250,0.4)",
        fill:true
      }]
    };
  }

  if (type === "pie") {
    config.type = "pie";
    config.data = {
      labels:["Online","Store","Wholesale"],
      datasets:[{ data:[40,35,25], backgroundColor: palette }]
    };
  }

  if (type === "donut") {
    config.type = "doughnut";
    config.data = {
      labels:["Online","Store","Wholesale"],
      datasets:[{ data:[40,35,25], backgroundColor: palette }]
    };
  }

  charts[id] = new Chart(ctx, config);
}

/* EXPOSE */
window.addVisual = addVisual;
window.removeVisual = removeVisual;
window.setTitleColor = setTitleColor;
window.setCanvasBg = setCanvasBg;
window.updatePalette = updatePalette;
