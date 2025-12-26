const grid = GridStack.init({
  cellHeight: 120,
  draggable: { handle: '.grid-stack-item-content' }
});

let widgetId = 0;

function addWidget() {
  const metric = document.getElementById('metricName').value;
  const type = document.getElementById('chartType').value;

  if (!metric) {
    alert("Enter metric name");
    return;
  }

  const id = `widget-${widgetId++}`;

  const content = `
    <div class="grid-stack-item-content">
      <h4>${metric}</h4>
      ${type === 'kpi'
        ? `<h2>₹ 1,23,000</h2>`
        : `<canvas id="${id}"></canvas>`
      }
    </div>
  `;

  grid.addWidget({
    w: 4,
    h: 3,
    content
  });

  if (type !== 'kpi') {
    setTimeout(() => renderChart(id, type), 50);
  }
}

function renderChart(canvasId, type) {
  const ctx = document.getElementById(canvasId);
  new Chart(ctx, {
    type: type,
    data: {
      labels: ['Jan', 'Feb', 'Mar', 'Apr'],
      datasets: [{
        label: 'Value',
        data: [10, 20, 15, 30]
      }]
    }
  });
}
