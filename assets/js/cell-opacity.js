// ============================================================
// CELL-OPACITY.JS — Slider de opacidad CONTEXTUAL (popover Opacidad)
//
// UN solo slider, sin label. Su ámbito depende de la selección:
//   · Sin selección  → opacidad del FORMATO (delega en MosaicOpacity.get/set).
//   · Con selección  → opacidad de la(s) CARÁTULA(s) seleccionada(s): override
//     del valor de diseño del esqueleto (transparencias del ZIG-ZAG). Se guarda
//     por formato (comp.cellOpacity, puntero State.cellOpacity) y se hereda.
//
// El tinte del bottom (Toolbar .sel-mode) ya indica el modo, por eso el slider
// no lleva label. El ↺ (volver al diseño) solo aparece en modo carátula.
//
// El render por-celda lo aplica mosaic-3d.js (_addMesh) y export.js. Mosaic3D
// avisa a este módulo al cambiar la selección; Formats, al cambiar de formato.
// ============================================================

const CellOpacity = (() => {

  function init() { update(); }

  function update() {
    const container = document.getElementById('bb-opacity');
    if (!container) return;
    container.innerHTML = '';

    const sel = (typeof Mosaic3D !== 'undefined' && Mosaic3D.getSelection) ? Mosaic3D.getSelection() : [];
    const cellMode = sel.length > 0;

    // Valor actual según ámbito.
    let cur;
    if (cellMode) {
      cur = (Mosaic3D.getCellOpacity) ? Mosaic3D.getCellOpacity(sel[0]) : 1;
      if (typeof cur !== 'number') cur = 1;
    } else {
      cur = (typeof MosaicOpacity !== 'undefined') ? MosaicOpacity.get() : 1;
    }

    const wrap = document.createElement('div');
    wrap.className = 'bb-slider-wrap';

    const slider = document.createElement('input');
    slider.type = 'range'; slider.min = 0; slider.max = 100; slider.step = 1;
    slider.value = Math.round(cur * 100);
    slider.className = 'bb-slider-control';

    const val = document.createElement('span');
    val.className = 'bb-slider-val';
    val.textContent = slider.value;

    slider.addEventListener('input', () => {
      const v = +slider.value;
      val.textContent = v;
      if (cellMode) {
        if (!State.cellOpacity) State.cellOpacity = {};
        sel.forEach(k => { State.cellOpacity[k] = v / 100; });
        if (typeof Mosaic3D !== 'undefined') Mosaic3D.rebuild();
      } else if (typeof MosaicOpacity !== 'undefined') {
        MosaicOpacity.set(v / 100);
      }
    });

    wrap.append(slider, val);

    // ↺ solo en modo carátula: restablece la opacidad de diseño.
    if (cellMode) {
      const reset = document.createElement('button');
      reset.className = 'bb-cellop-reset';
      reset.textContent = '↺';
      reset.dataset.tooltip = 'Volver a la opacidad de diseño';
      reset.addEventListener('click', () => {
        if (State.cellOpacity) sel.forEach(k => { delete State.cellOpacity[k]; });
        if (typeof Mosaic3D !== 'undefined') Mosaic3D.rebuild();
        update();
      });
      wrap.append(reset);
    }

    container.appendChild(wrap);
  }

  return { init, update };
})();
