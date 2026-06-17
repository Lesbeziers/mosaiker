// ============================================================
// EXPORT.JS — Exporta los formatos marcados OK como JPG dentro de un ZIP
//
// - Render offscreen Three.js a la RESOLUCIÓN REAL de cada formato.
// - Texturas full-res leídas directamente desde el File original
//   (no la versión downscaled del editor).
// - Composita la viñeta del formato si está activa.
// - JPG calidad 1.0 (máxima).
// - Nombres URL-friendly: lowercase, sin acentos, guiones medios.
// ============================================================

const Export = (() => {

  // Mismas constantes geométricas que mosaic-3d.js para mantener el
  // mismo look entre editor y export.
  const CELL_H  = 1.0;
  // Fuente única de verdad de proporciones: verticales 9:16, horizontales 16:9.
  const VERT_W  = CELL_H * 1200 / 1800;  // 0.667 — carátula vertical 2:3 (1200×1800)
  const HORIZ_W = CELL_H * 16 / 9;   // 1.7778 — carátula horizontal 16:9 pura

  // Claves de contenedor (orden de render) para aplicar el ajuste de encuadre
  // igual que el editor. Se resetean al construir la geometría de cada formato.
  let _exSlotIndex  = 0;
  let _exSkeletonId = '?';
  let _exComp       = null;   // composición del formato que se está exportando
  let _exFormatId   = '?';
  let _exFormatH    = 1;       // alto en px del formato (para marcos a 3px)
  let _exSelloBitmap = null;   // bitmap del sello (mosaicos 'stacks')

  function init() {
    document.getElementById('btn-exportar')?.addEventListener('click', _showModal);
  }

  // ── MODAL ─────────────────────────────────────────────────

  function _showModal() {
    const okIds = Object.keys(State.formatsOk).filter(id => State.formatsOk[id]);
    if (okIds.length === 0) {
      alert('No hay formatos marcados con OK para exportar.');
      return;
    }

    document.getElementById('export-modal')?.remove();

    const overlay = document.createElement('div');
    overlay.id = 'export-modal';
    overlay.className = 'modal-overlay';
    overlay.addEventListener('click', e => { if (e.target === overlay) overlay.remove(); });

    const modal  = document.createElement('div');
    modal.className = 'modal';
    modal.style.width = '460px';

    const header = document.createElement('div');
    header.className = 'modal-header';
    header.textContent = 'Exportar mosaicos';

    const body = document.createElement('div');
    body.className = 'modal-body';

    const desc = document.createElement('p');
    desc.className = 'modal-desc';
    desc.textContent = `Se exportarán ${okIds.length} formato${okIds.length > 1 ? 's' : ''} en un ZIP. Introduce el nombre común del contenido:`;

    const nameLabel = document.createElement('label');
    nameLabel.className = 'modal-label';
    nameLabel.textContent = 'Nombre del contenido';

    const nameInput = document.createElement('input');
    nameInput.type = 'text';
    nameInput.className = 'modal-input';
    nameInput.placeholder = 'ej: el nombre de la rosa';
    nameInput.value = State.projectName && State.projectName !== 'Sin título'
      ? State.projectName : '';

    const slugPreview = document.createElement('div');
    slugPreview.style.cssText = 'font-family:var(--font);font-size:10px;color:var(--col-yellow);margin-top:-4px;';
    slugPreview.textContent = '→ ' + (_slug(nameInput.value) || 'sin-nombre');

    // Lista de archivos resultantes
    const listLabel = document.createElement('div');
    listLabel.className = 'modal-label';
    listLabel.style.marginTop = '4px';
    listLabel.textContent = 'Archivos resultantes';

    const list = document.createElement('div');
    list.style.cssText = `
      background:#0e0e0e;border:1px solid #222;border-radius:2px;
      padding:8px 10px;max-height:160px;overflow-y:auto;
      display:flex;flex-direction:column;gap:3px;
    `;

    const renderList = () => {
      list.innerHTML = '';
      const base = _slug(nameInput.value) || 'sin-nombre';
      okIds.forEach(id => {
        const fmt = Formats.getById(id);
        if (!fmt) return;
        const row = document.createElement('div');
        row.style.cssText = 'display:flex;justify-content:space-between;align-items:center;gap:8px;';
        const nameEl = document.createElement('span');
        nameEl.style.cssText = 'font-family:var(--font);font-size:10px;color:#888;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;';
        nameEl.textContent = `${base}-${_slug(fmt.name)}.jpg`;
        const sizeEl = document.createElement('span');
        sizeEl.style.cssText = 'font-family:var(--font);font-size:10px;color:#444;flex-shrink:0;';
        sizeEl.textContent = `${fmt.width}×${fmt.height}`;
        row.appendChild(nameEl);
        row.appendChild(sizeEl);
        list.appendChild(row);
      });
    };
    renderList();

    nameInput.addEventListener('input', () => {
      slugPreview.textContent = '→ ' + (_slug(nameInput.value) || 'sin-nombre');
      renderList();
    });

    const btnRow = document.createElement('div');
    btnRow.style.cssText = 'display:flex;justify-content:flex-end;gap:8px;margin-top:8px;';

    const btnCancel = document.createElement('button');
    btnCancel.className = 'modal-cancel';
    btnCancel.textContent = 'Cancelar';
    btnCancel.style.alignSelf = 'auto';
    btnCancel.addEventListener('click', () => overlay.remove());

    const btnExport = document.createElement('button');
    btnExport.textContent = 'Exportar';
    btnExport.style.cssText = `
      height:28px;padding:0 20px;border-radius:2px;
      font-family:var(--font);font-size:10px;font-weight:700;
      letter-spacing:0.08em;text-transform:uppercase;cursor:pointer;
      background:var(--col-yellow);border:1px solid var(--col-yellow);color:#000;
      transition:opacity 0.15s;
    `;
    btnExport.addEventListener('mouseenter', () => btnExport.style.opacity = '0.85');
    btnExport.addEventListener('mouseleave', () => btnExport.style.opacity = '1');
    btnExport.addEventListener('click', async () => {
      const base = _slug(nameInput.value) || 'sin-nombre';
      overlay.remove();
      await _doExport(base, okIds);
    });

    nameInput.addEventListener('keydown', e => {
      if (e.key === 'Enter')  btnExport.click();
      if (e.key === 'Escape') overlay.remove();
    });

    btnRow.appendChild(btnCancel);
    btnRow.appendChild(btnExport);
    body.appendChild(desc);
    body.appendChild(nameLabel);
    body.appendChild(nameInput);
    body.appendChild(slugPreview);
    body.appendChild(listLabel);
    body.appendChild(list);
    body.appendChild(btnRow);
    modal.appendChild(header);
    modal.appendChild(body);
    overlay.appendChild(modal);
    document.body.appendChild(overlay);

    setTimeout(() => { nameInput.focus(); nameInput.select(); }, 50);
  }

  // ── EXPORT PIPELINE ───────────────────────────────────────

  async function _doExport(baseName, okIds) {
    if (typeof JSZip === 'undefined') {
      alert('JSZip no está cargado.');
      return;
    }
    const THREE = (typeof Mosaic3D !== 'undefined') ? Mosaic3D.getTHREE() : null;
    if (!THREE) {
      alert('Three.js no está cargado todavía. Inténtalo de nuevo en unos segundos.');
      return;
    }
    const progress = _showProgress(okIds.length + 1); // +1 por la pre-carga
    progress.update(0, 'Decodificando imágenes a resolución completa…');

    // Pre-carga las imágenes originales a resolución completa una sola vez,
    // las reutilizamos en todos los formatos del ZIP.
    // Usamos un <img> intermedio (mismo patrón que el editor) porque
    // createImageBitmap(file) directamente falla en algunos navegadores con
    // ciertos WEBPs / perfiles de color, mientras que decodificar primero
    // con <img> es completamente robusto.
    const fullBitmaps = {};
    const numbers = (typeof Images !== 'undefined') ? Images.getLoadedNumbers() : [];
    // Imágenes vinculadas por contenedor, con clave (formatId::slotKey) de TODAS
    // las composiciones (cada formato puede tener las suyas).
    const boundKeys = [];
    Object.entries(State.compositions || {}).forEach(([fid, c]) => {
      Object.keys(c.containerImages || {}).forEach(k => boundKeys.push(fid + '::' + k));
    });
    for (const k of [...numbers, ...boundKeys]) {
      const file = Images.getOriginalFile(k);
      if (!file) continue;
      try {
        fullBitmaps[k] = await _decodeFullRes(file);
      } catch (err) {
        console.warn(`[Mosaiker] No se pudo decodificar imagen ${k} (${file.name}):`, err);
      }
    }
    // Sello (banda central de los mosaicos 'stacks'), si lo hay.
    _exSelloBitmap = null;
    if (typeof Images !== 'undefined' && Images.hasSello && Images.hasSello()) {
      const sf = Images.getSelloFile && Images.getSelloFile();
      if (sf) { try { _exSelloBitmap = await _decodeFullRes(sf); } catch (e) { console.warn('[Mosaiker] No se pudo decodificar el sello:', e); } }
    }

    const zip = new JSZip();
    let exported = 0;
    const warnings = [];

    for (let i = 0; i < okIds.length; i++) {
      const id  = okIds[i];
      const fmt = Formats.getById(id);
      if (!fmt) continue;

      progress.update(i + 1, fmt.name);

      try {
        const blob = await _renderFormat(THREE, fmt, fullBitmaps);
        if (!blob) continue;
        const filename = `${baseName}-${_slug(fmt.name)}.jpg`;
        zip.file(filename, await blob.arrayBuffer());
        exported++;
      } catch (err) {
        console.error(`[Mosaiker] Error exportando ${fmt.name}:`, err);
        warnings.push(`${fmt.name}: ${err.message || err}`);
      }
    }

    // Liberar bitmaps (siempre, aunque fallen algunos formatos)
    Object.values(fullBitmaps).forEach(b => b.close && b.close());

    progress.update(okIds.length + 1, 'Empaquetando ZIP…');
    const zipBlob = await zip.generateAsync({
      type: 'blob', compression: 'DEFLATE',
      compressionOptions: { level: 6 },
    });
    progress.close();

    if (exported === 0) {
      alert('No se exportó ningún formato.\n' + warnings.join('\n'));
      return;
    }

    _download(zipBlob, `${baseName}.zip`);

    if (warnings.length > 0) {
      setTimeout(() => alert('Export completado con avisos:\n\n' + warnings.join('\n')), 300);
    }
  }

  // ── RENDER DE UN FORMATO ──────────────────────────────────

  async function _renderFormat(THREE, format, fullBitmaps) {
    const W = format.width;
    const H = format.height;
    // Composición de ESTE formato: su mosaico, transform, encuadre y sustituciones.
    const comp = (State.compositions && State.compositions[format.id]) || null;
    const esq  = (comp && comp.skeletonId && typeof Skeletons !== 'undefined')
      ? Skeletons.getById(comp.skeletonId) : null;
    const p    = (comp && comp.transform) || State.transform || {};
    _exComp     = comp;        // usado por _addMesh / _coverUVAdjusted
    _exFormatId = format.id;

    // Renderer offscreen a resolución real del formato
    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha:     true,
      preserveDrawingBuffer: true,
    });
    renderer.setPixelRatio(1);            // queremos los píxeles EXACTOS del formato
    renderer.setSize(W, H, false);
    renderer.setClearColor(0x000000, 0);  // transparente; pintamos fondo en el canvas 2D

    const scene  = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(45, W / H, 0.1, 100);
    camera.position.set(p.camX ?? 0, p.camY ?? 0, p.camZ ?? 10);

    const pivot = new THREE.Group();
    pivot.rotation.x = -THREE.MathUtils.degToRad(p.rotX ?? 0);
    pivot.rotation.y =  THREE.MathUtils.degToRad(p.rotY ?? 0);
    scene.add(pivot);

    // Crea texturas full-res a partir de los bitmaps pre-cargados.
    // Cache por `n_ratio` para que los placeholders muestren el ratio
    // correcto (horizontal vs vertical) si el hueco no tiene imagen.
    const textureCache = {};
    const anisotropy   = renderer.capabilities.getMaxAnisotropy();
    const getTexture = (slot) => {
      const key = `${slot.n}_${slot.ratio}`;
      if (textureCache[key]) return textureCache[key];
      const bitmap = fullBitmaps[slot.n];
      let tex;
      if (bitmap) {
        tex = new THREE.Texture(bitmap);
        tex.colorSpace = THREE.SRGBColorSpace;
      } else {
        // Sin imagen para este prefijo: mismo placeholder etiquetado que
        // el editor (caja oscura + "img_NN" + ratio) para que el cliente
        // identifique al instante qué prefijos faltan en el JPG exportado.
        tex = _makePlaceholderTexture(THREE, slot.ratio === 'H', slot.n);
      }
      // Marca si es una imagen real (para aplicar "cover") o un placeholder.
      tex.userData = { real: !!bitmap };
      tex.minFilter       = THREE.LinearMipMapLinearFilter;
      tex.magFilter       = THREE.LinearFilter;
      tex.generateMipmaps = true;
      tex.anisotropy      = anisotropy;
      tex.needsUpdate     = true;
      textureCache[key] = tex;
      return tex;
    };

    // Construye geometría. Resetea las claves de contenedor (orden de render)
    // para aplicar el mismo ajuste de encuadre que el editor. Si el formato no
    // tiene mosaico, se exporta solo el fondo.
    _exSlotIndex = 0;
    _exSkeletonId = esq ? esq.id : '?';
    _exFormatH = H;
    if (esq) {
      if (esq.type === 'grid')    _buildGrid   (THREE, pivot, esq, p, getTexture);
      if (esq.type === 'columns') _buildColumns(THREE, pivot, esq, p, getTexture);
      if (esq.type === 'rows')    _buildRows   (THREE, pivot, esq, p, getTexture);
      if (esq.type === 'vcolumns')_buildVColumns(THREE, pivot, esq, p, getTexture);
      if (esq.type === 'free')    _buildFree   (THREE, pivot, esq, p, getTexture);
      if (esq.type === 'stacks')  _buildStacks (THREE, pivot, esq, p, getTexture);
    }

    // Render
    renderer.render(scene, camera);

    // Pasamos el render WebGL a un canvas 2D para componer la viñeta
    const out = document.createElement('canvas');
    out.width  = W;
    out.height = H;
    const ctx  = out.getContext('2d');

    // Fondo del lienzo (color elegido por formato; default #0e0e0e)
    ctx.fillStyle = (typeof Background !== 'undefined') ? Background.get(format.id) : '#0e0e0e';
    ctx.fillRect(0, 0, W, H);

    // Imagen de fondo del formato (cover), por detrás del mosaico
    if (typeof Background !== 'undefined' && Background.hasImage && Background.hasImage(format.id)) {
      const bgUrl = Background.getImageUrl(format.id);
      if (bgUrl) {
        const bgImg = await _loadImage(bgUrl);
        if (bgImg) _drawCover(ctx, bgImg, W, H);
      }
    }

    // Composita el mosaico respetando su opacidad y desenfoque por formato.
    // El blur se escala a la altura real del formato (px proporcionales).
    const mosOp = (State.mosaicOpacity && typeof State.mosaicOpacity[format.id] === 'number')
      ? State.mosaicOpacity[format.id] : 1;
    const blurPx = (typeof MosaicBlur !== 'undefined') ? MosaicBlur.blurPxFor(H, format.id) : 0;
    ctx.globalAlpha = mosOp;
    ctx.filter = blurPx > 0 ? `blur(${blurPx}px)` : 'none';
    ctx.drawImage(renderer.domElement, 0, 0);
    ctx.filter = 'none';
    ctx.globalAlpha = 1;

    // Viñeta (si el formato la tiene activa)
    const vig = State.vignettes?.[format.id];
    if (vig && vig.type) {
      const vigSrc = _findVignetteSrc(format, vig.type);
      if (vigSrc) {
        const vigImg = await _loadImage(vigSrc);
        if (vigImg) {
          ctx.globalAlpha = (vig.opacity != null) ? vig.opacity : 1;
          ctx.drawImage(vigImg, 0, 0, W, H);
          ctx.globalAlpha = 1;
        }
      }
    }

    // Convierte a JPG a máxima calidad
    const blob = await new Promise(res => out.toBlob(res, 'image/jpeg', 1.0));

    // Limpieza
    Object.values(textureCache).forEach(tex => tex.dispose());
    pivot.traverse(obj => {
      if (obj.geometry) obj.geometry.dispose();
      if (obj.material) obj.material.dispose();
    });
    renderer.dispose();

    return blob;
  }

  // ── GEOMETRÍA (porteada de mosaic-3d.js) ──────────────────

  function _buildGrid(THREE, pivot, esq, p, getTexture) {
    const { cols, rows, slots } = esq;
    const gap = (p.gap ?? 8) * 0.01;

    const colWidths = [];
    for (let c = 0; c < cols; c++) {
      const slot = slots[c];
      colWidths.push(slot && slot.ratio === 'H' ? HORIZ_W : VERT_W);
    }
    const rowW   = colWidths.reduce((a, b) => a + b, 0) + gap * (cols - 1);
    const totalH = rows * CELL_H + (rows - 1) * gap;
    const startX = -rowW  / 2;
    const startY =  totalH / 2 - CELL_H / 2;

    for (let row = 0; row < rows; row++) {
      let xCursor = startX;
      const y = startY - row * (CELL_H + gap);
      for (let col = 0; col < cols; col++) {
        const slot = slots[row * cols + col];
        if (!slot) continue;
        const cw = colWidths[col];
        _addMesh(THREE, pivot, slot, xCursor, y, cw, CELL_H, p, getTexture);
        xCursor += cw + gap;
      }
    }
  }

  function _buildColumns(THREE, pivot, esq, p, getTexture) {
    const gap   = (p.gap ?? 8) * 0.01;
    const V_H   = CELL_H;
    const colW  = VERT_W * 2 + gap;
    const H_H   = colW * 9 / 16;   // alto horizontal 16:9 (ancho = colW)
    const numCols = esq.cols.length;
    const totalW  = numCols * colW + (numCols - 1) * gap;
    const startX  = -totalW / 2;

    const stateOffsets = p?.colOffsets;
    const offsets = (Array.isArray(stateOffsets) && stateOffsets.length === numCols)
      ? stateOffsets
      : (esq.defaultOffsets || new Array(numCols).fill(0));

    esq.cols.forEach((col, ci) => {
      const xCol = startX + ci * (colW + gap);

      let colH = 0;
      let i = 0;
      while (i < col.cells.length) {
        const cell = col.cells[i];
        if (cell.type === 'h') { colH += H_H; i++; }
        else                   { colH += V_H; i += 2; }
        if (i < col.cells.length) colH += gap;
      }

      let cursorY = colH / 2 + (offsets[ci] || 0);
      i = 0;
      while (i < col.cells.length) {
        const cell = col.cells[i];
        if (cell.type === 'h') {
          const centerY = cursorY - H_H / 2;
          _addMesh(THREE, pivot,
            { n: cell.n, ratio: 'H', opacity: cell.opacity ?? 1 },
            xCol, centerY, colW, H_H, p, getTexture);
          cursorY -= H_H + gap;
          i++;
        } else {
          const cellR   = col.cells[i + 1];
          const centerY = cursorY - V_H / 2;
          _addMesh(THREE, pivot,
            { n: cell.n, ratio: 'V', opacity: cell.opacity ?? 1 },
            xCol, centerY, VERT_W, V_H, p, getTexture);
          if (cellR) {
            _addMesh(THREE, pivot,
              { n: cellR.n, ratio: 'V', opacity: cellR.opacity ?? 1 },
              xCol + VERT_W + gap, centerY, VERT_W, V_H, p, getTexture);
          }
          cursorY -= V_H + gap;
          i += 2;
        }
      }
    });
  }

  function _buildRows(THREE, pivot, esq, p, getTexture) {
    const gap     = (p.gap ?? 8) * 0.01;
    const cellW   = HORIZ_W;
    const cellH   = HORIZ_W * 9 / 16;
    const numRows = esq.rows.length;
    const totalH  = numRows * cellH + (numRows - 1) * gap;
    const startY  = totalH / 2 - cellH / 2;

    const stateOffsets = p?.colOffsets;
    const offsets = (Array.isArray(stateOffsets) && stateOffsets.length === numRows)
      ? stateOffsets
      : (esq.defaultOffsets || new Array(numRows).fill(0));

    esq.rows.forEach((row, ri) => {
      const n = row.cells.length;
      const rowW = n * cellW + (n - 1) * gap;
      const y = startY - ri * (cellH + gap);
      let x = -rowW / 2 + (offsets[ri] || 0);
      row.cells.forEach(cell => {
        _addMesh(THREE, pivot,
          { n: cell.n, ratio: 'H', opacity: cell.opacity ?? 1 },
          x, y, cellW, cellH, p, getTexture);
        x += cellW + gap;
      });
    });
  }

  function _buildVColumns(THREE, pivot, esq, p, getTexture) {
    const gap     = (p.gap ?? 8) * 0.01;
    const cellW   = VERT_W;   // 2:3 (1200×1800), misma fuente que el resto
    const numCols = esq.cols.length;
    const totalW  = numCols * cellW + (numCols - 1) * gap;
    const startX  = -totalW / 2;

    const stateOffsets = p?.colOffsets;
    const offsets = (Array.isArray(stateOffsets) && stateOffsets.length === numCols)
      ? stateOffsets
      : (esq.defaultOffsets || new Array(numCols).fill(0));

    esq.cols.forEach((col, ci) => {
      const xCol = startX + ci * (cellW + gap);
      const nCells = col.cells.length;
      const colH = nCells * CELL_H + (nCells - 1) * gap;
      let cursorY = colH / 2 + (offsets[ci] || 0);
      col.cells.forEach(cell => {
        const centerY = cursorY - CELL_H / 2;
        _addMesh(THREE, pivot,
          { n: cell.n, ratio: 'V', opacity: cell.opacity ?? 1 },
          xCol, centerY, cellW, CELL_H, p, getTexture);
        cursorY -= CELL_H + gap;
      });
    });
  }

  function _buildFree(THREE, pivot, esq, p, getTexture) {
    const gap  = (p.gap ?? 8) * 0.01;
    const unit = CELL_H;
    let maxX = 0, maxY = 0;
    esq.cells.forEach(c => { maxX = Math.max(maxX, c.x + c.w); maxY = Math.max(maxY, c.y + c.h); });
    const totalW = maxX * unit, totalH = maxY * unit;
    const offX = -totalW / 2, topY = totalH / 2;
    esq.cells.forEach(c => {
      const w = c.w * unit - gap;
      const h = c.h * unit - gap;
      const left = offX + c.x * unit + gap / 2;
      const top  = topY - c.y * unit - gap / 2;
      _addMesh(THREE, pivot,
        { n: c.n, ratio: c.r, opacity: 1 },
        left, top - h / 2, w, h, p, getTexture);
    });
  }

  // Layout 'stacks' (ZIG-ZAG / ZIG-ZAG+SELLO): columnas de 1 vertical de ancho,
  // escalonado fijo por columna y banda central opcional con el sello repetido.
  // Portado de mosaic-3d.js para que la exportación no salga en negro.
  function _buildStacks(THREE, pivot, esq, p, getTexture) {
    const gap       = (p.gap ?? 8) * 0.01;
    const step      = CELL_H + gap;
    const bandAfter = esq.band ? esq.band.after : -1;
    const bandW     = (esq.band && esq.band.width) || VERT_W;

    const cells = [];
    let cursor = 0, maxX = 0, topMost = -Infinity, bottomMost = Infinity, laneX = null;
    esq.cols.forEach((col, ci) => {
      const drop = col.drop || 0;
      let top = -drop * step;
      col.cells.forEach(c => {
        const cy = top - CELL_H / 2;
        cells.push({ x: cursor, cy, n: c.n, opacity: c.opacity ?? 1 });
        if (cursor + VERT_W > maxX) maxX = cursor + VERT_W;
        if (top > topMost) topMost = top;
        if (cy - CELL_H / 2 < bottomMost) bottomMost = cy - CELL_H / 2;
        top -= step;
      });
      cursor += VERT_W + gap;
      if (ci === bandAfter) { laneX = cursor; cursor += bandW + gap; }
    });

    const offsetX = -maxX / 2;
    const offsetY = -(topMost + bottomMost) / 2;

    cells.forEach(c => {
      _addMesh(THREE, pivot,
        { n: c.n, ratio: 'V', opacity: c.opacity, frame: c.opacity >= 0.99 },
        c.x + offsetX, c.cy + offsetY, VERT_W, CELL_H, p, getTexture);
    });

    if (esq.band && laneX !== null) {
      _addSelloLane(THREE, pivot, laneX + offsetX, bandW,
        topMost + offsetY, bottomMost + offsetY, esq.band.opacity ?? 0.2, gap);
    }
  }

  function _addSelloLane(THREE, pivot, xLeft, laneW, top, bottom, dimOpacity, gap) {
    let tex, aspect;
    if (_exSelloBitmap) {
      tex = new THREE.Texture(_exSelloBitmap);
      tex.colorSpace = THREE.SRGBColorSpace;
      tex.needsUpdate = true;
      aspect = (_exSelloBitmap.width || 1) / (_exSelloBitmap.height || 1);
    } else {
      tex = _selloPlaceholderTex(THREE);
      aspect = 1;
    }
    const selloH = laneW / aspect;
    if (!(selloH > 0)) return;
    const centerY = (top + bottom) / 2;
    const bandHalf = (top - bottom) / 2;
    const pitch = selloH + (gap || 0);
    _addSelloMesh(THREE, pivot, xLeft, centerY, laneW, selloH, tex, 1.0);
    for (let k = 1; k <= 200; k++) {
      const off = k * pitch;
      if (off - selloH / 2 >= bandHalf) break;
      _addSelloMesh(THREE, pivot, xLeft, centerY + off, laneW, selloH, tex, dimOpacity);
      _addSelloMesh(THREE, pivot, xLeft, centerY - off, laneW, selloH, tex, dimOpacity);
    }
  }

  function _addSelloMesh(THREE, pivot, xLeft, centerY, w, h, tex, opacity) {
    const geo = _makeRoundedRect(THREE, w, h, 0, null);
    const mat = new THREE.MeshBasicMaterial({ map: tex, side: THREE.FrontSide, transparent: true, opacity });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(xLeft + w / 2, centerY, 0);
    pivot.add(mesh);
  }

  function _selloPlaceholderTex(THREE) {
    const s = 256;
    const c = document.createElement('canvas');
    c.width = s; c.height = s;
    const cx = c.getContext('2d');
    cx.fillStyle = '#1a1a1a'; cx.fillRect(0, 0, s, s);
    cx.strokeStyle = '#444'; cx.lineWidth = 4; cx.strokeRect(3, 3, s - 6, s - 6);
    cx.fillStyle = '#f0a500';
    cx.font = `bold ${Math.round(s * 0.16)}px sans-serif`;
    cx.textAlign = 'center'; cx.textBaseline = 'middle';
    cx.fillText('SELLO', s / 2, s / 2);
    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  }

  // Grosor en mundo que equivale a `px` píxeles a la resolución del formato.
  function _exBorderWorld(px, p) {
    const visH = 2 * (p.camZ ?? 10) * Math.tan((45 * Math.PI / 180) / 2);
    return (px / Math.max(1, _exFormatH)) * visH;
  }

  function _addMesh(THREE, pivot, slot, x, centerY, w, h, p, getTexture) {
    const key = _exSkeletonId + ':' + _exSlotIndex;
    _exSlotIndex++;
    const r   = ((p.radius ?? 12) / 1000) * CELL_H;
    // Imagen efectiva: vinculada al ÍNDICE de imagen (formatId::n) o índice del
    // esqueleto. Coincide con el editor (sustitución por imagen, no por hueco).
    const bound  = (_exComp && _exComp.containerImages && _exComp.containerImages[slot.n]);
    const imgKey = bound ? (_exFormatId + '::' + slot.n) : slot.n;
    const tex = getTexture({ n: imgKey, ratio: slot.ratio });
    // "Cover" + ajuste de encuadre por contenedor (igual que el editor). Sólo
    // en imágenes reales; los placeholders mantienen mapeo completo.
    let coverUV = null;
    if (tex.userData && tex.userData.real && tex.image) {
      const iw = tex.image.width  || tex.image.naturalWidth;
      const ih = tex.image.height || tex.image.naturalHeight;
      if (iw && ih) coverUV = _coverUVAdjusted(w / h, iw / ih, key);
    }
    // Marco blanco (3 pt) detrás de las celdas marcadas frame (stacks a 100%).
    if (slot.frame) {
      const b    = _exBorderWorld(3, p);
      const wGeo = _makeRoundedRect(THREE, w + 2 * b, h + 2 * b, r + b, null);
      const wMat = new THREE.MeshBasicMaterial({ color: 0xffffff, side: THREE.FrontSide, transparent: true, opacity: 1 });
      const wMesh = new THREE.Mesh(wGeo, wMat);
      wMesh.position.set(x + w / 2, centerY, -0.002);
      pivot.add(wMesh);
    }
    const geo = _makeRoundedRect(THREE, w, h, r, coverUV);
    const mat = new THREE.MeshBasicMaterial({
      map:         tex,
      side:        THREE.FrontSide,
      transparent: true,
      opacity:     slot.opacity ?? 1,
    });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(x + w / 2, centerY, 0);
    pivot.add(mesh);
  }

  function _makeRoundedRect(THREE, w, h, r, coverUV) {
    r = Math.min(r, w / 2, h / 2);
    const shape = new THREE.Shape();
    const x = -w / 2, y = -h / 2;
    shape.moveTo(x + r, y);
    shape.lineTo(x + w - r, y);
    shape.quadraticCurveTo(x + w, y,     x + w, y + r);
    shape.lineTo(x + w, y + h - r);
    shape.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    shape.lineTo(x + r, y + h);
    shape.quadraticCurveTo(x, y + h,     x, y + h - r);
    shape.lineTo(x, y + r);
    shape.quadraticCurveTo(x, y,         x + r, y);
    shape.closePath();
    const geo = new THREE.ShapeGeometry(shape, 4);
    const pos = geo.attributes.position;
    const uvs = new Float32Array(pos.count * 2);
    const uMin = coverUV ? coverUV.uMin : 0;
    const uMax = coverUV ? coverUV.uMax : 1;
    const vMin = coverUV ? coverUV.vMin : 0;
    const vMax = coverUV ? coverUV.vMax : 1;
    for (let i = 0; i < pos.count; i++) {
      const fx = (pos.getX(i) - x) / w;
      const fy = (pos.getY(i) - y) / h;
      uvs[i * 2]     = uMin + fx * (uMax - uMin);
      uvs[i * 2 + 1] = vMin + fy * (vMax - vMin);
    }
    geo.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
    return geo;
  }

  // Igual que mosaic-3d.js: recorta UV para cubrir el hueco sin deformar.
  function _coverUV(holderAspect, imgAspect) {
    let uFrac = 1, vFrac = 1;
    if (imgAspect > holderAspect) {
      uFrac = holderAspect / imgAspect;
    } else {
      vFrac = imgAspect / holderAspect;
    }
    const uMin = (1 - uFrac) / 2;
    const vMin = (1 - vFrac) / 2;
    return { uMin, uMax: uMin + uFrac, vMin, vMax: vMin + vFrac };
  }

  // Cover + ajuste de encuadre por contenedor (idéntico a mosaic-3d.js).
  function _coverUVAdjusted(holderAspect, imgAspect, key) {
    const base = _coverUV(holderAspect, imgAspect);
    const adj  = (_exComp && _exComp.imageAdjust) ? _exComp.imageAdjust[key] : null;
    if (!adj) return base;
    let uFrac = (base.uMax - base.uMin) / Math.max(1, adj.scale || 1);
    let vFrac = (base.vMax - base.vMin) / Math.max(1, adj.scale || 1);
    let cu = 0.5 + (adj.dx || 0);
    let cv = 0.5 + (adj.dy || 0);
    cu = Math.min(Math.max(cu, uFrac / 2), 1 - uFrac / 2);
    cv = Math.min(Math.max(cv, vFrac / 2), 1 - vFrac / 2);
    return { uMin: cu - uFrac / 2, uMax: cu + uFrac / 2, vMin: cv - vFrac / 2, vMax: cv + vFrac / 2 };
  }

  // Placeholder visible cuando no hay imagen para un hueco.
  // Mismo aspecto que el del editor: caja oscura, label "img_NN" en
  // amarillo y ratio debajo en gris. Así el cliente puede identificar
  // a simple vista qué prefijos faltan en el JPG exportado.
  function _makePlaceholderTexture(THREE, isHoriz, n) {
    const pw = isHoriz ? 640 : 320;
    const ph = 480;
    const c  = document.createElement('canvas');
    c.width = pw; c.height = ph;
    const cx = c.getContext('2d');
    cx.fillStyle = '#1a1a1a';
    cx.fillRect(0, 0, pw, ph);
    cx.strokeStyle = '#333';
    cx.lineWidth = 2;
    cx.strokeRect(2, 2, pw - 4, ph - 4);
    cx.fillStyle = '#f0a500';
    cx.font = `bold ${Math.round(ph * 0.13)}px 'Apercu Movistar', sans-serif`;
    cx.textAlign = 'center';
    cx.textBaseline = 'middle';
    cx.fillText(`img_${String(n).padStart(2, '0')}`, pw / 2, ph / 2 - 22);
    cx.fillStyle = '#666';
    cx.font = `${Math.round(ph * 0.085)}px 'Apercu Movistar', sans-serif`;
    cx.fillText(isHoriz ? '16:9' : '9:16', pw / 2, ph / 2 + 26);
    return new THREE.CanvasTexture(c);
  }

  // ── HELPERS ───────────────────────────────────────────────

  // Localiza la ruta de la viñeta para un formato y un tipo dado.
  // Llamamos al DOM existente porque Vignettes mantiene su catálogo interno.
  // Como fallback robusto, reconstruimos la ruta por convención.
  function _findVignetteSrc(format, type) {
    const key = `${format.width}x${format.height}_${type}.png`;
    return `assets/img/vignette/${key}`;
  }

  // Decodifica un File a un ImageBitmap a resolución completa.
  // Pasa por un <img> intermedio para garantizar compatibilidad con WEBP,
  // AVIF y otros formatos que createImageBitmap(file) no siempre digiere bien.
  function _decodeFullRes(file) {
    return new Promise((resolve, reject) => {
      const url = URL.createObjectURL(file);
      const img = new Image();
      img.onload = async () => {
        try {
          const bitmap = await createImageBitmap(img, { imageOrientation: 'flipY' });
          URL.revokeObjectURL(url);
          resolve(bitmap);
        } catch (err) {
          URL.revokeObjectURL(url);
          reject(err);
        }
      };
      img.onerror = () => {
        URL.revokeObjectURL(url);
        reject(new Error('Error decodificando ' + file.name));
      };
      img.src = url;
    });
  }

  function _loadImage(src) {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload  = () => resolve(img);
      img.onerror = () => { console.warn(`[Mosaiker] No se pudo cargar: ${src}`); resolve(null); };
      img.src = src;
    });
  }

  // Dibuja `img` cubriendo W×H (object-fit: cover, centrado).
  function _drawCover(ctx, img, W, H) {
    const iw = img.naturalWidth || img.width;
    const ih = img.naturalHeight || img.height;
    if (!iw || !ih) return;
    const scale = Math.max(W / iw, H / ih);
    const dw = iw * scale, dh = ih * scale;
    ctx.drawImage(img, (W - dw) / 2, (H - dh) / 2, dw, dh);
  }

  // Slug URL-friendly: lowercase, sin acentos, sólo a-z 0-9, hyphens medios
  function _slug(s) {
    return (s || '')
      .toLowerCase()
      .normalize('NFD')                  // separa diacríticos
      .replace(/[̀-ͯ]/g, '')   // los elimina
      .replace(/[^a-z0-9]+/g, '-')       // resto a hyphen
      .replace(/^-+|-+$/g, '');          // recorta hyphens en extremos
  }

  function _download(blob, filename) {
    const url = URL.createObjectURL(blob);
    const a   = Object.assign(document.createElement('a'), { href: url, download: filename });
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  // ── PROGRESO ──────────────────────────────────────────────

  function _showProgress(total) {
    document.getElementById('export-progress')?.remove();
    const el = document.createElement('div');
    el.id = 'export-progress';
    el.style.cssText = `
      position:fixed;bottom:24px;right:24px;z-index:99999;
      background:#161616;border:1px solid #2e2e2e;border-radius:4px;
      padding:12px 16px;min-width:280px;
      box-shadow:0 8px 24px rgba(0,0,0,0.6);
      font-family:var(--font);font-size:11px;color:#888;
    `;
    const title = document.createElement('div');
    title.style.cssText = 'font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:var(--col-yellow);margin-bottom:6px;font-size:10px;';
    title.textContent = 'Exportando…';
    const info = document.createElement('div');
    info.id = 'export-progress-info';
    info.textContent = `0 / ${total}`;
    const bar = document.createElement('div');
    bar.style.cssText = 'height:2px;background:#222;border-radius:1px;margin-top:8px;overflow:hidden;';
    const fill = document.createElement('div');
    fill.id = 'export-progress-fill';
    fill.style.cssText = 'height:100%;background:var(--col-yellow);width:0%;transition:width 0.2s;';
    bar.appendChild(fill);
    el.appendChild(title);
    el.appendChild(info);
    el.appendChild(bar);
    document.body.appendChild(el);
    return {
      update: (n, name) => {
        const infoEl = document.getElementById('export-progress-info');
        const fillEl = document.getElementById('export-progress-fill');
        if (infoEl) infoEl.textContent = `${n} / ${total}${name ? ' — ' + name : ''}`;
        if (fillEl) fillEl.style.width = `${(n / total) * 100}%`;
      },
      close: () => setTimeout(() => document.getElementById('export-progress')?.remove(), 800),
    };
  }

  return { init };
})();
