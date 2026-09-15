// ============================================================
// BLEND-MODE.JS — Modo de capa (blend mode) del MOSAICO por formato
//
// Fase 1: el modo se aplica al MOSAICO ENTERO contra el fondo del lienzo.
// - Editor: CSS mix-blend-mode sobre el canvas WebGL (#lienzo .mosaic-canvas),
//   que se mezcla con el fondo (color/imagen) que vive detrás en #lienzo.
// - Export: globalCompositeOperation antes de dibujar el mosaico sobre el fondo.
//
// El valor se guarda por formato en State.mosaicBlendMode[id]. Vive en la
// bottom-bar (#bb-blendmode), botón "Modo capa" (contextual: de momento
// ámbito Mosaico; la Fase 2 añadirá modo POR CELDA con selección).
//
// Modos incluidos: los soportados por CSS mix-blend-mode Y por canvas
// globalCompositeOperation con el MISMO nombre (paridad editor/export).
// "Pass Through" = normal (composición normal sobre el fondo).
// ============================================================

const BlendMode = (() => {

  const MODES = [
    { id: 'normal',      label: 'Pass Through',        css: 'normal',      canvas: 'source-over' },
    { id: 'multiply',    label: 'Multiplicar',         css: 'multiply',    canvas: 'multiply' },
    { id: 'screen',      label: 'Trama',               css: 'screen',      canvas: 'screen' },
    { id: 'overlay',     label: 'Superponer',          css: 'overlay',     canvas: 'overlay' },
    { id: 'darken',      label: 'Oscurecer',           css: 'darken',      canvas: 'darken' },
    { id: 'lighten',     label: 'Aclarar',             css: 'lighten',     canvas: 'lighten' },
    { id: 'color-dodge', label: 'Sobreexponer color',  css: 'color-dodge', canvas: 'color-dodge' },
    { id: 'color-burn',  label: 'Subexponer color',    css: 'color-burn',  canvas: 'color-burn' },
    { id: 'hard-light',  label: 'Luz intensa',         css: 'hard-light',  canvas: 'hard-light' },
    { id: 'soft-light',  label: 'Luz suave',           css: 'soft-light',  canvas: 'soft-light' },
    { id: 'difference',  label: 'Diferencia',          css: 'difference',  canvas: 'difference' },
    { id: 'exclusion',   label: 'Exclusión',           css: 'exclusion',   canvas: 'exclusion' },
    { id: 'hue',         label: 'Tono',                css: 'hue',         canvas: 'hue' },
    { id: 'saturation',  label: 'Saturación',          css: 'saturation',  canvas: 'saturation' },
    { id: 'color',       label: 'Color',               css: 'color',       canvas: 'color' },
    { id: 'luminosity',  label: 'Luminosidad',         css: 'luminosity',  canvas: 'luminosity' },
  ];

  function init() { update(); }

  // Llamada al cambiar de formato (desde Formats.setActive).
  function update() {
    _render();
    _apply();
  }

  // id de modo del formato (default 'normal').
  function get(formatId) {
    const id = formatId ?? State.activeFormatId;
    if (!id || !State.mosaicBlendMode) return 'normal';
    return State.mosaicBlendMode[id] || 'normal';
  }

  function set(formatId, modeId) {
    const id = formatId ?? State.activeFormatId;
    if (!id) return;
    if (!State.mosaicBlendMode) State.mosaicBlendMode = {};
    if (!modeId || modeId === 'normal') delete State.mosaicBlendMode[id];
    else State.mosaicBlendMode[id] = modeId;
    _apply();
  }

  // Valor de canvas globalCompositeOperation para el export.
  function canvasOpFor(formatId) {
    const m = MODES.find(x => x.id === get(formatId));
    return m ? m.canvas : 'source-over';
  }

  // ── PRIVADAS ─────────────────────────────────────────────

  function _apply() {
    const canvas = document.querySelector('#lienzo .mosaic-canvas');
    if (!canvas) return;
    const m = MODES.find(x => x.id === get(State.activeFormatId));
    canvas.style.mixBlendMode = m ? m.css : 'normal';
  }

  function _render() {
    const container = document.getElementById('bb-blendmode');
    if (!container) return;
    container.innerHTML = '';

    const fmt = (typeof Formats !== 'undefined') ? Formats.getActive() : null;
    if (!fmt) return;

    const sel = document.createElement('select');
    sel.className = 'bb-blend-select';
    MODES.forEach(m => {
      const opt = document.createElement('option');
      opt.value = m.id;
      opt.textContent = m.label;
      if (m.id === get(fmt.id)) opt.selected = true;
      sel.appendChild(opt);
    });
    sel.addEventListener('change', () => set(fmt.id, sel.value));

    container.appendChild(sel);
  }

  return { init, update, get, set, canvasOpFor, MODES };
})();
