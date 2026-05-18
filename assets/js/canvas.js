// ============================================================
// CANVAS.JS — Lienzo proporcional centrado en canvas-area
// ============================================================

const Canvas = (() => {

  const MARGIN_X = 40;
  const MARGIN_Y = 40;
  const LABEL_RESERVED = 28; // espacio reservado bajo el lienzo para la etiqueta

  let activeFormat = null;

  function init() {
    window.addEventListener('resize', render);
  }

  function setFormat(fmt) {
    activeFormat = fmt;
    render();
  }

  function clear() {
    activeFormat = null;
    render();
  }

  function render() {
    const lienzo = document.getElementById('lienzo');
    const label  = document.getElementById('lienzo-label');
    const area   = document.getElementById('canvas-area');
    if (!lienzo || !area) return;

    if (!activeFormat) {
      lienzo.style.display = 'none';
      if (label) label.textContent = '';
      return;
    }

    const availW = area.clientWidth  - MARGIN_X * 2;
    const availH = area.clientHeight - MARGIN_Y * 2 - LABEL_RESERVED;
    if (availW <= 0 || availH <= 0) return;

    const formatRatio = activeFormat.width / activeFormat.height;
    const availRatio  = availW / availH;

    let w, h;
    if (formatRatio > availRatio) {
      w = availW;
      h = availW / formatRatio;
    } else {
      h = availH;
      w = availH * formatRatio;
    }

    lienzo.style.display = 'block';
    lienzo.style.width  = Math.round(w) + 'px';
    lienzo.style.height = Math.round(h) + 'px';
    lienzo.style.left   = Math.round((area.clientWidth  - w) / 2) + 'px';
    lienzo.style.top    = Math.round((area.clientHeight - h) / 2) + 'px';

    if (label) {
      label.textContent = `${activeFormat.name} — ${activeFormat.width} × ${activeFormat.height}`;
    }

    // Notifica al render 3D para que ajuste el canvas WebGL
    if (typeof Mosaic3D !== 'undefined') Mosaic3D.resize();
  }

  return { init, setFormat, clear, render };
})();
