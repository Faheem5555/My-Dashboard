let selected = null;
let charts = {};

const grid = GridStack.init({
  float: true,
  cellHeight: 10,
  disableOneColumnMode: true
});

/* SELECT */
document.addEventListener("click", e => {
  const item = e.target.closest(".grid-stack-item");
  document.querySelectorAll(".grid-stack-item").forEach(i => i.classList.remove("selected"));
  if (item) {
    item.classList.add("selected");
    selected = item;
  }
});

/* ADD VISUAL */
let id = 0;
function addVisual() {
  const name = metricName.value;
  const type = chartType.value;
  if (!name) return alert("Metric name required");

  const vid = `v${id++}`;

  const html = `
    <div class="grid-stack-item-content">
      <span class="delete" onclick="grid.removeWidget(this.closest('.grid-stack-item'))">✖</span>
      <div class="visual-title">${name}</div>
      ${type === "card"
        ? `<div class="card">₹ 1,23,000</div>`
        : `<canvas id="${vid}"></canvas>`}
    </div>
  `;

  grid.addWidget({ x:0, y:0, w:30, h:20, content: html });

  if (type !== "card") setTimeout(() => renderChart(vid, type), 30);
  metricName.value = "";
}

/* IMAGE */
function addImage(input) {
  const f = input.files[0];
  if (!f) return;
  const r = new FileReader();
  r.onload = e => {
    grid.addWidget({
      x:0,y:0,w:30,h:20,
      content: `
        <div class="grid-stack-item-content">
          <span class="delete" onclick="grid.removeWidget(this.closest('.grid-stack-item'))">✖</span>
          <img src="${e.target.result}" style="width:100%;height:100%;object-fit:contain">
        </div>`
    });
  };
  r.readAsDataURL(f);
}

/* FORMAT */
function setTitleColor(c){ if(selected) selected.querySelector(".visual-title").style.color=c; }
function setVisualBg(c){ if(selected) selected.querySelector(".grid-stack-item-content").style.background=c; }
function setCanvasBg(c){ document.querySelector(".canvas-wrapper").style.background=c; }
function setSeriesColor(c){
  if (!selected) return;
  const canvas = selected.querySelector("canvas");
  if (!canvas) return;
  const chart = charts[canvas.id];
  chart.data.datasets.forEach(d => d.backgroundColor = c);
  chart.update();
}

/* CHARTS */
function renderChart(id, type) {
  const ctx = document.getElementById(id);
  const labels = ["Jan","Feb","Mar","Apr"];

  let cfg = {
    type: "bar",
    data: {
      labels,
      datasets: [{ data: [10,20,15,30], backgroundColor:"#60a5fa" }]
    },
    options: { responsive:true, maintainAspectRatio:false }
  };

  if (type.includes("line")) cfg.type = "line";
  if (type === "area") cfg.data.datasets[0].fill = true;
  if (type === "pie" || type === "donut") cfg.type = type === "donut" ? "doughnut" : "pie";
  if (type === "scatter") {
    cfg.type = "scatter";
    cfg.data = { datasets:[{data:[{x:5,y:10},{x:10,y:20}]}] };
  }

  charts[id] = new Chart(ctx, cfg);
}
