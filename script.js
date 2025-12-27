let selected = null;
let charts = {};
let counter = 0;

/* Gridstack init */
const grid = GridStack.init({
  float: true,
  cellHeight: 10,
  margin: 0,
  disableOneColumnMode: true,
  resizable: true
});

/* Select visual */
document.addEventListener("click", e => {
  const item = e.target.closest(".grid-stack-item");
  document.querySelectorAll(".grid-stack-item").forEach(i => i.classList.remove("selected"));
  selected = item;
  if (item) item.classList.add("selected");
  loadTrendFormat();
});

/* Add visual */
function addVisual() {
  const title = metricName.value || "Visual";
  const type = chartType.value;
  const id = `chart_${counter++}`;

  grid.addWidget({
    x: 0, y: 0, w: 30, h: 20,
    content: `
      <div class="grid-stack-item-content">
        <span class="delete" onclick="grid.removeWidget(this.closest('.grid-stack-item'))">✖</span>
        <div class="visual-title">${title}</div>
        <canvas id="${id}"></canvas>
      </div>`
  });

  setTimeout(() => renderChart(id, type), 30);
}

/* Render distinct prototypes */
function renderChart(id, type) {
  const ctx = document.getElementById(id);

  const labels = ["Jan","Feb","Mar","Apr"];
  const palette = ["#60a5fa","#34d399","#fbbf24","#f87171"];

  const multi = (names) =>
    names.map((n,i)=>({
      label:n,
      data:[10+5*i,20-2*i,15+3*i,30-4*i],
      backgroundColor:palette[i],
      borderColor:palette[i],
      fill:true
    }));

  let config = { type:"bar", data:{}, options:{responsive:true,maintainAspectRatio:false} };

  if (type === "pie" || type === "donut") {
    config.type = type === "pie" ? "pie" : "doughnut";
    config.data = {
      labels:["Online","Store","Wholesale"],
      datasets:[{ data:[40,35,25], backgroundColor:palette }]
    };
  }

  else if (type === "treemap") {
    config.data = { labels:["A","B","C"], datasets: multi(["A","B","C"]) };
  }

  else if (type === "ribbon") {
    config.type = "line";
    config.data = { labels, datasets: multi(["Rank 1","Rank 2","Rank 3"]) };
  }

  else if (type === "line-multi") {
    config.type = "line";
    config.data = { labels, datasets: multi(["Sales","Profit"]) };
  }

  else if (type === "area") {
    config.type = "line";
    config.data = { labels, datasets: multi(["Sales"]).map(d=>({...d,fill:true})) };
  }

  else if (type === "area-stacked") {
    config.type = "line";
    config.options.scales = { y:{stacked:true} };
    config.data = { labels, datasets: multi(["A","B","C"]) };
  }

  else if (type.includes("bar")) {
    config.type = "bar";
    config.options.indexAxis = "y";
    config.options.scales = type.includes("stacked")
      ? { x:{stacked:true}, y:{stacked:true} } : {};
    config.data = { labels, datasets: multi(["A","B"]) };
  }

  else if (type.includes("col")) {
    config.type = "bar";
    config.options.scales = type.includes("stacked")
      ? { x:{stacked:true}, y:{stacked:true} } : {};
    config.data = { labels, datasets: multi(["A","B"]) };
  }

  else if (type.includes("combo")) {
    config.type = "bar";
    config.data = {
      labels,
      datasets:[
        { type:"bar", label:"Sales", data:[10,20,15,30], backgroundColor:palette[0] },
        { type:"line", label:"Growth", data:[5,10,7,12], borderColor:palette[3] }
      ]
    };
  }

  else if (type === "scatter") {
    config.type = "scatter";
    config.data = {
      datasets:[{
        label:"Points",
        data:[{x:5,y:10},{x:10,y:20},{x:15,y:15}],
        backgroundColor:palette[0]
      }]
    };
  }

  charts[id] = new Chart(ctx, config);
}

/* Load per-trend color pickers */
function loadTrendFormat() {
  const pane = document.getElementById("trendColors");
  pane.innerHTML = "";
  if (!selected) return;

  const canvas = selected.querySelector("canvas");
  if (!canvas) return;

  const chart = charts[canvas.id];
  if (!chart) return;

  chart.data.datasets.forEach((ds,i)=>{
    const color = Array.isArray(ds.backgroundColor)
      ? ds.backgroundColor[i]
      : (ds.backgroundColor || ds.borderColor);

    const div = document.createElement("div");
    div.className = "trend-color";
    div.innerHTML = `
      <span>${ds.label || "Segment "+(i+1)}</span>
      <input type="color" value="${color}"
             onchange="updateTrendColor(${i},this.value)">
    `;
    pane.appendChild(div);
  });
}

/* Update color correctly */
function updateTrendColor(index,color){
  if(!selected) return;
  const canvas = selected.querySelector("canvas");
  const chart = charts[canvas.id];

  if(chart.config.type==="pie"||chart.config.type==="doughnut"){
    chart.data.datasets[0].backgroundColor[index]=color;
  } else {
    chart.data.datasets[index].backgroundColor=color;
    chart.data.datasets[index].borderColor=color;
  }
  chart.update();
}

/* Canvas background */
function setCanvasBg(c){
  document.querySelector(".canvas-wrapper").style.background=c;
}

/* Expose */
window.addVisual = addVisual;
window.updateTrendColor = updateTrendColor;
window.setCanvasBg = setCanvasBg;
