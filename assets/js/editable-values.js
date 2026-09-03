// ============================================================
// EDITABLE-VALUES.JS — Cifras de los sliders editables a mano
//
// Cualquier número que acompaña a un slider (.bb-slider-val en los popovers,
// .transform-value en el panel Transformar / Vignette) se puede EDITAR pulsando
// sobre él: clic → escribes → Enter/clic fuera aplica; Esc cancela. Ajusta el
// slider asociado (clamp a min/max) y dispara 'input'/'change' para que el módulo
// correspondiente actualice el efecto. Funciona por DELEGACIÓN, así que vale
// también para los controles que se crean dinámicamente.
// ============================================================

const EditableValues = (() => {

  const VAL_SEL  = '.bb-slider-val, .transform-value';
  const WRAP_SEL = '.bb-slider-wrap, .transform-row';

  function init() {
    document.addEventListener('click', e => {
      const el = e.target.closest(VAL_SEL);
      if (!el || el.isContentEditable) return;
      const slider = _sliderFor(el);
      if (!slider) return;
      _edit(el, slider);
    });
  }

  function _sliderFor(el) {
    const wrap = el.closest(WRAP_SEL);
    return wrap ? wrap.querySelector('input[type=range]') : null;
  }

  function _edit(el, slider) {
    const original = slider.value;
    el.contentEditable = 'true';
    el.spellcheck = false;
    el.classList.add('editing');
    el.focus();
    // Selecciona todo el contenido para sobrescribir directamente.
    const range = document.createRange(); range.selectNodeContents(el);
    const sel = window.getSelection(); sel.removeAllRanges(); sel.addRange(range);

    let done = false;
    const finish = (apply) => {
      if (done) return; done = true;
      el.removeEventListener('keydown', onKey);
      el.removeEventListener('blur', onBlur);
      el.contentEditable = 'false';
      el.classList.remove('editing');
      if (!apply) { el.textContent = original; return; }
      let v = parseFloat(String(el.textContent || '').replace(',', '.').replace(/[^0-9.\-]/g, ''));
      if (!Number.isFinite(v)) v = parseFloat(original);
      const min = parseFloat(slider.min), max = parseFloat(slider.max);
      if (Number.isFinite(min)) v = Math.max(min, v);
      if (Number.isFinite(max)) v = Math.min(max, v);
      slider.value = v;                 // el navegador ajusta al step
      el.textContent = slider.value;
      slider.dispatchEvent(new Event('input',  { bubbles: true }));
      slider.dispatchEvent(new Event('change', { bubbles: true }));
    };
    const onKey = (ev) => {
      // No dejamos que Enter/Esc lleguen al popover (cerrar) ni al deseleccionar.
      if (ev.key === 'Enter') { ev.preventDefault(); ev.stopPropagation(); el.blur(); }
      else if (ev.key === 'Escape') { ev.preventDefault(); ev.stopPropagation(); finish(false); el.blur(); }
    };
    const onBlur = () => finish(true);
    el.addEventListener('keydown', onKey);
    el.addEventListener('blur', onBlur);
  }

  return { init };
})();
