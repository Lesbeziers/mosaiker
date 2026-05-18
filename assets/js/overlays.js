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
    const bar = document.getElementById('bottombar');
    if (!bar) return;
    bar.innerHTML = '';

    const list = fmt?.overlays || [];
    if (list.length === 0) {
      bar.style.display = 'none';
      return;
    }

    bar.style.display = 'flex';
    list.forEach(ov => bar.appendChild(_createSwitch(ov, fmt)));
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

    const text = document.createElement('span');
    text.textContent = overlay.label;

    lbl.append(input, track, text);
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
