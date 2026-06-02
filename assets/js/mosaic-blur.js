// ============================================================
// MOSAIC-BLUR.JS — Slider de desenfoque del mosaico por formato
//
// Hermano de mosaic-opacity.js. Vive en la bottom-bar (#bb-blur).
// El valor se guarda por formato en State.mosaicBlur[id] (0..1,
// default 0). Se aplica vía CSS filter:blur() sobre el canvas WebGL
// en vivo; VER TODAS y Export también lo respetan al componer.
//
// El desenfoque se expresa como FRACCIÓN de la altura del lienzo
// (no en px fijos): así el preview del editor, la snapshot de VER
// TODAS y el JPG exportado a resolución real lucen igual de borrosos.
// ============================================================

const MosaicBlur = (() => {

  // Desenfoque máximo (slider al 100%) = 5% de la altura.
  const MAX_BLUR_FRAC = 0.05;

  function init() {
    update();
  }

  // Llamada al cambiar de formato (desde Formats.setActive)
  function update() {
    _renderSlider();
    _applyToCanvas();
  }

  // Devuelve el desenfoque normalizado del formato (0..1, default 0).
  function get(formatId) {
    const id = formatId ?? State.activeFormatId;
    if (!id) return 0;
    const v = State.mosaicBlur[id];
    return (typeof v === 'number') ? v : 0;
  }

  // Convierte el valor normalizado a px de blur para una altura dada.
  // Lo usan el editor (altura en pantalla), VER TODAS y Export (altura real).
  function blurPxFor(height, formatId) {
    return get(formatId) * MAX_BLUR_FRAC * (height || 0);
  }

  // ── PRIVADAS ─────────────────────────────────────────────

  function _renderSlider() {
    const container = document.getElementById('bb-blur');
    if (!container) return;
    container.innerHTML = '';

    const fmt = (typeof Formats !== 'undefined') ? Formats.getActive() : null;
    if (!fmt) return;

    const wrap = document.createElement('div');
    wrap.className = 'bb-slider-wrap';

    const label = document.createElement('span');
    label.className = 'bb-slider-label';
    label.textContent = 'Desenfoque';

    const slider = document.createElement('input');
    slider.type  = 'range';
    slider.min   = 0;
    slider.max   = 100;
    slider.step  = 1;
    slider.value = Math.round(get(fmt.id) * 100);
    slider.className = 'bb-slider-control';

    const val = document.createElement('span');
    val.className = 'bb-slider-val';
    val.textContent = slider.value;

    slider.addEventListener('input', () => {
      const v = +slider.value;
      val.textContent = v;
      State.mosaicBlur[fmt.id] = v / 100;
      _applyToCanvas();
    });

    wrap.append(label, slider, val);
    container.appendChild(wrap);
  }

  function _applyToCanvas() {
    const canvas = document.querySelector('#lienzo .mosaic-canvas');
    if (!canvas) return;
    const px = blurPxFor(canvas.clientHeight || canvas.height || 0);
    canvas.style.filter = px > 0 ? `blur(${px}px)` : 'none';
  }

  return { init, update, get, blurPxFor };
})();
