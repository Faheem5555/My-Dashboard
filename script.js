/* =========================
   Power BI Prototype Dashboard
   - Fixed canvas 1280×720
   - Visuals are absolute-positioned (no pushing down)
   - Overlap allowed
   - Drag + resize
   - Always-visible Format pane
   - Per-series/slice color formatting
   - Upload Image visual
========================= */

(() => {
  // -------------------------
  // DOM
  // -------------------------
  const canvas = document.getElementById("canvas");
  const visualType = document.getElementById("visualType");
  const addVisualBtn = document.getElementById("addVisualBtn");

  const formatStatus = document.getElementById("formatStatus");
  const fmtTitle = document.getElementById("fmtTitle");
  const fmtX = document.getElementById("fmtX");
  const fmtY = document.getElementById("fmtY");
  const fmtW = document.getElementById("fmtW");
  const fmtH = document.getElementById("fmtH");
  const bringFrontBtn = document.getElementById("bringFrontBtn");
  const seriesColors = document.getElementById("seriesColors");

  const imageUpload = document.getElementById("imageUpload");

  // -------------------------
  // Fixed canvas constraints
  // -------------------------
  const CANVAS_W = 1280;
  const CANVAS_H = 720;

  // Default "Power BI-like medium" visual size (important requirement)
  const DEFAULT_W = 380;
  const DEFAULT_H = 260;

  // Keep visuals inside canvas
  function clamp(n, min, max) { return Math.max(min, Math.min(max, n)); }

  // -------------------------
  // Dummy retail business data (realistic-looking)
  // Gradual Jan → Dec growth, 80% profit YoY idea
  // -------------------------
  const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

  // Current year profit gradually increasing
  const profitThisYear = [42, 45, 48, 52, 56, 60, 65, 70, 76, 83, 91, 100];

  // Last year profit ~55% of this year (approx) to imply ~80% YoY growth overall
  const profitLastYear = profitThisYear.map(v => Math.round(v / 1.8));

  // Sales and cost for combo charts, more scale
  const salesThisYear = [220, 230, 245, 265, 290, 315, 350, 380, 410, 450, 490, 540];
  const salesLastYear = salesThisYear.map(v => Math.round(v / 1.18));

  // Category split for pie/donut/treemap
  const categories = ["Apparel", "Footwear", "Accessories", "Beauty", "Home"];
  const categoryShare = [32, 24, 18, 14, 12]; // sums 100

  // Scatter points (e.g., margin vs sales)
  const scatterPoints = Array.from({ length: 18 }, (_, i) => {
    const x = 50 + i * 18 + (Math.random() * 20 - 10);
    const y = 12 + (Math.sin(i / 2) * 6) + (Math.random() * 4);
    return { x: Math.round(x), y: Math.round(y * 10) / 10 };
  });

  // -------------------------
  // State
  // -------------------------
  let visualCounter = 0;
  let selectedId = null;
  let zCounter = 10;

  /** visuals[id] = {
   *  id, type, el, titleEl,
   *  chart (Chart.js instance) OR ribbon (custom),
   *  seriesMeta: [{key, label, getColor, setColor}],
   * }
   */
  const visuals = {};

  // -------------------------
  // Utilities
  // -------------------------
  function nextId() {
    visualCounter += 1;
    return `v_${visualCounter}`;
  }

  function getDefaultTitle(type) {
    const map = {
      pie: "Category share",
      donut: "Category share (Donut)",
      treemap: "Category treemap",
      ribbon: "Ribbon (prototype)",
      line: "Profit trend",
      area: "Profit (Area)",
      stackedArea: "Profit by year (Stacked Area)",
      clusteredBar: "Category comparison (Bar)",
      stackedBar: "Category split (Stacked Bar)",
      stackedBar100: "Category split (100% Stacked Bar)",
      clusteredColumn: "Monthly sales (Column)",
      stackedColumn: "Monthly sales split (Stacked Column)",
      stackedColumn100: "Sales mix (100% Stacked Column)",
      lineClusteredColumn: "Sales + Profit (Combo)",
      lineStackedColumn: "Sales mix + Profit (Combo)",
      scatter: "Sales vs Margin (Scatter)",
      image: "Image"
    };
    return map[type] || "Visual";
  }

  function deselectAll() {
    selectedId = null;
    Object.values(visuals).forEach(v => v.el.classList.remove("selected"));
    renderFormatPane();
  }

  function selectVisual(id) {
    if (!visuals[id]) return;
    selectedId = id;
    Object.values(visuals).forEach(v => v.el.classList.remove("selected"));
    visuals[id].el.classList.add("selected");
    renderFormatPane();
  }

  // Click empty canvas to deselect
  canvas.addEventListener("mousedown", (e) => {
    // If click on canvas background (not on a visual)
    if (e.target === canvas) deselectAll();
  });

  // -------------------------
  // Drag + Resize (custom, absolute positioning)
  // -------------------------
  function enableDragResize(visualEl, headerEl, id) {
    // DRAG
    let drag = null;

    headerEl.addEventListener("mousedown", (e) => {
      // Prevent drag if clicking delete button
      if (e.target.closest(".visualDelete")) return;

      selectVisual(id);

      const rect = visualEl.getBoundingClientRect();
      const canvasRect = canvas.getBoundingClientRect();

      drag = {
        startX: e.clientX,
        startY: e.clientY,
        origLeft: rect.left - canvasRect.left,
        origTop: rect.top - canvasRect.top
      };
      e.preventDefault();
    });

    // RESIZE
    let resize = null;

    const handles = visualEl.querySelectorAll(".resizeHandle");
    handles.forEach(h => {
      h.addEventListener("mousedown", (e) => {
        selectVisual(id);

        const canvasRect = canvas.getBoundingClientRect();
        const rect = visualEl.getBoundingClientRect();

        resize = {
          handle: h.dataset.handle,
          startX: e.clientX,
          startY: e.clientY,
          origLeft: rect.left - canvasRect.left,
          origTop: rect.top - canvasRect.top,
          origW: rect.width,
          origH: rect.height
        };
        e.preventDefault();
        e.stopPropagation();
      });
    });

    // global move
    window.addEventListener("mousemove", (e) => {
      if (drag) {
        const dx = e.clientX - drag.startX;
        const dy = e.clientY - drag.startY;

        let left = drag.origLeft + dx;
        let top = drag.origTop + dy;

        // clamp within canvas
        const w = visualEl.offsetWidth;
        const h = visualEl.offsetHeight;

        left = clamp(left, 0, CANVAS_W - w);
        top = clamp(top, 0, CANVAS_H - h);

        visualEl.style.left = `${left}px`;
        visualEl.style.top = `${top}px`;

        syncFormatPosSize();
      }

      if (resize) {
        const dx = e.clientX - resize.startX;
        const dy = e.clientY - resize.startY;

        // Minimum size to show title + legend + chart area
        const minW = 240;
        const minH = 180;

        let left = resize.origLeft;
        let top = resize.origTop;
        let w = resize.origW;
        let h = resize.origH;

        const handle = resize.handle;

        if (handle === "se") { w = resize.origW + dx; h = resize.origH + dy; }
        if (handle === "sw") { w = resize.origW - dx; h = resize.origH + dy; left = resize.origLeft + dx; }
        if (handle === "ne") { w = resize.origW + dx; h = resize.origH - dy; top = resize.origTop + dy; }
        if (handle === "nw") { w = resize.origW - dx; h = resize.origH - dy; left = resize.origLeft + dx; top = resize.origTop + dy; }

        w = Math.max(minW, w);
        h = Math.max(minH, h);

        // clamp pos so it stays in canvas
        left = clamp(left, 0, CANVAS_W - w);
        top = clamp(top, 0, CANVAS_H - h);

        visualEl.style.left = `${left}px`;
        visualEl.style.top = `${top}px`;
        visualEl.style.width = `${w}px`;
        visualEl.style.height = `${h}px`;

        // Chart.js needs a resize call
        const v = visuals[id];
        if (v && v.chart) v.chart.resize();

        syncFormatPosSize();
      }
    });

    window.addEventListener("mouseup", () => {
      drag = null;
      resize = null;
    });
  }

  function syncFormatPosSize() {
    if (!selectedId || !visuals[selectedId]) return;
    const el = visuals[selectedId].el;
    fmtX.value = parseInt(el.style.left || "0", 10);
    fmtY.value = parseInt(el.style.top || "0", 10);
    fmtW.value = parseInt(el.style.width || DEFAULT_W, 10);
    fmtH.value = parseInt(el.style.height || DEFAULT_H, 10);
  }

  // -------------------------
  // Visual factory
  // -------------------------
  function createVisualShell(type) {
    const id = nextId();

    const visual = document.createElement("div");
    visual.className = "visual";
    visual.dataset.id = id;
    visual.dataset.type = type;

    // default position cascade (Power BI-ish)
    const x = clamp(40 + (visualCounter - 1) * 18, 0, CANVAS_W - DEFAULT_W);
    const y = clamp(40 + (visualCounter - 1) * 14, 0, CANVAS_H - DEFAULT_H);

    visual.style.left = `${x}px`;
    visual.style.top = `${y}px`;
    visual.style.width = `${DEFAULT_W}px`;
    visual.style.height = `${DEFAULT_H}px`;
    visual.style.zIndex = `${++zCounter}`;

    const header = document.createElement("div");
    header.className = "visualHeader";

    const title = document.createElement("div");
    title.className = "visualTitle";
    title.textContent = getDefaultTitle(type);

    const del = document.createElement("button");
    del.className = "visualDelete";
    del.title = "Delete visual";
    del.textContent = "✖";
    del.addEventListener("click", (e) => {
      e.stopPropagation();
      deleteVisual(id);
    });

    header.appendChild(title);
    header.appendChild(del);

    const body = document.createElement("div");
    body.className = "visualBody";

    // resize handles
    const hSE = document.createElement("div"); hSE.className = "resizeHandle h-se"; hSE.dataset.handle="se";
    const hSW = document.createElement("div"); hSW.className = "resizeHandle h-sw"; hSW.dataset.handle="sw";
    const hNE = document.createElement("div"); hNE.className = "resizeHandle h-ne"; hNE.dataset.handle="ne";
    const hNW = document.createElement("div"); hNW.className = "resizeHandle h-nw"; hNW.dataset.handle="nw";

    visual.appendChild(header);
    visual.appendChild(body);
    visual.appendChild(hSE);
    visual.appendChild(hSW);
    visual.appendChild(hNE);
    visual.appendChild(hNW);

    // selection behavior
    visual.addEventListener("mousedown", (e) => {
      // prevent canvas deselect
      e.stopPropagation();
      selectVisual(id);
    });

    canvas.appendChild(visual);
    enableDragResize(visual, header, id);

    visuals[id] = {
      id, type,
      el: visual,
      titleEl: title,
      bodyEl: body,
      chart: null,
      ribbon: null,
      seriesMeta: []
    };

    selectVisual(id);
    return visuals[id];
  }

  function deleteVisual(id) {
    const v = visuals[id];
    if (!v) return;

    if (v.chart) {
      try { v.chart.destroy(); } catch (_) {}
    }

    v.el.remove();
    delete visuals[id];

    if (selectedId === id) deselectAll();
  }

  // -------------------------
  // Chart.js helpers
  // -------------------------
  function chartCanvas(parent) {
    const c = document.createElement("canvas");
    parent.appendChild(c);
    return c.getContext("2d");
  }

  // Build series meta so format pane can change colors
  // Each meta item supports getColor()/setColor(color)
  function setSeriesMetaForChart(v, type) {
    const chart = v.chart;
    if (!chart) return;

    const meta = [];

    // Pie/Donut/Treemap: "segments"
    if (type === "pie" || type === "donut") {
      const labels = chart.data.labels || [];
      labels.forEach((lab, i) => {
        meta.push({
          key: `slice_${i}`,
          label: lab,
          getColor: () => chart.data.datasets[0].backgroundColor[i],
          setColor: (c) => {
            chart.data.datasets[0].backgroundColor[i] = c;
            chart.update();
          }
        });
      });
      v.seriesMeta = meta;
      return;
    }

    // Treemap uses dataset.tree entries colors
    if (type === "treemap") {
      const tree = chart.data.datasets[0].tree || [];
      tree.forEach((node, i) => {
        meta.push({
          key: `node_${i}`,
          label: node.label || `Node ${i+1}`,
          getColor: () => chart.data.datasets[0].backgroundColor[i],
          setColor: (c) => {
            chart.data.datasets[0].backgroundColor[i] = c;
            chart.update();
          }
        });
      });
      v.seriesMeta = meta;
      return;
    }

    // Standard multi-series charts
    (chart.data.datasets || []).forEach((ds, idx) => {
      const label = ds.label || `Series ${idx+1}`;
      meta.push({
        key: `ds_${idx}`,
        label,
        getColor: () => ds.borderColor || ds.backgroundColor,
        setColor: (c) => {
          // For area/stacked area: fill + border
          if (ds.borderColor !== undefined) ds.borderColor = c;
          if (ds.backgroundColor !== undefined) {
            // Keep fills visible for area charts
            if (typeof ds.backgroundColor === "string") ds.backgroundColor = withAlpha(c, 0.25);
            else ds.backgroundColor = withAlpha(c, 0.25);
          }
          chart.update();
        }
      });
    });

    v.seriesMeta = meta;
  }

  // Convert hex to rgba-ish with alpha (simple)
  function withAlpha(hex, alpha) {
    // supports #RRGGBB only
    const h = (hex || "#000000").replace("#","");
    const r = parseInt(h.substring(0,2), 16);
    const g = parseInt(h.substring(2,4), 16);
    const b = parseInt(h.substring(4,6), 16);
    return `rgba(${r},${g},${b},${alpha})`;
  }

  // Nice default palette (Power BI-ish)
  const palette = [
    "#2F5597","#ED7D31","#A5A5A5","#FFC000","#5B9BD5","#70AD47",
    "#264478","#9E480E","#636363","#987300","#255E91","#43682B"
  ];

  // Chart defaults for prototype look
  const baseChartOptions = () => ({
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: true, labels: { boxWidth: 10, boxHeight: 10 } },
      tooltip: { enabled: true }
    }
  });

  // -------------------------
  // Visual builders
  // -------------------------
  function buildPie(v) {
    const ctx = chartCanvas(v.bodyEl);
    v.chart = new Chart(ctx, {
      type: "pie",
      data: {
        labels: categories,
        datasets: [{
          label: "Share",
          data: categoryShare,
          backgroundColor: categories.map((_, i) => palette[i % palette.length]),
          borderColor: "#ffffff",
          borderWidth: 1
        }]
      },
      options: baseChartOptions()
    });
    setSeriesMetaForChart(v, "pie");
  }

  function buildDonut(v) {
    const ctx = chartCanvas(v.bodyEl);
    v.chart = new Chart(ctx, {
      type: "doughnut",
      data: {
        labels: categories,
        datasets: [{
          label: "Share",
          data: categoryShare,
          backgroundColor: categories.map((_, i) => palette[(i+2) % palette.length]),
          borderColor: "#ffffff",
          borderWidth: 1
        }]
      },
      options: {
        ...baseChartOptions(),
        cutout: "62%"
      }
    });
    setSeriesMetaForChart(v, "donut");
  }

  function buildLine(v) {
    const ctx = chartCanvas(v.bodyEl);
    v.chart = new Chart(ctx, {
      type: "line",
      data: {
        labels: MONTHS,
        datasets: [
          {
            label: "Profit (This Year)",
            data: profitThisYear,
            borderColor: palette[0],
            backgroundColor: withAlpha(palette[0], 0.1),
            tension: 0.35,
            pointRadius: 2
          },
          {
            label: "Profit (Last Year)",
            data: profitLastYear,
            borderColor: palette[3],
            backgroundColor: withAlpha(palette[3], 0.1),
            tension: 0.35,
            pointRadius: 2
          }
        ]
      },
      options: {
        ...baseChartOptions(),
        scales: {
          y: { beginAtZero: true, grid: { color: "#eef2f7" } },
          x: { grid: { display: false } }
        }
      }
    });
    setSeriesMetaForChart(v, "line");
  }

  function buildArea(v) {
    const ctx = chartCanvas(v.bodyEl);
    v.chart = new Chart(ctx, {
      type: "line",
      data: {
        labels: MONTHS,
        datasets: [{
          label: "Profit (This Year)",
          data: profitThisYear,
          borderColor: palette[1],
          backgroundColor: withAlpha(palette[1], 0.28),
          fill: true,
          tension: 0.35,
          pointRadius: 0
        }]
      },
      options: {
        ...baseChartOptions(),
        scales: {
          y: { beginAtZero: true, grid: { color: "#eef2f7" } },
          x: { grid: { display: false } }
        }
      }
    });
    setSeriesMetaForChart(v, "area");
  }

  function buildStackedArea(v) {
    const ctx = chartCanvas(v.bodyEl);
    v.chart = new Chart(ctx, {
      type: "line",
      data: {
        labels: MONTHS,
        datasets: [
          {
            label: "This Year",
            data: profitThisYear,
            borderColor: palette[4],
            backgroundColor: withAlpha(palette[4], 0.28),
            fill: true,
            tension: 0.35,
            pointRadius: 0
          },
          {
            label: "Last Year",
            data: profitLastYear,
            borderColor: palette[3],
            backgroundColor: withAlpha(palette[3], 0.28),
            fill: true,
            tension: 0.35,
            pointRadius: 0
          }
        ]
      },
      options: {
        ...baseChartOptions(),
        scales: {
          x: { stacked: true, grid: { display: false } },
          y: { stacked: true, beginAtZero: true, grid: { color: "#eef2f7" } }
        }
      }
    });
    setSeriesMetaForChart(v, "stackedArea");
  }

  function buildClusteredBar(v) {
    const ctx = chartCanvas(v.bodyEl);
    v.chart = new Chart(ctx, {
      type: "bar",
      data: {
        labels: categories,
        datasets: [
          {
            label: "Sales (This Year)",
            data: [88, 76, 62, 49, 41],
            backgroundColor: withAlpha(palette[0], 0.35),
            borderColor: palette[0],
            borderWidth: 1
          },
          {
            label: "Sales (Last Year)",
            data: [70, 61, 51, 39, 33],
            backgroundColor: withAlpha(palette[3], 0.35),
            borderColor: palette[3],
            borderWidth: 1
          }
        ]
      },
      options: {
        ...baseChartOptions(),
        indexAxis: "y",
        scales: {
          x: { beginAtZero: true, grid: { color: "#eef2f7" } },
          y: { grid: { display: false } }
        }
      }
    });
    setSeriesMetaForChart(v, "clusteredBar");
  }

  function buildStackedBar(v, percent100 = false) {
    const ctx = chartCanvas(v.bodyEl);

    const ds = [
      { label: "Online", data: [32, 28, 26, 22, 20], c: palette[0] },
      { label: "Store",  data: [45, 40, 38, 32, 30], c: palette[5] },
      { label: "Wholesale", data: [23, 20, 18, 14, 12], c: palette[3] }
    ];

    v.chart = new Chart(ctx, {
      type: "bar",
      data: {
        labels: categories,
        datasets: ds.map(s => ({
          label: s.label,
          data: s.data,
          backgroundColor: withAlpha(s.c, 0.35),
          borderColor: s.c,
          borderWidth: 1
        }))
      },
      options: {
        ...baseChartOptions(),
        indexAxis: "y",
        scales: {
          x: {
            stacked: true,
            beginAtZero: true,
            max: percent100 ? 100 : undefined,
            grid: { color: "#eef2f7" }
          },
          y: { stacked: true, grid: { display: false } }
        },
        plugins: {
          ...baseChartOptions().plugins,
          tooltip: { enabled: true }
        }
      },
      plugins: percent100 ? [stacked100Plugin()] : []
    });

    setSeriesMetaForChart(v, percent100 ? "stackedBar100" : "stackedBar");
  }

  function buildClusteredColumn(v) {
    const ctx = chartCanvas(v.bodyEl);
    v.chart = new Chart(ctx, {
      type: "bar",
      data: {
        labels: MONTHS,
        datasets: [
          {
            label: "Sales (This Year)",
            data: salesThisYear,
            backgroundColor: withAlpha(palette[0], 0.35),
            borderColor: palette[0],
            borderWidth: 1
          },
          {
            label: "Sales (Last Year)",
            data: salesLastYear,
            backgroundColor: withAlpha(palette[3], 0.35),
            borderColor: palette[3],
            borderWidth: 1
          }
        ]
      },
      options: {
        ...baseChartOptions(),
        scales: {
          y: { beginAtZero: true, grid: { color: "#eef2f7" } },
          x: { grid: { display: false } }
        }
      }
    });
    setSeriesMetaForChart(v, "clusteredColumn");
  }

  function buildStackedColumn(v, percent100 = false) {
    const ctx = chartCanvas(v.bodyEl);

    const online = salesThisYear.map(v => Math.round(v * 0.44));
    const store  = salesThisYear.map(v => Math.round(v * 0.39));
    const wh     = salesThisYear.map((v, i) => v - online[i] - store[i]);

    v.chart = new Chart(ctx, {
      type: "bar",
      data: {
        labels: MONTHS,
        datasets: [
          { label: "Online", data: online, backgroundColor: withAlpha(palette[0], 0.35), borderColor: palette[0], borderWidth: 1 },
          { label: "Store",  data: store,  backgroundColor: withAlpha(palette[5], 0.35), borderColor: palette[5], borderWidth: 1 },
          { label: "Wholesale", data: wh,   backgroundColor: withAlpha(palette[3], 0.35), borderColor: palette[3], borderWidth: 1 }
        ]
      },
      options: {
        ...baseChartOptions(),
        scales: {
          y: {
            stacked: true,
            beginAtZero: true,
            max: percent100 ? 100 : undefined,
            grid: { color: "#eef2f7" }
          },
          x: { stacked: true, grid: { display: false } }
        }
      },
      plugins: percent100 ? [stacked100Plugin()] : []
    });

    setSeriesMetaForChart(v, percent100 ? "stackedColumn100" : "stackedColumn");
  }

  // Combo: Line & Clustered Column
  function buildLineClusteredColumn(v) {
    const ctx = chartCanvas(v.bodyEl);
    v.chart = new Chart(ctx, {
      data: {
        labels: MONTHS,
        datasets: [
          {
            type: "bar",
            label: "Sales (This Year)",
            data: salesThisYear,
            backgroundColor: withAlpha(palette[0], 0.35),
            borderColor: palette[0],
            borderWidth: 1,
            yAxisID: "y"
          },
          {
            type: "line",
            label: "Profit (This Year)",
            data: profitThisYear,
            borderColor: palette[1],
            backgroundColor: withAlpha(palette[1], 0.15),
            tension: 0.35,
            pointRadius: 2,
            yAxisID: "y1"
          }
        ]
      },
      options: {
        ...baseChartOptions(),
        scales: {
          y: { beginAtZero: true, position: "left", grid: { color: "#eef2f7" } },
          y1: { beginAtZero: true, position: "right", grid: { display: false } },
          x: { grid: { display: false } }
        }
      }
    });
    setSeriesMetaForChart(v, "lineClusteredColumn");
  }

  // Combo: Line & Stacked Column
  function buildLineStackedColumn(v) {
    const ctx = chartCanvas(v.bodyEl);

    const online = salesThisYear.map(v => Math.round(v * 0.44));
    const store  = salesThisYear.map(v => Math.round(v * 0.39));
    const wh     = salesThisYear.map((v, i) => v - online[i] - store[i]);

    v.chart = new Chart(ctx, {
      data: {
        labels: MONTHS,
        datasets: [
          { type: "bar", label: "Online", data: online, backgroundColor: withAlpha(palette[0], 0.35), borderColor: palette[0], borderWidth: 1, stack: "sales", yAxisID: "y" },
          { type: "bar", label: "Store",  data: store,  backgroundColor: withAlpha(palette[5], 0.35), borderColor: palette[5], borderWidth: 1, stack: "sales", yAxisID: "y" },
          { type: "bar", label: "Wholesale", data: wh,  backgroundColor: withAlpha(palette[3], 0.35), borderColor: palette[3], borderWidth: 1, stack: "sales", yAxisID: "y" },
          { type: "line", label: "Profit (This Year)", data: profitThisYear, borderColor: palette[1], backgroundColor: withAlpha(palette[1], 0.12), tension: 0.35, pointRadius: 2, yAxisID: "y1" }
        ]
      },
      options: {
        ...baseChartOptions(),
        scales: {
          y: { stacked: true, beginAtZero: true, position: "left", grid: { color: "#eef2f7" } },
          y1: { beginAtZero: true, position: "right", grid: { display: false } },
          x: { grid: { display: false } }
        }
      }
    });

    setSeriesMetaForChart(v, "lineStackedColumn");
  }

  function buildScatter(v) {
    const ctx = chartCanvas(v.bodyEl);
    v.chart = new Chart(ctx, {
      type: "scatter",
      data: {
        datasets: [
          {
            label: "Stores",
            data: scatterPoints,
            borderColor: palette[0],
            backgroundColor: withAlpha(palette[0], 0.35),
            pointRadius: 4
          }
        ]
      },
      options: {
        ...baseChartOptions(),
        scales: {
          x: { title: { display: true, text: "Sales (index)" }, grid: { color: "#eef2f7" } },
          y: { title: { display: true, text: "Margin (%)" }, grid: { color: "#eef2f7" }, beginAtZero: true }
        }
      }
    });

    setSeriesMetaForChart(v, "scatter");
  }

  function buildTreemap(v) {
    const ctx = chartCanvas(v.bodyEl);

    const tree = categories.map((c, i) => ({
      label: c,
      value: categoryShare[i]
    }));

    v.chart = new Chart(ctx, {
      type: "treemap",
      data: {
        datasets: [{
          label: "Treemap",
          tree,
          key: "value",
          groups: ["label"],
          spacing: 1,
          borderColor: "#ffffff",
          borderWidth: 1,
          backgroundColor: tree.map((_, i) => withAlpha(palette[i % palette.length], 0.55))
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: { enabled: true }
        }
      }
    });

    setSeriesMetaForChart(v, "treemap");
  }

  // Ribbon chart: prototype (custom SVG ribbons)
  // Power BI ribbon shows rank changes across categories over time.
  // Here we create a clean "ribbon-like" flow between Q1..Q4.
  function buildRibbon(v) {
    const svgNS = "http://www.w3.org/2000/svg";
    const svg = document.createElementNS(svgNS, "svg");
    svg.classList.add("ribbonSvg");
    v.bodyEl.appendChild(svg);

    // Keep a small internal model for series colors:
    const series = [
      { name: "Apparel", color: palette[0] },
      { name: "Footwear", color: palette[1] },
      { name: "Accessories", color: palette[3] },
      { name: "Beauty", color: palette[5] }
    ];

    // Render function (recomputed on resize or color change)
    function render() {
      while (svg.firstChild) svg.removeChild(svg.firstChild);

      const w = v.bodyEl.clientWidth;
      const h = v.bodyEl.clientHeight;

      svg.setAttribute("viewBox", `0 0 ${w} ${h}`);

      // Columns (Q1-Q4)
      const cols = ["Q1", "Q2", "Q3", "Q4"];
      const xPad = 18;
      const topPad = 18;
      const bottomPad = 20;
      const colX = cols.map((_, i) => xPad + i * ((w - 2*xPad) / (cols.length - 1)));

      // Ribbon vertical bands (rank positions)
      const bandH = (h - topPad - bottomPad) / 6;

      // Fake ranks across quarters (1 = top)
      const ranks = {
        Apparel:      [2, 1, 1, 1],
        Footwear:     [1, 2, 3, 2],
        Accessories:  [3, 3, 2, 3],
        Beauty:       [4, 4, 4, 4],
      };

      // Draw axis labels
      cols.forEach((c, i) => {
        const t = document.createElementNS(svgNS, "text");
        t.setAttribute("x", colX[i]);
        t.setAttribute("y", 14);
        t.setAttribute("text-anchor", "middle");
        t.setAttribute("font-size", "12");
        t.setAttribute("font-weight", "700");
        t.setAttribute("fill", "#111827");
        t.textContent = c;
        svg.appendChild(t);
      });

      // Draw ribbons
      series.forEach((s, si) => {
        const r = ranks[s.name];
        const points = r.map((rank, i) => ({
          x: colX[i],
          y: topPad + (rank * bandH)
        }));

        // Thick ribbon using path with a "width"
        const thickness = bandH * 0.85;
        const path = ribbonPath(points, thickness);

        const p = document.createElementNS(svgNS, "path");
        p.setAttribute("d", path);
        p.setAttribute("fill", withAlpha(s.color, 0.35));
        p.setAttribute("stroke", s.color);
        p.setAttribute("stroke-width", "2");
        svg.appendChild(p);

        // left label
        const lab = document.createElementNS(svgNS, "text");
        lab.setAttribute("x", points[0].x - 10);
        lab.setAttribute("y", points[0].y + thickness/2);
        lab.setAttribute("text-anchor", "end");
        lab.setAttribute("font-size", "11");
        lab.setAttribute("font-weight", "700");
        lab.setAttribute("fill", "#111827");
        lab.textContent = s.name;
        svg.appendChild(lab);
      });
    }

    // Build a smooth ribbon between points with thickness
    function ribbonPath(points, thickness) {
      // For simplicity, create top curve and bottom curve.
      const top = points.map(p => ({ x: p.x, y: p.y }));
      const bottom = points.slice().reverse().map(p => ({ x: p.x, y: p.y + thickness }));

      const curve = (pts) => {
        let d = `M ${pts[0].x} ${pts[0].y}`;
        for (let i = 1; i < pts.length; i++) {
          const p0 = pts[i-1];
          const p1 = pts[i];
          const cx = (p0.x + p1.x) / 2;
          d += ` C ${cx} ${p0.y}, ${cx} ${p1.y}, ${p1.x} ${p1.y}`;
        }
        return d;
      };

      const dTop = curve(top);
      const dBottom = curve(bottom);
      return `${dTop} L ${bottom[0].x} ${bottom[0].y} ${dBottom} Z`;
    }

    // Save "ribbon" object so format pane can control colors
    v.ribbon = {
      series,
      render
    };

    // Series meta for format pane
    v.seriesMeta = series.map((s, i) => ({
      key: `r_${i}`,
      label: s.name,
      getColor: () => s.color,
      setColor: (c) => { s.color = c; render(); }
    }));

    // Render now and also on resize
    render();

    // if visual resizes, re-render
    const ro = new ResizeObserver(() => render());
    ro.observe(v.bodyEl);
  }

  // Upload Image Visual
  function buildImage(v, dataUrl) {
    // Clear body, add img
    v.bodyEl.innerHTML = "";
    const img = document.createElement("img");
    img.src = dataUrl;
    img.alt = "Uploaded visual";
    img.style.width = "100%";
    img.style.height = "100%";
    img.style.objectFit = "contain";
    img.style.display = "block";
    v.bodyEl.appendChild(img);

    // No series meta
    v.seriesMeta = [];
  }

  // -------------------------
  // 100% stacked helper plugin
  // (Transforms stacked values to percentages per category)
  // -------------------------
  function stacked100Plugin() {
    return {
      id: "stacked100",
      beforeUpdate(chart) {
        const ds = chart.data.datasets;
        if (!ds || ds.length === 0) return;

        const count = ds[0].data.length;
        for (let i = 0; i < count; i++) {
          let total = 0;
          ds.forEach(d => total += (Number(d.data[i]) || 0));
          if (total === 0) total = 1;

          ds.forEach(d => {
            const v = Number(d.data[i]) || 0;
            d.data[i] = Math.round((v / total) * 1000) / 10; // 1 decimal
          });
        }
      }
    };
  }

  // -------------------------
  // Add visual flow
  // -------------------------
  async function addVisual(type) {
    const v = createVisualShell(type);

    // Each visual renders a correct-looking prototype (not reused)
    if (type === "pie") buildPie(v);
    else if (type === "donut") buildDonut(v);
    else if (type === "line") buildLine(v);
    else if (type === "area") buildArea(v);
    else if (type === "stackedArea") buildStackedArea(v);

    else if (type === "clusteredBar") buildClusteredBar(v);
    else if (type === "stackedBar") buildStackedBar(v, false);
    else if (type === "stackedBar100") buildStackedBar(v, true);

    else if (type === "clusteredColumn") buildClusteredColumn(v);
    else if (type === "stackedColumn") buildStackedColumn(v, false);
    else if (type === "stackedColumn100") buildStackedColumn(v, true);

    else if (type === "lineClusteredColumn") buildLineClusteredColumn(v);
    else if (type === "lineStackedColumn") buildLineStackedColumn(v);

    else if (type === "scatter") buildScatter(v);

    else if (type === "treemap") buildTreemap(v);
    else if (type === "ribbon") buildRibbon(v);

    else if (type === "image") {
      // trigger file upload
      const dataUrl = await promptImageUpload();
      if (!dataUrl) {
        // user cancelled
        deleteVisual(v.id);
        return;
      }
      buildImage(v, dataUrl);
    }

    // Ensure format pane reflects correct series
    renderFormatPane();
  }

  function promptImageUpload() {
    return new Promise((resolve) => {
      imageUpload.value = "";
      imageUpload.onchange = () => {
        const file = imageUpload.files && imageUpload.files[0];
        if (!file) return resolve(null);

        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result));
        reader.onerror = () => resolve(null);
        reader.readAsDataURL(file);
      };
      imageUpload.click();
    });
  }

  addVisualBtn.addEventListener("click", () => {
    addVisual(visualType.value);
  });

  // -------------------------
  // Format pane logic (always visible)
  // -------------------------
  function renderFormatPane() {
    // Always visible by design; just update content.
    const v = selectedId ? visuals[selectedId] : null;

    if (!v) {
      formatStatus.textContent = "Select a visual to format";
      fmtTitle.value = "";
      fmtTitle.disabled = true;

      fmtX.value = ""; fmtY.value = ""; fmtW.value = ""; fmtH.value = "";
      fmtX.disabled = true; fmtY.disabled = true; fmtW.disabled = true; fmtH.disabled = true;

      bringFrontBtn.disabled = true;

      seriesColors.innerHTML = `<div class="emptyState">No visual selected.</div>`;
      return;
    }

    formatStatus.textContent = `${v.type.toUpperCase()} selected`;
    fmtTitle.disabled = false;
    fmtX.disabled = false; fmtY.disabled = false; fmtW.disabled = false; fmtH.disabled = false;
    bringFrontBtn.disabled = false;

    fmtTitle.value = v.titleEl.textContent || "";
    syncFormatPosSize();

    // Build series color controls
    if (!v.seriesMeta || v.seriesMeta.length === 0) {
      seriesColors.innerHTML = `<div class="emptyState">No series to format for this visual.</div>`;
    } else {
      seriesColors.innerHTML = "";
      v.seriesMeta.forEach((s) => {
        const row = document.createElement("div");
        row.className = "seriesRow";

        const name = document.createElement("div");
        name.className = "seriesName";
        name.textContent = s.label;

        const input = document.createElement("input");
        input.className = "colorInput";
        input.type = "color";
        input.value = normalizeToHex(s.getColor());
        input.addEventListener("input", () => {
          // Mandatory: immediate reflection (yellow -> red etc.)
          s.setColor(input.value);
        });

        row.appendChild(name);
        row.appendChild(input);
        seriesColors.appendChild(row);
      });
    }
  }

  // Try to normalize rgba / hex to hex for <input type="color">
  function normalizeToHex(color) {
    if (!color) return "#000000";
    if (color.startsWith("#")) return color;

    // rgba(r,g,b,a)
    const m = color.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/i);
    if (m) {
      const r = Number(m[1]).toString(16).padStart(2, "0");
      const g = Number(m[2]).toString(16).padStart(2, "0");
      const b = Number(m[3]).toString(16).padStart(2, "0");
      return `#${r}${g}${b}`;
    }
    return "#000000";
  }

  // Title change
  fmtTitle.addEventListener("input", () => {
    const v = selectedId ? visuals[selectedId] : null;
    if (!v) return;
    v.titleEl.textContent = fmtTitle.value;
  });

  // Position + size change from format pane
  function applyBoxFromFormat() {
    const v = selectedId ? visuals[selectedId] : null;
    if (!v) return;

    const x = clamp(parseInt(fmtX.value || "0", 10), 0, CANVAS_W - 50);
    const y = clamp(parseInt(fmtY.value || "0", 10), 0, CANVAS_H - 50);
    const w = clamp(parseInt(fmtW.value || `${DEFAULT_W}`, 10), 240, CANVAS_W);
    const h = clamp(parseInt(fmtH.value || `${DEFAULT_H}`, 10), 180, CANVAS_H);

    // Keep within canvas
    const x2 = clamp(x, 0, CANVAS_W - w);
    const y2 = clamp(y, 0, CANVAS_H - h);

    v.el.style.left = `${x2}px`;
    v.el.style.top = `${y2}px`;
    v.el.style.width = `${w}px`;
    v.el.style.height = `${h}px`;

    if (v.chart) v.chart.resize();
    if (v.ribbon) v.ribbon.render();
    syncFormatPosSize();
  }

  [fmtX, fmtY, fmtW, fmtH].forEach(inp => {
    inp.addEventListener("change", applyBoxFromFormat);
    inp.addEventListener("blur", applyBoxFromFormat);
  });

  // Bring to front
  bringFrontBtn.addEventListener("click", () => {
    const v = selectedId ? visuals[selectedId] : null;
    if (!v) return;
    v.el.style.zIndex = `${++zCounter}`;
  });

  // -------------------------
  // Keyboard convenience
  // -------------------------
  window.addEventListener("keydown", (e) => {
    if (e.key === "Delete" || e.key === "Backspace") {
      const v = selectedId ? visuals[selectedId] : null;
      if (v) deleteVisual(v.id);
    }
    if (e.key === "Escape") deselectAll();
  });

  // -------------------------
  // Start with a couple of visuals (optional)
  // (keeps it looking like a real report page)
  // -------------------------
  addVisual("line");
  addVisual("donut");
})();
