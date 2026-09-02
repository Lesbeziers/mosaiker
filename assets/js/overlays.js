// ============================================================
// OVERLAYS.JS — Switches condicionales y render de overlays
// (zona de seguridad, mockup, etc.) sobre el lienzo del formato.
//
// Cada formato declara su propio array de overlays:
//   overlays: [
//     { id, label, src, blend?, group?, defaultOn? }, ...
//   ]
//
// - Orden del array = orden de stacking visual (primero abajo, último arriba).
// - blend: CSS mix-blend-mode opcional ('screen', 'multiply', etc.).
// - group: si dos overlays comparten el mismo `group`, son mutuamente
//   exclusivos: encender uno apaga al hermano. Apagar uno NO enciende al otro.
// - defaultOn: por defecto los overlays arrancan encendidos. En un grupo,
//   sólo arranca encendido el que tenga `defaultOn: true`.
// ============================================================

const Overlays = (() => {

  function init() {
    update();
  }

  function update() {
    const fmt = Formats.getActive();
    _renderSwitches(fmt);
    _renderOverlays(fmt);
  }

  // ── PRIVADAS ──────────────────────────────────────────────

  function _renderSwitches(fmt) {
    const bar       = document.getElementById('bottombar');
    const container = document.getElementById('bb-overlays');
    if (!bar || !container) return;
    container.innerHTML = '';

    // La bottom-bar está visible siempre que haya un formato activo
    // (porque MosaicOpacity siempre necesita su slider). Sólo se oculta
    // si no hay formato seleccionado.
    bar.style.display = fmt ? 'flex' : 'none';

    const list = fmt?.overlays || [];
    list.forEach(ov => container.appendChild(_createSwitch(ov, fmt)));
  }

  function _createSwitch(overlay, fmt) {
    const lbl = document.createElement('label');
    lbl.className = 'switch';
    lbl.dataset.tooltip = `Mostrar ${overlay.label.toLowerCase()}`;

    const input = document.createElement('input');
    input.type = 'checkbox';
    input.checked = _isOn(overlay);
    input.addEventListener('change', () => {
      if (input.checked && overlay.group) {
        // Encender uno del grupo apaga al resto
        fmt.overlays
          .filter(o => o.group === overlay.group && o.id !== overlay.id)
          .forEach(sib => { State.overlays[sib.id] = false; });
      }
      State.overlays[overlay.id] = input.checked;
      update(); // re-renderiza para sincronizar checkboxes hermanos
    });

    const track = document.createElement('span');
    track.className = 'track';
    const knob = document.createElement('span');
    knob.className = 'knob';
    track.appendChild(knob);

    // El texto solo se muestra si el formato tiene 2+ overlays (para distinguir,
    // p.ej. Mockup vs Zona de seguridad). Con uno solo, el título "Guías" basta.
    if ((fmt?.overlays?.length || 0) > 1) {
      const text = document.createElement('span');
      text.textContent = overlay.label;
      lbl.append(input, track, text);
    } else {
      lbl.append(input, track);
    }
    return lbl;
  }

  function _renderOverlays(fmt) {
    const lienzo = document.getElementById('lienzo');
    if (!lienzo) return;

    lienzo.querySelectorAll('.lienzo-overlay').forEach(el => el.remove());

    const list = fmt?.overlays || [];
    list.forEach(ov => {
      if (!_isOn(ov)) return;
      const img = document.createElement('img');
      img.className = 'lienzo-overlay';
      img.src = ov.src;
      img.alt = ov.label;
      if (ov.blend) img.style.mixBlendMode = ov.blend;
      lienzo.appendChild(img);
    });
  }

  // Devuelve el estado on/off resuelto para un overlay:
  //   - si el usuario lo ha tocado explícitamente, se respeta su valor
  //   - si no:
  //       · sin grupo  → on por defecto
  //       · con grupo  → on sólo si defaultOn === true
  function _isOn(overlay) {
    const explicit = State.overlays[overlay.id];
    if (explicit !== undefined) return explicit;
    if (overlay.group) return overlay.defaultOn === true;
    return true;
  }

  return { init, update };
})();
