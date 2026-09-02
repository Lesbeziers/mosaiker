// ============================================================
// STACKS-BORDER.JS — Bloque "BORDE" de la bottom-bar
//
// Controla el marco de las celdas: switch on/off, color y grosor. Por ahora el
// marco solo se dibuja en los mosaicos con celdas 'frame' (ZIG-ZAG / +SELLO);
// el bloque se muestra SIEMPRE (pensado para cuando se implementen bordes en
// todos los formatos). Estado por formato:
//   - visibilidad → State.stacksBorder[formatId]      (default true)
//   - grosor      → State.stacksBorderWidth[formatId] (default 3)
//   - color       → State.stacksBorderColor[formatId] (default #ffffff)
// El render lo aplican mosaic-3d.js (_addMesh) y export.js.
// ============================================================

const StacksBorder = (() => {

  const DEFAULT_WIDTH = 3;
  const DEFAULT_COLOR = '#ffffff';

  function init() { update(); }

  // Llamada al cambiar de formato o de mosaico.
  function update() {
    const container = document.getElementById('bb-stacks-border');
    if (!container) return;
    container.innerHTML = '';

    const fmt = (typeof Formats !== 'undefined') ? Formats.getActive() : null;
    if (!fmt) return;

    container.style.display = 'flex';
    container.style.alignItems = 'center';
    container.style.gap = '8px';

    // Switch (solo el track; el texto lo pone el título del popover "Borde").
    const sw = document.createElement('label');
    sw.className = 'switch';
    sw.dataset.tooltip = 'Mostrar / ocultar el borde de las celdas';
    const input = document.createElement('input');
    input.type = 'checkbox';
    input.checked = isVisible(fmt.id);
    input.addEventListener('change', () => {
      if (!State.stacksBorder) State.stacksBorder = {};
      State.stacksBorder[fmt.id] = input.checked;
      if (typeof Mosaic3D !== 'undefined') Mosaic3D.rebuild();
    });
    const track = document.createElement('span'); track.className = 'track';
    const knob  = document.createElement('span'); knob.className  = 'knob';
    track.appendChild(knob);
    sw.append(input, track);

    // Selector de color del borde (mismo estilo que el swatch de fondo).
    const swatch = document.createElement('input');
    swatch.type = 'color';
    swatch.className = 'bb-bg-swatch';
    swatch.value = color(fmt.id);
    swatch.dataset.tooltip = 'Color del borde';
    swatch.addEventListener('input', () => {
      if (!State.stacksBorderColor) State.stacksBorderColor = {};
      State.stacksBorderColor[fmt.id] = swatch.value;
      if (typeof Mosaic3D !== 'undefined') Mosaic3D.rebuild();
    });

    // Cajita de grosor.
    const wInput = document.createElement('input');
    wInput.type = 'number';
    wInput.min = '0'; wInput.max = '20'; wInput.step = '0.5';
    wInput.value = String(width(fmt.id));
    wInput.className = 'bb-border-width';
    wInput.dataset.tooltip = 'Grosor del borde (por defecto 3)';
    wInput.addEventListener('change', () => {
      let v = parseFloat(wInput.value);
      if (!Number.isFinite(v) || v < 0) v = DEFAULT_WIDTH;
      v = Math.min(20, v);
      wInput.value = String(v);
      if (!State.stacksBorderWidth) State.stacksBorderWidth = {};
      State.stacksBorderWidth[fmt.id] = v;
      if (typeof Mosaic3D !== 'undefined') Mosaic3D.rebuild();
    });

    container.append(sw, swatch, wInput);
  }

  // ¿Se muestra el borde en este formato? Default true.
  function isVisible(formatId) {
    const id = formatId ?? State.activeFormatId;
    const v = (State.stacksBorder) ? State.stacksBorder[id] : undefined;
    return v === undefined ? true : !!v;
  }

  // Grosor del borde en este formato. Default 3.
  function width(formatId) {
    const id = formatId ?? State.activeFormatId;
    const v = (State.stacksBorderWidth) ? State.stacksBorderWidth[id] : undefined;
    return (typeof v === 'number' && v >= 0) ? v : DEFAULT_WIDTH;
  }

  // Color del borde en este formato. Default blanco.
  function color(formatId) {
    const id = formatId ?? State.activeFormatId;
    const v = (State.stacksBorderColor) ? State.stacksBorderColor[id] : undefined;
    return v || DEFAULT_COLOR;
  }

  return { init, update, isVisible, width, color };
})();
