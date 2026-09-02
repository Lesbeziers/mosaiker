// ============================================================
// MOSAIC-OPACITY.JS — Slider de opacidad del mosaico por formato
//
// Vive en la bottom-bar (zona izquierda) junto a los switches de
// overlays. El valor se guarda por formato en State.mosaicOpacity[id]
// (0..1, default 1). Se aplica vía CSS sobre el canvas WebGL en vivo;
// VER TODAS y Export también lo respetan al componer.
// ============================================================

const MosaicOpacity = (() => {

  function init() {
    update();
  }

  // Llamada al cambiar de formato (desde Formats.setActive). El slider ya no lo
  // pinta este módulo: el popover de Opacidad usa UN solo slider contextual
  // (CellOpacity) que en modo formato llama aquí a get()/set(). Aquí solo
  // aplicamos la opacidad del formato al canvas.
  function update() {
    _applyToCanvas();
  }

  // Devuelve la opacidad actual del formato activo (0..1).
  // Si no hay formato o no se ha tocado, devuelve 1.
  function get(formatId) {
    const id = formatId ?? State.activeFormatId;
    if (!id) return 1;
    const v = State.mosaicOpacity[id];
    return (typeof v === 'number') ? v : 1;
  }

  // Fija la opacidad del formato activo (0..1) y la aplica en vivo.
  function set(v01) {
    const id = State.activeFormatId;
    if (!id) return;
    State.mosaicOpacity[id] = v01;
    _applyToCanvas();
  }

  // ── PRIVADAS ─────────────────────────────────────────────

  function _applyToCanvas() {
    const canvas = document.querySelector('#lienzo .mosaic-canvas');
    if (!canvas) return;
    canvas.style.opacity = String(get());
  }

  return { init, update, get, set };
})();
