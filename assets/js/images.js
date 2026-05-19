// ============================================================
// IMAGES.JS — Cache global de imágenes cargadas, indexadas por prefijo
//
// Convención: el archivo "15_titulo.jpg" se asigna al hueco con n=15
// en cualquier esqueleto. El cache vive a nivel app — al cambiar de
// esqueleto, las imágenes ya cargadas se reutilizan automáticamente.
// ============================================================

const Images = (() => {

  // Resolución máxima para uso en pantalla. La imagen original sigue
  // disponible (cache[n].file) para cuando llegue la exportación a JPG
  // (que se hará a la resolución real del formato, sin esta limitación).
  // 2048px: máxima nitidez razonable. Con mipmaps + anisotropy en el
  // renderer 3D, no hay aliasing aunque la imagen se vea downsampled.
  const MAX_DISPLAY_EDGE = 2048;

  // Map: prefijo (1-based) → { display: HTMLCanvasElement, file: File, originalSize }
  const cache = {};

  // Promesas de decodificación en curso. Permite a otros módulos (export,
  // guardado…) esperar a que el cache esté "consolidado" antes de leer,
  // evitando race conditions tipo "el usuario arrastra y exporta rápido".
  const pending = new Set();

  // Carga UN archivo. Devuelve Promise<number> con el prefijo asignado,
  // o rechaza si el nombre no tiene prefijo numérico.
  function loadFile(file) {
    const p = new Promise((resolve, reject) => {
      const match = file.name.match(/^(\d+)/);
      if (!match) {
        console.warn(`[Mosaiker] Archivo sin prefijo numérico, ignorado: ${file.name}`);
        reject(new Error('Sin prefijo numérico'));
        return;
      }
      const n = parseInt(match[1], 10);
      if (isNaN(n) || n < 1) {
        console.warn(`[Mosaiker] Prefijo inválido en: ${file.name}`);
        reject(new Error('Prefijo inválido'));
        return;
      }

      const url = URL.createObjectURL(file);
      const img = new Image();
      img.onload = async () => {
        const ow = img.width;
        const oh = img.height;
        const maxDim = Math.max(ow, oh);
        const scale  = maxDim > MAX_DISPLAY_EDGE ? MAX_DISPLAY_EDGE / maxDim : 1;

        try {
          // imageOrientation: 'flipY' compensa el origen top-left del
          // bitmap vs el bottom-left que espera WebGL — si no, las
          // imágenes salen boca abajo al usarlas como textura.
          let display;
          if (scale < 1) {
            display = await createImageBitmap(img, {
              resizeWidth:     Math.round(ow * scale),
              resizeHeight:    Math.round(oh * scale),
              resizeQuality:   'high',
              imageOrientation:'flipY',
            });
          } else {
            display = await createImageBitmap(img, { imageOrientation: 'flipY' });
          }

          URL.revokeObjectURL(url);

          // Si había una imagen previa para este prefijo, liberamos su bitmap.
          // Garantiza que no se acumula memoria al sustituir muchas veces la
          // misma carátula durante una sesión de edición.
          const prev = cache[n];
          if (prev && prev.display && typeof prev.display.close === 'function') {
            prev.display.close();
          }

          cache[n] = { display, file, originalSize: { w: ow, h: oh } };
          resolve(n);
        } catch (err) {
          URL.revokeObjectURL(url);
          reject(err);
        }
      };
      img.onerror = () => {
        URL.revokeObjectURL(url);
        reject(new Error(`No se pudo decodificar: ${file.name}`));
      };
      img.src = url;
    });
    pending.add(p);
    p.finally(() => pending.delete(p));
    return p;
  }

  // Resuelve cuando no hay ningún loadFile en curso.
  // Se usa en el exportador para evitar disparar el render con cache "a medias".
  function whenIdle() {
    if (pending.size === 0) return Promise.resolve();
    return Promise.allSettled([...pending]).then(() => {
      // Si en el ínterin se añadieron más loads, esperamos también esos
      if (pending.size > 0) return whenIdle();
    });
  }

  // Carga múltiples archivos. Tras terminar, notifica a Mosaic3D para
  // que reconstruya el mosaico con las nuevas imágenes.
  function loadFiles(fileList) {
    const arr = Array.from(fileList || []);
    if (arr.length === 0) return Promise.resolve([]);

    const promises = arr.map(f => loadFile(f).catch(() => null));
    return Promise.all(promises).then(results => {
      const ok = results.filter(n => n !== null);
      console.log(`[Mosaiker] Imágenes cargadas (prefijos): ${ok.join(', ') || 'ninguna'}`);
      if (ok.length > 0 && typeof Mosaic3D !== 'undefined') {
        Mosaic3D.refreshTextures();
      }
      return ok;
    });
  }

  // Devuelve la versión "display" (downscaled) lista para usarse como textura
  function getImage(n) {
    return cache[n] ? cache[n].display : null;
  }

  // Devuelve el File original (para exportación a resolución completa)
  function getOriginalFile(n) {
    return cache[n] ? cache[n].file : null;
  }

  function has(n) {
    return n in cache;
  }

  function getLoadedNumbers() {
    return Object.keys(cache).map(Number).sort((a, b) => a - b);
  }

  function clear() {
    Object.keys(cache).forEach(k => delete cache[k]);
    if (typeof Mosaic3D !== 'undefined') Mosaic3D.refreshTextures();
  }

  return { loadFile, loadFiles, getImage, getOriginalFile, has, getLoadedNumbers, clear, whenIdle };
})();
