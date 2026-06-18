// ============================================================
// STACKS-BORDER.JS — Switch "Borde blanco" en la bottom-bar
//
// Solo aparece cuando el mosaico activo es ZIG-ZAG (`horizontal`) o
// ZIG-ZAG + SELLO (`horizontal-sello`), que son los que tienen celdas
// con marco blanco. Permite mostrar/ocultar ese marco.
//
// Estado por formato en State.stacksBorder[formatId] (default true =
// mostrar). El render del marco lo gatea mosaic-3d.js (_addMesh) y
// export.js; aquí solo está la UI + el estado.
// ============================================================

const StacksBorder = (() => {

  const STACKS_IDS = ['horizontal', 'horizontal-sello'];

  function init() { update(); }

  // Llamada al cambiar de formato o de mosaico.
  function update() {
    const container = document.getElementById('bb-stacks-border');
    if (!container) return;
    container.innerHTML = '';

    // Solo en los mosaicos con marco blanco.
    if (!STACKS_IDS.includes(State.activeSkeletonId)) return;
    const fmt = (typeof Formats !== 'undefined') ? Formats.getActive() : null;
    if (!fmt) return;

    const lbl = document.createElement('label');
    lbl.className = 'switch';
    lbl.dataset.tooltip = 'Mostrar / ocultar el marco blanco de las celdas';

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

    const text = document.createElement('span');
    text.textContent = 'Borde blanco';

    lbl.append(input, track, text);
    container.appendChild(lbl);
  }

  // ¿Se muestra el marco blanco en este formato? Default true.
  function isVisible(formatId) {
    const id = formatId ?? State.activeFormatId;
    const v = (State.stacksBorder) ? State.stacksBorder[id] : undefined;
    return v === undefined ? true : !!v;
  }

  return { init, update, isVisible };
})();
