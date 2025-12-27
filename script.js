console.log("script loaded");

let selected = null;
let charts = {};
let counter = 0;

/* COLOR PALETTE (THEME) */
let palette = ["#60a5fa", "#34d399", "#fbbf24"];

/* GRID INIT – POWER BI BEHAVIOR */
const grid = GridStack.init({
  float: true,
  cellHeight: 10,
  margin: 0,                 // NO GAP
  disableOneColumnMode: true,
  resizable: true
});

/* SELECT VISUAL */
document.addEventListener("click", e => {
  const item = e.target.closest(".grid-stack-item");
  document.querySelectorAll(".grid-stack-item").forEach(i => i.classList.remove("selected"));
  if (item) {
    item.classList.add("selected");
    selected = item;
  } else {
    selected = null;
  }
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

  if (type !== "card") setTimeout(() => renderChart(id, type), 30);
  metricName.value = "";
}

/* REMOVE */
function removeVisual(el) {
  grid.removeWidget(el.closest(".grid-stack-item"));
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
          <span class="delete" onclick="removeVisual(this)">✖</span>
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

function updatePalette(i,c){
  palette[i]=c;
  if(!selected) return;
  const canvas=selected.querySelector("canvas");
  if(!canvas) return;
  const chart=charts[canvas.id];
  chart.data.datasets.forEach((d,idx)=>{
    d.backgroundColor=palette[idx%palette.length];
    d.borderColor=palette[idx%palette.length];
  });
  chart.update();
}

/* CHART RENDERING */
function renderChart(id,type){
  const ctx=document.getElementById(id);
  const labels=["Jan","Feb","Mar","Apr"];

  let config={
    type:"bar",
    data:{
      labels,
      datasets:[
        {label:"Sales",data:[30,40,20,50]},
        {label:"Profit",data:[20,10,30,20]}
      ]
    },
    options:{responsive:true,maintainAspectRatio:false}
  };

  config.data.datasets.forEach((d,i)=>{
    d.backgroundColor=palette[i];
    d.borderColor=palette[i];
  });

  if(type.includes("stacked")||type.includes("100")){
    config.options.scales={x:{stacked:true},y:{stacked:true}};
  }

  if(type.includes("100")){
    config.data.datasets.forEach(ds=>{
      const t=ds.data.reduce((a,b)=>a+b,0);
      ds.data=ds.data.map(v=>Math.round((v/t)*100));
    });
  }

  if(type==="line"){config.type="line";config.data.datasets[0].fill=false;}
  if(type==="area"){config.type="line";config.data.datasets[0].fill=true;}
  if(type==="area-stacked"){config.type="line";config.options.scales={y:{stacked:true}};}
  if(type==="pie"){config.type="pie";}
  if(type==="donut"){config.type="doughnut";}
  if(type==="scatter"){
    config.type="scatter";
    config.data={datasets:[{data:[{x:5,y:10},{x:10,y:20},{x:15,y:15}],backgroundColor:palette[0]}]};
  }

  charts[id]=new Chart(ctx,config);
}

/* EXPOSE */
window.addVisual=addVisual;
window.addImage=addImage;
window.setTitleColor=setTitleColor;
window.setVisualBg=setVisualBg;
window.setCanvasBg=setCanvasBg;
window.updatePalette=updatePalette;
window.removeVisual=removeVisual;
