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

  // Sello: imagen especial para la "calle" central de los esqueletos que la
  // usan (type 'stacks'). Se reconoce por nombre de archivo con prefijo
  // "SELLO_" (p.ej. SELLO_bono.png). Es única (no indexada por número).
  let sello = null; // { display, file, originalSize } | null

  // Promesas de decodificación en curso. Permite a otros módulos (export,
  // guardado…) esperar a que el cache esté "consolidado" antes de leer,
  // evitando race conditions tipo "el usuario arrastra y exporta rápido".
  const pending = new Set();

  // Carga UN archivo. Devuelve Promise<number> con el prefijo asignado,
  // o rechaza si el nombre no tiene prefijo numérico.
  function loadFile(file) {
    const p = new Promise((resolve, reject) => {
      // ¿Es el sello? (prefijo "SELLO_" o "SELLO-", insensible a mayúsculas)
      const isSello = /^sello[_-]/i.test(file.name);

      let n = null;
      if (!isSello) {
        const match = file.name.match(/^(\d+)/);
        if (!match) {
          console.warn(`[Mosaiker] Archivo sin prefijo numérico, ignorado: ${file.name}`);
          reject(new Error('Sin prefijo numérico'));
          return;
        }
        n = parseInt(match[1], 10);
        if (isNaN(n) || n < 1) {
          console.warn(`[Mosaiker] Prefijo inválido en: ${file.name}`);
          reject(new Error('Prefijo inválido'));
          return;
        }
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

          if (isSello) {
            // Sustituye el sello previo liberando su bitmap.
            if (sello && sello.display && typeof sello.display.close === 'function') {
              sello.display.close();
            }
            sello = { display, file, originalSize: { w: ow, h: oh } };
            resolve('SELLO');
            return;
          }

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
    p.finally(() => pending.delete(p)).catch(() => {}); // evita "uncaught (in promise)" del propio finally cuando p rechaza
    return p;
  }

  // Vincula un archivo DIRECTAMENTE a un contenedor (clave string, p.ej.
  // "verticales:17"), ignorando el nombre/índice del archivo. La imagen vive
  // en el mismo cache bajo esa clave; el render la usa con prioridad sobre el
  // índice del esqueleto. Devuelve Promise<containerKey>.
  function bindFileToContainer(file, containerKey) {
    const p = new Promise((resolve, reject) => {
      const url = URL.createObjectURL(file);
      const img = new Image();
      img.onload = async () => {
        const ow = img.width, oh = img.height;
        const maxDim = Math.max(ow, oh);
        const scale  = maxDim > MAX_DISPLAY_EDGE ? MAX_DISPLAY_EDGE / maxDim : 1;
        try {
          const opts = scale < 1
            ? { resizeWidth: Math.round(ow * scale), resizeHeight: Math.round(oh * scale), resizeQuality: 'high', imageOrientation: 'flipY' }
            : { imageOrientation: 'flipY' };
          const display = await createImageBitmap(img, opts);
          URL.revokeObjectURL(url);
          const prev = cache[containerKey];
          if (prev && prev.display && typeof prev.display.close === 'function') prev.display.close();
          cache[containerKey] = { display, file, originalSize: { w: ow, h: oh } };
          resolve(containerKey);
        } catch (err) { URL.revokeObjectURL(url); reject(err); }
      };
      img.onerror = () => { URL.revokeObjectURL(url); reject(new Error(`No se pudo decodificar: ${file.name}`)); };
      img.src = url;
    });
    pending.add(p);
    p.finally(() => pending.delete(p)).catch(() => {}); // evita "uncaught (in promise)" del propio finally cuando p rechaza
    return p;
  }

  // Copia una entrada de caché (vinculada o de grupo) de una clave a otra.
  // Se usa al HEREDAR la composición de un formato en otro (cada formato guarda
  // sus imágenes bajo "formatId::n" / "formatId::group::id"; al entrar a un
  // formato nuevo se duplican para que pueda divergir sin tocar el original).
  // OJO: se copia el bitmap (createImageBitmap), NO se comparte la referencia —
  // al sustituir una imagen se hace display.close(), que liberaría el bitmap del
  // otro formato si lo compartieran. Si la copia falla, se redecodifica del File.
  function copyBinding(srcKey, dstKey) {
    const p = (async () => {
      const src = cache[srcKey];
      if (!src || !src.display) return null;
      let display = null;
      try {
        display = await createImageBitmap(src.display);
      } catch (e) {
        if (src.file) { try { return await bindFileToContainer(src.file, dstKey); } catch (_) {} }
        return null;
      }
      const prev = cache[dstKey];
      if (prev && prev.display && typeof prev.display.close === 'function') prev.display.close();
      cache[dstKey] = { display, file: src.file, originalSize: src.originalSize };
      return dstKey;
    })();
    pending.add(p);
    p.finally(() => pending.delete(p)).catch(() => {}); // evita "uncaught (in promise)" del propio finally cuando p rechaza
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

  // Devuelve el bitmap del sello (o null si no se ha cargado ninguno)
  function getSello() {
    return sello ? sello.display : null;
  }

  function getSelloFile() {
    return sello ? sello.file : null;
  }

  function hasSello() {
    return sello !== null;
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
    if (sello && sello.display && typeof sello.display.close === 'function') sello.display.close();
    sello = null;
    if (typeof Mosaic3D !== 'undefined') Mosaic3D.refreshTextures();
  }

  return { loadFile, loadFiles, bindFileToContainer, copyBinding, getImage, getOriginalFile, has, getLoadedNumbers, clear, whenIdle,
           getSello, getSelloFile, hasSello };
})();
