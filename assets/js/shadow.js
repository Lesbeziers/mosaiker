// ============================================================
// SHADOW.JS — Popover "SOMBRA" CONTEXTUAL de la bottom-bar
//
// Sombra (drop shadow) por celda. Mismo patrón que el borde:
//   · Sin selección → MOSAICO. El switch es un RESET TOTAL: ON→todas, OFF→ninguna,
//     y borra los overrides de props por celda. Los sliders fijan el valor por
//     defecto del formato (State.shadow*), que respetan los overrides por celda.
//   · Con selección → CARÁTULA/S. switch/props de la(s) celda(s): override en
//     State.cellShadow*. ↺ quita la sombra propia (vuelve a seguir el general).
//
// Controles: switch + transparencia (opacidad) + posición X + posición Y +
// desenfoque. El render lo aplica mosaic-3d (_addCellShadow) y export.js.
// ============================================================

const Shadow = (() => {

  const DEF = { op: 0.45, x: 0, y: 0, blur: 0.35 };

  // El render de la sombra se decide al construir la malla → rebuild. Coalescemos
  // a ≤1 por frame para arrastrar fluido.
  let _raf = false;
  function _scheduleRebuild() {
    if (_raf) return; _raf = true;
    requestAnimationFrame(() => { _raf = false; if (typeof Mosaic3D !== 'undefined') Mosaic3D.rebuild(); });
  }

  function init() { update(); }

  const CELL_MAPS = { Opacity: 'cellShadowOpacity', X: 'cellShadowX', Y: 'cellShadowY', Blur: 'cellShadowBlur' };
  function _ensureCellMaps() {
    if (!State.cellShadow) State.cellShadow = {};
    Object.values(CELL_MAPS).forEach(m => { if (!State[m]) State[m] = {}; });
  }
  function _ensureFmtMaps() {
    ['shadowOpacity', 'shadowX', 'shadowY', 'shadowBlur'].forEach(m => { if (!State[m]) State[m] = {}; });
  }
  function _fmtVal(map, id, def) { const v = State[map] ? State[map][id] : undefined; return (typeof v === 'number') ? v : def; }

  function update() {
    const container = document.getElementById('bb-shadow');
    if (!container) return;
    container.innerHTML = '';
    const fmt = (typeof Formats !== 'undefined') ? Formats.getActive() : null;
    if (!fmt) return;
    container.style.display = 'flex';
    container.style.alignItems = 'center';
    container.style.gap = '10px';

    const sel = (typeof Mosaic3D !== 'undefined' && Mosaic3D.getSelection) ? Mosaic3D.getSelection() : [];
    const cellMode = sel.length > 0;
    const keys = (typeof Mosaic3D !== 'undefined' && Mosaic3D.getAllCellKeys) ? Mosaic3D.getAllCellKeys() : [];

    // Valores actuales (efectivos).
    let on, op, x, y, bl;
    if (cellMode) {
      on = !!Mosaic3D.getCellShadow(sel[0]);
      op = Mosaic3D.getCellShadowOpacity(sel[0]);
      x  = Mosaic3D.getCellShadowX(sel[0]);
      y  = Mosaic3D.getCellShadowY(sel[0]);
      bl = Mosaic3D.getCellShadowBlur(sel[0]);
    } else {
      on = keys.some(k => Mosaic3D.getCellShadow(k));
      op = _fmtVal('shadowOpacity', fmt.id, DEF.op);
      x  = _fmtVal('shadowX', fmt.id, DEF.x);
      y  = _fmtVal('shadowY', fmt.id, DEF.y);
      bl = _fmtVal('shadowBlur', fmt.id, DEF.blur);
    }

    // ── SWITCH ──
    const sw = document.createElement('label');
    sw.className = 'switch';
    sw.dataset.tooltip = cellMode ? 'Sombra de la selección' : 'Sombra de todas las celdas';
    const input = document.createElement('input'); input.type = 'checkbox'; input.checked = on;
    input.addEventListener('change', () => {
      _ensureCellMaps();
      if (cellMode) {
        sel.forEach(k => { State.cellShadow[k] = input.checked; });
      } else {
        // Reset total: todas on/off + borra overrides de props por celda.
        (Mosaic3D.getAllCellKeys ? Mosaic3D.getAllCellKeys() : []).forEach(k => { State.cellShadow[k] = input.checked; });
        Object.values(CELL_MAPS).forEach(m => { if (State[m]) Object.keys(State[m]).forEach(k => delete State[m][k]); });
      }
      _scheduleRebuild(); update();
    });
    const track = document.createElement('span'); track.className = 'track';
    const knob = document.createElement('span'); knob.className = 'knob'; track.appendChild(knob);
    sw.append(input, track);

    // ── SLIDERS ──
    const parts = [
      sw,
      _slider('Transp.', Math.round(op * 100),   0, 100, v => _setProp(cellMode, sel, 'Opacity', 'shadowOpacity', v / 100)),
      _slider('X',       Math.round(x  * 100), -50,  50, v => _setProp(cellMode, sel, 'X',       'shadowX',       v / 100)),
      _slider('Y',       Math.round(y  * 100), -50,  50, v => _setProp(cellMode, sel, 'Y',       'shadowY',       v / 100)),
      _slider('Desenf.', Math.round(bl * 100),   0, 100, v => _setProp(cellMode, sel, 'Blur',    'shadowBlur',    v / 100)),
    ];

    // ── ↺ (solo carátula) ──
    if (cellMode) {
      const reset = document.createElement('button');
      reset.className = 'bb-cellop-reset';
      reset.textContent = '↺';
      reset.dataset.tooltip = 'Quitar la sombra propia (seguir el general)';
      reset.addEventListener('click', () => {
        ['cellShadow', ...Object.values(CELL_MAPS)].forEach(m => { if (State[m]) sel.forEach(k => delete State[m][k]); });
        if (typeof Mosaic3D !== 'undefined') Mosaic3D.rebuild();
        update();
      });
      parts.push(reset);
    }

    // Monta los conceptos con una rayita separadora entre cada uno.
    parts.forEach((el, i) => {
      if (i > 0) { const s = document.createElement('div'); s.className = 'bb-vsep'; container.appendChild(s); }
      container.appendChild(el);
    });
  }

  function _setProp(cellMode, sel, cellSuffix, fmtMap, val) {
    if (cellMode) {
      const m = CELL_MAPS[cellSuffix];
      if (!State[m]) State[m] = {};
      sel.forEach(k => { State[m][k] = val; });
    } else {
      _ensureFmtMaps();
      State[fmtMap][State.activeFormatId] = val;
    }
    _scheduleRebuild();
  }

  function _slider(label, value, min, max, onInput) {
    const wrap = document.createElement('div'); wrap.className = 'bb-slider-wrap';
    const lab = document.createElement('span'); lab.className = 'bb-slider-label bb-sublabel'; lab.textContent = label;
    const sl = document.createElement('input');
    sl.type = 'range'; sl.min = min; sl.max = max; sl.step = 1; sl.value = value;
    sl.className = 'bb-slider-control'; sl.style.width = '58px';
    const val = document.createElement('span'); val.className = 'bb-slider-val'; val.textContent = value;
    sl.addEventListener('input', () => { val.textContent = sl.value; onInput(+sl.value); });
    wrap.append(lab, sl, val);
    return wrap;
  }

  return { init, update };
})();
