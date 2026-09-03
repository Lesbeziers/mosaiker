// ============================================================
// STACKS-BORDER.JS — Popover "BORDE" CONTEXTUAL de la bottom-bar
//
// Controla el marco de las celdas: switch on/off, color y grosor. El ámbito
// depende de la selección (igual que Transparencia):
//   · Sin selección → MOSAICO. El switch es un RESET TOTAL: ON→todas, OFF→ninguna,
//     y en ambos casos BORRA los overrides de color/grosor por celda → las celdas
//     vuelven al estilo por defecto del formato (State.stacksBorderColor / Width).
//   · Con selección → CARÁTULA/S. Switch/color/grosor de la(s) celda(s)
//     seleccionada(s): override en State.cellBorder / cellBorderColor /
//     cellBorderWidth. ↺ vuelve al diseño (borra los overrides de la selección).
//
// El default de diseño (qué celdas piden borde) lo aporta slot.frame vía
// mosaic-3d. El render lo aplican mosaic-3d.js (_addMesh) y export.js.
// ============================================================

const StacksBorder = (() => {

  const DEFAULT_WIDTH = 3;
  const DEFAULT_COLOR = '#ffffff';

  function init() { update(); }

  function _ensureMaps() {
    if (!State.cellBorder)      State.cellBorder = {};
    if (!State.cellBorderColor) State.cellBorderColor = {};
    if (!State.cellBorderWidth) State.cellBorderWidth = {};
  }

  // Llamada al cambiar la selección, el formato o el mosaico.
  function update() {
    const container = document.getElementById('bb-stacks-border');
    if (!container) return;
    container.innerHTML = '';

    const fmt = (typeof Formats !== 'undefined') ? Formats.getActive() : null;
    if (!fmt) return;

    container.style.display = 'flex';
    container.style.alignItems = 'center';
    container.style.gap = '8px';

    const sel = (typeof Mosaic3D !== 'undefined' && Mosaic3D.getSelection) ? Mosaic3D.getSelection() : [];
    const cellMode = sel.length > 0;
    const keys = (typeof Mosaic3D !== 'undefined' && Mosaic3D.getAllCellKeys) ? Mosaic3D.getAllCellKeys() : [];

    // Estado inicial de los controles según ámbito.
    let curOn, curColor, curWidth;
    if (cellMode) {
      curOn    = !!Mosaic3D.getCellBorder(sel[0]);
      curColor = Mosaic3D.getCellBorderColor(sel[0]) || DEFAULT_COLOR;
      curWidth = Mosaic3D.getCellBorderWidth(sel[0]);
      if (typeof curWidth !== 'number') curWidth = DEFAULT_WIDTH;
    } else {
      curOn    = keys.some(k => Mosaic3D.getCellBorder(k));   // ¿alguna con borde?
      curColor = color(fmt.id);
      curWidth = width(fmt.id);
    }

    // ── SWITCH ──
    const sw = document.createElement('label');
    sw.className = 'switch';
    sw.dataset.tooltip = cellMode ? 'Borde de la selección' : 'Borde de todas las celdas';
    const input = document.createElement('input');
    input.type = 'checkbox';
    input.checked = curOn;
    input.addEventListener('change', () => {
      _ensureMaps();
      if (cellMode) {
        sel.forEach(k => { State.cellBorder[k] = input.checked; });
      } else {
        // General = RESET TOTAL: todas las celdas al mismo on/off y al estilo por
        // defecto del formato → se BORRAN los overrides de color/grosor por celda.
        Object.keys(State.cellBorderColor).forEach(k => delete State.cellBorderColor[k]);
        Object.keys(State.cellBorderWidth).forEach(k => delete State.cellBorderWidth[k]);
        const all = (typeof Mosaic3D !== 'undefined' && Mosaic3D.getAllCellKeys) ? Mosaic3D.getAllCellKeys() : [];
        all.forEach(k => { State.cellBorder[k] = input.checked; });
      }
      if (typeof Mosaic3D !== 'undefined') Mosaic3D.rebuild();
      update();
    });
    const track = document.createElement('span'); track.className = 'track';
    const knob  = document.createElement('span'); knob.className  = 'knob';
    track.appendChild(knob);
    sw.append(input, track);

    // ── COLOR ──
    const swatch = document.createElement('input');
    swatch.type = 'color';
    swatch.className = 'bb-bg-swatch';
    swatch.value = curColor;
    swatch.dataset.tooltip = cellMode ? 'Color del borde (selección)' : 'Color del borde (formato)';
    swatch.addEventListener('input', () => {
      _ensureMaps();
      if (cellMode) {
        sel.forEach(k => { State.cellBorderColor[k] = swatch.value; });
      } else {
        if (!State.stacksBorderColor) State.stacksBorderColor = {};
        State.stacksBorderColor[fmt.id] = swatch.value;
      }
      if (typeof Mosaic3D !== 'undefined') Mosaic3D.rebuild();
    });

    // ── GROSOR ──
    const wInput = document.createElement('input');
    wInput.type = 'number';
    wInput.min = '0'; wInput.max = '20'; wInput.step = '0.5';
    wInput.value = String(curWidth);
    wInput.className = 'bb-border-width';
    wInput.dataset.tooltip = 'Grosor del borde (por defecto 3)';
    wInput.addEventListener('change', () => {
      let v = parseFloat(wInput.value);
      if (!Number.isFinite(v) || v < 0) v = DEFAULT_WIDTH;
      v = Math.min(20, v);
      wInput.value = String(v);
      _ensureMaps();
      if (cellMode) {
        sel.forEach(k => { State.cellBorderWidth[k] = v; });
      } else {
        if (!State.stacksBorderWidth) State.stacksBorderWidth = {};
        State.stacksBorderWidth[fmt.id] = v;
      }
      if (typeof Mosaic3D !== 'undefined') Mosaic3D.rebuild();
    });

    container.append(sw, swatch, wInput);

    // ── ↺ (solo carátula): vuelve al diseño borrando overrides de la selección ──
    if (cellMode) {
      const reset = document.createElement('button');
      reset.className = 'bb-cellop-reset';
      reset.textContent = '↺';
      reset.dataset.tooltip = 'Volver al borde de diseño';
      reset.addEventListener('click', () => {
        sel.forEach(k => {
          if (State.cellBorder)      delete State.cellBorder[k];
          if (State.cellBorderColor) delete State.cellBorderColor[k];
          if (State.cellBorderWidth) delete State.cellBorderWidth[k];
        });
        if (typeof Mosaic3D !== 'undefined') Mosaic3D.rebuild();
        update();
      });
      container.append(reset);
    }
  }

  // Grosor por defecto del formato. Default 3.
  function width(formatId) {
    const id = formatId ?? State.activeFormatId;
    const v = (State.stacksBorderWidth) ? State.stacksBorderWidth[id] : undefined;
    return (typeof v === 'number' && v >= 0) ? v : DEFAULT_WIDTH;
  }

  // Color por defecto del formato. Default blanco.
  function color(formatId) {
    const id = formatId ?? State.activeFormatId;
    const v = (State.stacksBorderColor) ? State.stacksBorderColor[id] : undefined;
    return v || DEFAULT_COLOR;
  }

  return { init, update, width, color };
})();
