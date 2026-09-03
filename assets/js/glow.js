// ============================================================
// GLOW.JS — Popover "GLOW" CONTEXTUAL de la bottom-bar
//
// Glow (halo de color neón, inner+outer) por celda. Mismo patrón que sombra/borde:
//   · Sin selección → MOSAICO. Switch = RESET TOTAL (todas on/off + borra overrides
//     de props por celda). Los controles fijan el valor por defecto del formato.
//   · Con selección → CARÁTULA/S. Override por celda (State.cellGlow*) + ↺.
//
// Controles: switch + color + intensidad + desenfoque. El render (contorno de
// color difuminado, blend aditivo) lo aplica mosaic-3d (_addCellGlow) y export.js.
// ============================================================

const Glow = (() => {

  const DEF = { color: '#00c8ff', inten: 0.85, blur: 0.4 };
  const CELL_NUM = { Intensity: 'cellGlowIntensity', Blur: 'cellGlowBlur' };

  let _raf = false;
  function _scheduleRebuild() {
    if (_raf) return; _raf = true;
    requestAnimationFrame(() => { _raf = false; if (typeof Mosaic3D !== 'undefined') Mosaic3D.rebuild(); });
  }

  function init() { update(); }

  function _ensureCellMaps() {
    if (!State.cellGlow) State.cellGlow = {};
    if (!State.cellGlowColor) State.cellGlowColor = {};
    Object.values(CELL_NUM).forEach(m => { if (!State[m]) State[m] = {}; });
  }
  function _fmtNum(map, id, def) { const v = State[map] ? State[map][id] : undefined; return (typeof v === 'number') ? v : def; }
  function _fmtColor(id) { const v = State.glowColor ? State.glowColor[id] : undefined; return (typeof v === 'string' && v) ? v : DEF.color; }

  function update() {
    const container = document.getElementById('bb-glow');
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

    let on, color, inten, bl;
    if (cellMode) {
      on = !!Mosaic3D.getCellGlow(sel[0]);
      color = Mosaic3D.getCellGlowColor(sel[0]);
      inten = Mosaic3D.getCellGlowIntensity(sel[0]);
      bl = Mosaic3D.getCellGlowBlur(sel[0]);
    } else {
      on = keys.some(k => Mosaic3D.getCellGlow(k));
      color = _fmtColor(fmt.id);
      inten = _fmtNum('glowIntensity', fmt.id, DEF.inten);
      bl = _fmtNum('glowBlur', fmt.id, DEF.blur);
    }

    // ── SWITCH ──
    const sw = document.createElement('label');
    sw.className = 'switch';
    sw.dataset.tooltip = cellMode ? 'Glow de la selección' : 'Glow de todas las celdas';
    const input = document.createElement('input'); input.type = 'checkbox'; input.checked = on;
    input.addEventListener('change', () => {
      _ensureCellMaps();
      if (cellMode) {
        sel.forEach(k => { State.cellGlow[k] = input.checked; });
      } else {
        (Mosaic3D.getAllCellKeys ? Mosaic3D.getAllCellKeys() : []).forEach(k => { State.cellGlow[k] = input.checked; });
        if (State.cellGlowColor) Object.keys(State.cellGlowColor).forEach(k => delete State.cellGlowColor[k]);
        Object.values(CELL_NUM).forEach(m => { if (State[m]) Object.keys(State[m]).forEach(k => delete State[m][k]); });
      }
      _scheduleRebuild(); update();
    });
    const track = document.createElement('span'); track.className = 'track';
    const knob = document.createElement('span'); knob.className = 'knob'; track.appendChild(knob);
    sw.append(input, track);

    // ── COLOR ──
    const colWrap = document.createElement('div'); colWrap.className = 'bb-slider-wrap';
    const colLab = document.createElement('span'); colLab.className = 'bb-slider-label bb-sublabel'; colLab.textContent = 'Color';
    const swatch = document.createElement('input'); swatch.type = 'color'; swatch.className = 'bb-bg-swatch'; swatch.value = color;
    swatch.dataset.tooltip = cellMode ? 'Color del glow (selección)' : 'Color del glow (formato)';
    swatch.addEventListener('input', () => {
      if (cellMode) { if (!State.cellGlowColor) State.cellGlowColor = {}; sel.forEach(k => { State.cellGlowColor[k] = swatch.value; }); }
      else { if (!State.glowColor) State.glowColor = {}; State.glowColor[State.activeFormatId] = swatch.value; }
      _scheduleRebuild();
    });
    colWrap.append(colLab, swatch);

    // ── PARTS ──
    const parts = [
      sw,
      colWrap,
      _slider('Intens.', Math.round(inten * 100), 0, 100, v => _setNum(cellMode, sel, 'Intensity', 'glowIntensity', v / 100)),
      _slider('Desenf.', Math.round(bl * 100),    0, 100, v => _setNum(cellMode, sel, 'Blur',      'glowBlur',      v / 100)),
    ];

    if (cellMode) {
      const reset = document.createElement('button');
      reset.className = 'bb-cellop-reset'; reset.textContent = '↺';
      reset.dataset.tooltip = 'Quitar el glow propio (seguir el general)';
      reset.addEventListener('click', () => {
        ['cellGlow', 'cellGlowColor', ...Object.values(CELL_NUM)].forEach(m => { if (State[m]) sel.forEach(k => delete State[m][k]); });
        if (typeof Mosaic3D !== 'undefined') Mosaic3D.rebuild();
        update();
      });
      parts.push(reset);
    }

    parts.forEach((el, i) => {
      if (i > 0) { const s = document.createElement('div'); s.className = 'bb-vsep'; container.appendChild(s); }
      container.appendChild(el);
    });
  }

  function _setNum(cellMode, sel, cellSuffix, fmtMap, val) {
    if (cellMode) {
      const m = CELL_NUM[cellSuffix]; if (!State[m]) State[m] = {};
      sel.forEach(k => { State[m][k] = val; });
    } else {
      if (!State[fmtMap]) State[fmtMap] = {};
      State[fmtMap][State.activeFormatId] = val;
    }
    _scheduleRebuild();
  }

  function _slider(label, value, min, max, onInput) {
    const wrap = document.createElement('div'); wrap.className = 'bb-slider-wrap';
    const lab = document.createElement('span'); lab.className = 'bb-slider-label bb-sublabel'; lab.textContent = label;
    const sl = document.createElement('input');
    sl.type = 'range'; sl.min = min; sl.max = max; sl.step = 1; sl.value = value;
    sl.className = 'bb-slider-control'; sl.style.width = '64px';
    const val = document.createElement('span'); val.className = 'bb-slider-val'; val.textContent = value;
    sl.addEventListener('input', () => { val.textContent = sl.value; onInput(+sl.value); });
    wrap.append(lab, sl, val);
    return wrap;
  }

  return { init, update };
})();
