// ============================================================
// BACKGROUND.JS — Color de fondo del lienzo por formato
//
// Vive en la bottom-bar junto a Opacidad, Desenfoque y overlays.
// Muestra la etiqueta "FONDO" + un cuadradito (<input type="color">)
// con el color actual; al pulsarlo se abre el selector del sistema.
// El valor se guarda por formato en State.backgrounds[id] (hex).
// Se aplica al fondo del #lienzo en vivo; VER TODAS y Export lo respetan.
// ============================================================

const Background = (() => {

  const DEFAULT = '#0e0e0e';

  function init() {
    update();
  }

  // Llamada al cambiar de formato (desde Formats.setActive)
  function update() {
    _render();
    _applyToLienzo();
  }

  // Devuelve el color de fondo del formato dado (o el activo). Hex.
  function get(formatId) {
    const id = formatId ?? State.activeFormatId;
    if (!id) return DEFAULT;
    return State.backgrounds[id] || DEFAULT;
  }

  // ── PRIVADAS ─────────────────────────────────────────────

  function _render() {
    const container = document.getElementById('bb-background');
    if (!container) return;
    container.innerHTML = '';

    const fmt = (typeof Formats !== 'undefined') ? Formats.getActive() : null;
    if (!fmt) return;

    const wrap = document.createElement('div');
    wrap.className = 'bb-bg-wrap';

    const label = document.createElement('span');
    label.className = 'bb-slider-label';
    label.textContent = 'Fondo';

    const swatch = document.createElement('input');
    swatch.type = 'color';
    swatch.className = 'bb-bg-swatch';
    swatch.value = get(fmt.id);
    swatch.dataset.tooltip = 'Color de fondo del formato';

    swatch.addEventListener('input', () => {
      State.backgrounds[fmt.id] = swatch.value;
      _applyToLienzo();
    });

    wrap.append(label, swatch);
    container.appendChild(wrap);
  }

  function _applyToLienzo() {
    const lienzo = document.getElementById('lienzo');
    if (lienzo) lienzo.style.background = get();
  }

  return { init, update, get };
})();
