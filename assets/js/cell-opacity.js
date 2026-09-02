// ============================================================
// CELL-OPACITY.JS — Opacidad por carátula (selección) en la bottom-bar
//
// Aparece SOLO cuando hay celdas seleccionadas (clic / shift+clic). Ajusta la
// opacidad de la(s) carátula(s) seleccionada(s): un override del valor de diseño
// del esqueleto (de ahí salen las transparencias del ZIG-ZAG). Se multiplica con
// la opacidad global del mosaico. Se guarda por formato (comp.cellOpacity, puntero
// State.cellOpacity) y se hereda.
//
// El render lo aplica mosaic-3d.js (_addMesh) y export.js. Mosaic3D avisa a este
// módulo cuando cambia la selección.
// ============================================================

const CellOpacity = (() => {

  function init() { update(); }

  // Llamada al cambiar la selección, el formato o el mosaico. SIEMPRE se muestra
  // el control; si no hay selección, se atenúa (20%) y se deshabilita.
  function update() {
    const container = document.getElementById('bb-cell-opacity');
    if (!container) return;
    container.innerHTML = '';

    const sel = (typeof Mosaic3D !== 'undefined' && Mosaic3D.getSelection) ? Mosaic3D.getSelection() : [];
    const active = sel.length > 0;

    // Opacidad de la primera seleccionada (o 100 neutro si no hay selección).
    let cur = (active && Mosaic3D.getCellOpacity) ? Mosaic3D.getCellOpacity(sel[0]) : null;
    if (typeof cur !== 'number') cur = 1;

    const wrap = document.createElement('div');
    wrap.className = 'bb-slider-wrap bb-caratula' + (active ? '' : ' disabled');

    const label = document.createElement('span');
    label.className = 'bb-slider-label bb-sublabel';
    label.textContent = (active && sel.length > 1) ? `Carátula (${sel.length})` : 'Carátula';

    const slider = document.createElement('input');
    slider.type = 'range'; slider.min = 0; slider.max = 100; slider.step = 1;
    slider.value = Math.round(cur * 100);
    slider.className = 'bb-slider-control';
    slider.disabled = !active;

    const val = document.createElement('span');
    val.className = 'bb-slider-val';
    val.textContent = slider.value;

    slider.addEventListener('input', () => {
      if (!active) return;
      const v = +slider.value;
      val.textContent = v;
      if (!State.cellOpacity) State.cellOpacity = {};
      sel.forEach(k => { State.cellOpacity[k] = v / 100; });
      if (typeof Mosaic3D !== 'undefined') Mosaic3D.rebuild();
    });

    // ↺ restablece la opacidad de diseño de las celdas seleccionadas.
    const reset = document.createElement('button');
    reset.className = 'bb-cellop-reset';
    reset.textContent = '↺';
    reset.dataset.tooltip = 'Volver a la opacidad de diseño';
    reset.disabled = !active;
    reset.addEventListener('click', () => {
      if (!active) return;
      if (State.cellOpacity) sel.forEach(k => { delete State.cellOpacity[k]; });
      if (typeof Mosaic3D !== 'undefined') Mosaic3D.rebuild();
      update();   // refresca el slider al valor de diseño
    });

    wrap.append(label, slider, val, reset);
    container.appendChild(wrap);
  }

  return { init, update };
})();
