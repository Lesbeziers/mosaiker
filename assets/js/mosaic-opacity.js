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

  // Llamada al cambiar de formato (desde Formats.setActive)
  function update() {
    _renderSlider();
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

  // ── PRIVADAS ─────────────────────────────────────────────

  function _renderSlider() {
    const container = document.getElementById('bb-opacity');
    if (!container) return;
    container.innerHTML = '';

    const fmt = (typeof Formats !== 'undefined') ? Formats.getActive() : null;
    if (!fmt) return;

    const wrap = document.createElement('div');
    wrap.className = 'bb-opacity-wrap';

    const label = document.createElement('span');
    label.className = 'bb-opacity-label';
    label.textContent = 'Opacidad mosaico';

    const slider = document.createElement('input');
    slider.type  = 'range';
    slider.min   = 0;
    slider.max   = 100;
    slider.step  = 1;
    slider.value = Math.round(get(fmt.id) * 100);
    slider.className = 'bb-opacity-slider';

    const val = document.createElement('span');
    val.className = 'bb-opacity-val';
    val.textContent = slider.value;

    slider.addEventListener('input', () => {
      const v = +slider.value;
      val.textContent = v;
      State.mosaicOpacity[fmt.id] = v / 100;
      _applyToCanvas();
    });

    wrap.append(label, slider, val);
    container.appendChild(wrap);
  }

  function _applyToCanvas() {
    const canvas = document.querySelector('#lienzo .mosaic-canvas');
    if (!canvas) return;
    canvas.style.opacity = String(get());
  }

  return { init, update, get };
})();
