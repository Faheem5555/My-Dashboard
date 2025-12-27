let selected = null;
let charts = {};
let counter = 0;

const COLORS = ["#60a5fa", "#34d399", "#fbbf24", "#f87171"];

/* Gridstack – Power BI behavior */
const grid = GridStack.init({
  cellHeight: 10,
  margin: 0,
  allowOverlap: true,        // visuals can overlap
  float: false,              // no auto pushing
  disableOneColumnMode: true,
  resizable: true
});

/* Visual selection */
document.addEventListener("click", e => {
  const item = e.target.closest(".grid-stack-item");
  document.querySelectorAll(".grid-stack-item").forEach(i => i.classList.remove("selected"));
  selected = item;
  if (item) item.classList.add("selected");
  loadFormatPane();
});

/* Add visual – DEFAULT SIZE (Power BI-like) */
function addVisual() {
  const title = metricName.value || "Visual";
  const type = chartType.value;
  const id = `chart_${counter++}`;

  grid.addWidget({
    x: 0,
    y: 0,
    w: 5,   // ✅ default width (matches your screenshot)
    h: 5,   // ✅ default height
    content: `
      <div class="grid-stack-item-content">
        <span class="delete" onclick="grid.removeWidget(this.closest('.grid-stack-item'))">✖</span>
        <div class="visual-title">${title}</div>
        <canvas id="${id}"></canvas>
      </div>`
  });

  setTimeout(() => renderChart(id, type), 30);
}

/* Chart factory */
function renderChart(id, type) {
  const ctx = document.getElementById(id);
  const labels = ["Jan","Feb","Mar","Apr"];

  const multi = names =>
    names.map((n,i)=>({
      label:n,
      data:[10+5*i,20+4*i,15+3*i,30+6*i],
      backgroundColor: COLORS[i],
      borderColor: COLORS[i],
      fill:true
    }));

  let cfg = { type:"bar", data:{}, options:{ responsive:true, maintainAspectRatio:false } };

  switch(type) {

    case "clustered-bar":
      cfg.options.indexAxis="y";
      cfg.data={labels,datasets:multi(["A"])};
      break;

    case "stacked-bar":
      cfg.options.indexAxis="y";
      cfg.options.scales={x:{stacked:true},y:{stacked:true}};
      cfg.data={labels,datasets:multi(["A","B"])};
      break;

    case "stacked-bar-100":
      cfg.options.indexAxis="y";
      cfg.options.scales={x:{stacked:true},y:{stacked:true}};
      cfg.data={labels,datasets:multi(["A","B"])};
      break;

    case "clustered-column":
      cfg.data={labels,datasets:multi(["A"])};
      break;

    case "stacked-column":
      cfg.options.scales={x:{stacked:true},y:{stacked:true}};
      cfg.data={labels,datasets:multi(["A","B"])};
      break;

    case "stacked-column-100":
      cfg.options.scales={x:{stacked:true},y:{stacked:true}};
      cfg.data={labels,datasets:multi(["A","B"])};
      break;

    case "line-multi":
      cfg.type="line";
      cfg.data={labels,datasets:multi(["A","B"])};
      break;

    case "area":
      cfg.type="line";
      cfg.data={labels,datasets:multi(["A"])};
      break;

    case "stacked-area":
      cfg.type="line";
      cfg.options.scales={y:{stacked:true}};
      cfg.data={labels,datasets:multi(["A","B","C"])};
      break;

    case "ribbon":
      cfg.type="line";
      cfg.data={labels,datasets:multi(["Rank1","Rank2","Rank3"])};
      break;

    case "combo-clustered":
      cfg.data={
        labels,
        datasets:[
          {type:"bar",label:"Sales",data:[10,20,15,30],backgroundColor:COLORS[0]},
          {type:"line",label:"Growth",data:[5,10,8,14],borderColor:COLORS[3]}
        ]
      };
      break;

    case "combo-stacked":
      cfg.options.scales={x:{stacked:true},y:{stacked:true}};
      cfg.data={
        labels,
        datasets:[
          {type:"bar",label:"Sales",data:[10,20,15,30],backgroundColor:COLORS[0]},
          {type:"line",label:"Growth",data:[5,10,8,14],borderColor:COLORS[3]}
        ]
      };
      break;

    case "pie":
    case "donut":
      cfg.type = type==="pie" ? "pie" : "doughnut";
      cfg.data={
        labels:["Online","Store","Wholesale"],
        datasets:[{data:[40,35,25],backgroundColor:COLORS}]
      };
      break;

    case "treemap":
      cfg.data={labels:["A","B","C"],datasets:multi(["A","B","C"])};
      break;

    case "scatter":
      cfg.type="scatter";
      cfg.data={
        datasets:[{
          label:"Points",
          data:[{x:5,y:10},{x:10,y:20},{x:15,y:15}],
          backgroundColor:COLORS[0]
        }]
      };
      break;
  }

  charts[id] = new Chart(ctx, cfg);
}

/* Format pane */
function loadFormatPane() {
  const pane = document.getElementById("trendColors");
  pane.innerHTML = "";
  if (!selected) return;

  const canvas = selected.querySelector("canvas");
  const chart = charts[canvas.id];

  chart.data.datasets.forEach((ds,i)=>{
    const c = Array.isArray(ds.backgroundColor)
      ? ds.backgroundColor[i]
      : (ds.backgroundColor || ds.borderColor);

    pane.innerHTML += `
      <div class="trend-color">
        <span>${ds.label || "Trend "+(i+1)}</span>
        <input type="color" value="${c}"
               onchange="updateTrendColor(${i},this.value)">
      </div>`;
  });
}

/* Update trend color */
function updateTrendColor(i,color){
  if(!selected) return;
  const canvas = selected.querySelector("canvas");
  const chart = charts[canvas.id];

  if(chart.config.type==="pie"||chart.config.type==="doughnut"){
    chart.data.datasets[0].backgroundColor[i]=color;
  } else {
    chart.data.datasets[i].backgroundColor=color;
    chart.data.datasets[i].borderColor=color;
    chart.data.datasets[i].fill=true;
  }
  chart.update();
}

/* Canvas background */
function setCanvasBg(color){
  document.querySelector(".canvas-wrapper").style.background=color;
}

/* Expose */
window.addVisual = addVisual;
window.updateTrendColor = updateTrendColor;
window.setCanvasBg = setCanvasBg;
