'use strict';

const VERSION = '1.2';
const CLAVE = 'hojasDnD.v1';

// ===== Reglas =====
const CARACTERISTICAS = [
  { id: 'fue', nombre: 'Fuerza' },
  { id: 'des', nombre: 'Destreza' },
  { id: 'con', nombre: 'Constitución' },
  { id: 'int', nombre: 'Inteligencia' },
  { id: 'sab', nombre: 'Sabiduría' },
  { id: 'car', nombre: 'Carisma' },
];
const HABILIDADES = [
  ['atletismo', 'Atletismo', 'fue'],
  ['acrobacias', 'Acrobacias', 'des'],
  ['juegoManos', 'Juego de manos', 'des'],
  ['sigilo', 'Sigilo', 'des'],
  ['arcano', 'Conocimiento arcano', 'int'],
  ['historia', 'Historia', 'int'],
  ['investigacion', 'Investigación', 'int'],
  ['naturaleza', 'Naturaleza', 'int'],
  ['religion', 'Religión', 'int'],
  ['medicina', 'Medicina', 'sab'],
  ['percepcion', 'Percepción', 'sab'],
  ['perspicacia', 'Perspicacia', 'sab'],
  ['supervivencia', 'Supervivencia', 'sab'],
  ['tratoAnimales', 'Trato con animales', 'sab'],
  ['engano', 'Engaño', 'car'],
  ['interpretacion', 'Interpretación', 'car'],
  ['intimidacion', 'Intimidación', 'car'],
  ['persuasion', 'Persuasión', 'car'],
].map(([id, nombre, car]) => ({ id, nombre, car }));

const num = v => Number(v) || 0;
const modificador = puntuacion => Math.floor(((puntuacion === '' || puntuacion == null ? 10 : Number(puntuacion)) - 10) / 2);
const nivelValido = n => Math.min(20, Math.max(1, Math.floor(num(n)) || 1));
const bonifCompetencia = nivel => 2 + Math.floor((nivelValido(nivel) - 1) / 4);
const conSigno = n => (n < 0 ? '−' : '+') + Math.abs(n);

// ===== Modelo de datos =====
function crearId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

function nuevoPersonaje() {
  return {
    id: crearId(),
    modificado: Date.now(),
    nombre: '', clase: '', subclase: '', especie: '', trasfondo: '', nivel: 1, px: '',
    ca: '', escudo: false, velocidad: '9 m', tamano: 'Mediano', iniciativaExtra: '',
    pg: { act: '', temp: '', max: '' },
    dg: { dado: 'd8', gastados: 0 },
    muerte: { exitos: 0, fallos: 0 },
    inspiracion: false,
    punt: { fue: 10, des: 10, con: 10, int: 10, sab: 10, car: 10 },
    salv: { fue: false, des: false, con: false, int: false, sab: false, car: false },
    hab: Object.fromEntries(HABILIDADES.map(h => [h.id, 0])),
    armaduras: { ligera: false, media: false, pesada: false, escudo: false },
    compArmas: '', compHerramientas: '',
    armas: [],
    rasgosClase: '', atributosEspecie: '', dotes: '',
    magia: { aptitud: '', espacios: Array.from({ length: 9 }, () => ({ total: 0, gastados: 0 })) },
    conjuros: [],
    imagen: null, aspecto: '', historia: '', alineamiento: '', idiomas: '', equipo: '',
    sintonia: Array.from({ length: 3 }, () => ({ activo: false, nombre: '' })),
    monedas: { pc: '', pp: '', pe: '', po: '', ppt: '' },
  };
}
const nuevaArma = () => ({ nombre: '', bonif: '', dano: '', notas: '' });
const nuevoConjuro = () => ({ nivel: 0, nombre: '', tiempo: '', alcance: '', c: false, r: false, m: false, notas: '' });

// Mezcla datos guardados/importados con la plantilla, para que nunca falte ningún campo.
function fusionar(base, datos) {
  if (datos === undefined || datos === null) return base;
  if (Array.isArray(base)) {
    if (!Array.isArray(datos)) return base;
    return base.length ? base.map((b, i) => fusionar(b, datos[i])) : datos;
  }
  if (typeof base === 'object' && base !== null) {
    if (typeof datos !== 'object' || Array.isArray(datos)) return base;
    const r = { ...datos };
    for (const k of Object.keys(base)) r[k] = fusionar(base[k], datos[k]);
    return r;
  }
  if (typeof base === 'boolean') return !!datos;
  return typeof datos === 'object' ? base : datos;
}

function normalizar(datos) {
  const p = fusionar(nuevoPersonaje(), datos);
  p.armas = p.armas.filter(a => a && typeof a === 'object').map(a => fusionar(nuevaArma(), a));
  p.conjuros = p.conjuros.filter(c => c && typeof c === 'object').map(c => fusionar(nuevoConjuro(), c));
  p.imagen = imagenValida(datos && datos.imagen);
  if (!p.id) p.id = crearId();
  return p;
}

// imagen = { src (JPEG en base64), ancho, alto (píxeles), zoom (1-4), x, y (0-1: qué parte queda a la vista) }
function imagenValida(im) {
  if (!im || typeof im.src !== 'string' || !im.src.startsWith('data:image/')) return null;
  const rango = (v, def, min, max) => (Number.isFinite(Number(v)) && v !== null ? Math.min(max, Math.max(min, Number(v))) : def);
  return {
    src: im.src,
    ancho: rango(im.ancho, 1, 1, 100000),
    alto: rango(im.alto, 1, 1, 100000),
    zoom: rango(im.zoom, 1, 1, 4),
    x: rango(im.x, .5, 0, 1),
    y: rango(im.y, .5, 0, 1),
  };
}

const leer = (obj, ruta) => ruta.split('.').reduce((o, k) => (o == null ? undefined : o[k]), obj);
function escribir(obj, ruta, valor) {
  const claves = ruta.split('.');
  const ultima = claves.pop();
  claves.reduce((o, k) => o[k], obj)[ultima] = valor;
}

// ===== Guardado =====
let personajes = cargar();
let actual = null;
let pestana = 'combate';

function cargar() {
  try {
    const datos = JSON.parse(localStorage.getItem(CLAVE));
    return Array.isArray(datos) ? datos.map(normalizar) : [];
  } catch {
    return [];
  }
}

let temporizador = null;
function guardar() {
  if (actual) actual.modificado = Date.now();
  clearTimeout(temporizador);
  temporizador = setTimeout(guardarYa, 300);
}
function guardarYa() {
  clearTimeout(temporizador);
  try {
    localStorage.setItem(CLAVE, JSON.stringify(personajes));
  } catch (e) {
    aviso(e.name === 'QuotaExceededError'
      ? 'No queda espacio para guardar. Quita alguna imagen o borra personajes que no uses.'
      : 'No se ha podido guardar: ' + e.message);
  }
}
window.addEventListener('pagehide', guardarYa);
document.addEventListener('visibilitychange', () => { if (document.hidden) guardarYa(); });

// ===== Utilidades de interfaz =====
const $ = sel => document.querySelector(sel);
const $$ = sel => document.querySelectorAll(sel);

function h(etiqueta, props, ...hijos) {
  const e = document.createElement(etiqueta);
  for (const [k, v] of Object.entries(props || {})) {
    if (v == null || v === false) continue;
    if (k === 'class') e.className = v;
    else if (k.startsWith('on')) e.addEventListener(k.slice(2), v);
    else if (k in e && !k.includes('-')) e[k] = v;
    else e.setAttribute(k, v === true ? '' : v);
  }
  for (const c of hijos.flat()) if (c != null && c !== false) e.append(c);
  return e;
}

let temporizadorAviso = null;
function aviso(texto) {
  const e = $('#aviso');
  e.textContent = texto;
  e.hidden = false;
  clearTimeout(temporizadorAviso);
  temporizadorAviso = setTimeout(() => { e.hidden = true; }, 2500);
}

function autoajustar(t) {
  t.style.height = 'auto';
  t.style.height = t.scrollHeight + 2 + 'px';
}

// ===== Lista de personajes =====
function resumen(p) {
  const clase = [p.clase, p.subclase && `(${p.subclase})`].filter(Boolean).join(' ');
  return [clase ? `${clase} ${nivelValido(p.nivel)}` : `Nivel ${nivelValido(p.nivel)}`, p.especie].filter(Boolean).join(' · ');
}

function pintarLista() {
  const cont = $('#personajes');
  cont.replaceChildren();
  if (!personajes.length) {
    cont.append(h('p', { class: 'vacio' }, 'Todavía no hay personajes. Crea el primero con «Nuevo personaje» o importa un archivo.'));
    return;
  }
  [...personajes].sort((a, b) => b.modificado - a.modificado).forEach(p => {
    cont.append(h('article', { class: 'tarjeta-pj' },
      h('button', { class: 'abrir', onclick: () => abrir(p.id) },
        miniatura(p),
        h('div', { class: 'texto' },
          h('strong', {}, p.nombre || 'Sin nombre'),
          h('span', {}, resumen(p)),
          h('span', {}, `PG ${p.pg.act === '' ? '–' : p.pg.act} / ${p.pg.max === '' ? '–' : p.pg.max}`))),
      h('div', { class: 'acciones' },
        h('button', { onclick: () => duplicar(p.id) }, 'Duplicar'),
        h('button', { onclick: () => exportar([p], nombreArchivo(p.nombre)) }, 'Exportar'),
        h('button', { onclick: () => borrar(p.id) }, 'Borrar'))));
  });
}

function miniatura(p) {
  const caja = h('div', { class: 'miniatura' });
  if (p.imagen) {
    const img = h('img', { src: p.imagen.src, alt: '' });
    colocarImagen(img, p.imagen, 54, 72);
    caja.append(img);
  } else {
    caja.textContent = (p.nombre || '?').trim().charAt(0).toUpperCase() || '?';
  }
  return caja;
}

function crear() {
  const p = nuevoPersonaje();
  personajes.push(p);
  guardarYa();
  abrir(p.id, 'ficha');
  setTimeout(() => $('[data-campo="nombre"]').focus(), 50);
}

function duplicar(id) {
  const original = personajes.find(p => p.id === id);
  const copia = normalizar(JSON.parse(JSON.stringify(original)));
  copia.id = crearId();
  copia.nombre = (original.nombre || 'Sin nombre') + ' (copia)';
  copia.modificado = Date.now();
  personajes.push(copia);
  guardarYa();
  pintarLista();
}

function borrar(id) {
  const p = personajes.find(x => x.id === id);
  if (!confirm(`¿Borrar a «${p.nombre || 'Sin nombre'}»? No se puede deshacer.\n(Si quieres conservarlo, expórtalo antes.)`)) return false;
  personajes = personajes.filter(x => x.id !== id);
  guardarYa();
  pintarLista();
  return true;
}

// ===== Exportar / importar =====
function nombreArchivo(nombre) {
  const limpio = (nombre || 'personaje').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^\w-]+/g, '_').replace(/^_+|_+$/g, '');
  return (limpio || 'personaje') + '.json';
}

async function exportar(lista, nombre) {
  guardarYa();
  const datos = { app: 'hoja-dnd-2024', version: 1, exportado: new Date().toISOString(), personajes: lista };
  const archivo = new File([JSON.stringify(datos, null, 2)], nombre, { type: 'application/json' });
  const esMovil = matchMedia('(pointer: coarse)').matches;
  if (esMovil && navigator.canShare && navigator.canShare({ files: [archivo] })) {
    try {
      await navigator.share({ files: [archivo], title: nombre });
      return;
    } catch (e) {
      if (e.name === 'AbortError') return;
    }
  }
  const url = URL.createObjectURL(archivo);
  const a = h('a', { href: url, download: nombre });
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

async function importar(archivo) {
  let lista;
  try {
    const datos = JSON.parse(await archivo.text());
    lista = Array.isArray(datos) ? datos : Array.isArray(datos.personajes) ? datos.personajes : [datos];
  } catch {
    aviso('El archivo no es una hoja de personaje válida');
    return;
  }
  let n = 0;
  for (const bruto of lista) {
    if (!bruto || typeof bruto !== 'object') continue;
    const p = normalizar(bruto);
    const i = personajes.findIndex(x => x.id === p.id);
    if (i >= 0) {
      if (confirm(`Ya tienes a «${personajes[i].nombre || 'Sin nombre'}».\n¿Reemplazarlo por el del archivo?\n(Cancelar = importarlo como copia)`)) {
        personajes[i] = p;
      } else {
        p.id = crearId();
        personajes.push(p);
      }
    } else {
      personajes.push(p);
    }
    n++;
  }
  guardarYa();
  pintarLista();
  aviso(n === 1 ? '1 personaje importado' : `${n} personajes importados`);
}

// ===== Hoja: construcción =====
function construirCaracteristicas() {
  const cont = $('#lista-caracteristicas');
  for (const c of CARACTERISTICAS) {
    const habilidades = HABILIDADES.filter(hb => hb.car === c.id);
    cont.append(h('div', { class: 'caja carac' },
      h('div', { class: 'carac-izq' },
        h('span', { class: 'nombre' }, c.nombre),
        h('span', { class: 'mod', 'data-calc': 'mod-' + c.id }),
        h('input', { 'data-campo': 'punt.' + c.id, 'data-tipo': 'num', type: 'number', inputmode: 'numeric', 'aria-label': 'Puntuación de ' + c.nombre }),
        h('span', { class: 'etq' }, 'Puntuación')),
      h('ul', { class: 'tiradas' },
        h('li', { class: 'salvacion' },
          h('button', { class: 'prof', 'data-accion': 'salv', 'data-id': c.id, 'aria-label': 'Competencia en salvación de ' + c.nombre }),
          h('span', { class: 'valor', 'data-calc': 'salv-' + c.id }),
          h('span', {}, 'Tirada de salvación')),
        habilidades.map(hb => h('li', {},
          h('button', { class: 'prof', 'data-accion': 'hab', 'data-id': hb.id, 'aria-label': 'Competencia en ' + hb.nombre }),
          h('span', { class: 'valor', 'data-calc': 'hab-' + hb.id }),
          h('span', {}, hb.nombre))))));
  }
}

function pintarArmas(abrirIndice) {
  const cont = $('#lista-armas');
  cont.replaceChildren();
  if (!actual.armas.length) cont.append(h('p', { class: 'vacia' }, 'Sin armas ni trucos todavía.'));
  actual.armas.forEach((a, i) => {
    const ruta = `armas.${i}.`;
    cont.append(h('details', { 'data-lista': 'armas', 'data-i': i, open: i === abrirIndice },
      h('summary', {}),
      h('div', { class: 'cuerpo' },
        h('label', { class: 'campo ancho' }, 'Nombre', h('input', { 'data-campo': ruta + 'nombre', autocomplete: 'off' })),
        h('label', { class: 'campo' }, 'Bonif. ataque / CD', h('input', { 'data-campo': ruta + 'bonif', autocomplete: 'off' })),
        h('label', { class: 'campo' }, 'Daño y tipo', h('input', { 'data-campo': ruta + 'dano', autocomplete: 'off' })),
        h('label', { class: 'campo ancho' }, 'Notas', h('textarea', { 'data-campo': ruta + 'notas', rows: 1 })),
        h('button', { class: 'peligro borrar', 'data-accion': 'borrarArma', 'data-i': i }, 'Borrar'))));
  });
  cont.querySelectorAll('details').forEach(pintarResumen);
}

function pintarConjuros(abrirIndice) {
  const cont = $('#lista-conjuros');
  cont.replaceChildren();
  if (!actual.conjuros.length) cont.append(h('p', { class: 'vacia' }, 'Sin conjuros todavía.'));
  actual.conjuros.forEach((c, i) => {
    const ruta = `conjuros.${i}.`;
    cont.append(h('details', { 'data-lista': 'conjuros', 'data-i': i, open: i === abrirIndice },
      h('summary', {}),
      h('div', { class: 'cuerpo' },
        h('label', { class: 'campo ancho' }, 'Nombre', h('input', { 'data-campo': ruta + 'nombre', autocomplete: 'off' })),
        h('label', { class: 'campo' }, 'Nivel (0 = truco)', h('input', { 'data-campo': ruta + 'nivel', 'data-tipo': 'num', type: 'number', inputmode: 'numeric', min: 0, max: 9 })),
        h('label', { class: 'campo' }, 'Tiempo de lanzamiento', h('input', { 'data-campo': ruta + 'tiempo', autocomplete: 'off' })),
        h('label', { class: 'campo ancho' }, 'Alcance', h('input', { 'data-campo': ruta + 'alcance', autocomplete: 'off' })),
        h('div', { class: 'crm' },
          h('label', {}, h('input', { type: 'checkbox', 'data-campo': ruta + 'c' }), 'Concentración'),
          h('label', {}, h('input', { type: 'checkbox', 'data-campo': ruta + 'r' }), 'Ritual'),
          h('label', {}, h('input', { type: 'checkbox', 'data-campo': ruta + 'm' }), 'Material')),
        h('label', { class: 'campo ancho' }, 'Notas', h('textarea', { 'data-campo': ruta + 'notas', rows: 1 })),
        h('button', { class: 'peligro borrar', 'data-accion': 'borrarConjuro', 'data-i': i }, 'Borrar'))));
  });
  cont.querySelectorAll('details').forEach(pintarResumen);
}

function pintarResumen(det) {
  const item = actual[det.dataset.lista][det.dataset.i];
  const s = det.querySelector('summary');
  if (det.dataset.lista === 'armas') {
    s.replaceChildren(
      h('span', { class: 'a' }, item.bonif || '—'),
      h('span', { class: 'n' }, item.nombre || 'Sin nombre'),
      h('span', { class: 'b' }, item.dano));
  } else {
    const nivel = num(item.nivel);
    s.replaceChildren(
      h('span', { class: 'a' }, nivel ? 'Nv ' + nivel : 'Truco'),
      h('span', { class: 'n' }, item.nombre || 'Sin nombre'),
      h('span', { class: 'b' }, [item.c && 'C', item.r && 'R', item.m && 'M'].filter(Boolean).join(' ')));
  }
}

function rombos(cantidad, marcados, atributos) {
  return Array.from({ length: cantidad }, (_, i) =>
    h('button', { class: 'rombo' + (i < marcados ? ' on' : ''), 'data-i': i, ...atributos, 'aria-label': `${i + 1}` }));
}

function pintarEspacios() {
  const cont = $('#lista-espacios');
  cont.replaceChildren(...actual.magia.espacios.map((e, n) => h('div', { class: 'espacio' },
    h('span', { class: 'nv' }, `Nivel ${n + 1}`),
    h('div', { class: 'contador' },
      h('button', { class: 'icono', 'data-accion': 'espacioTotal', 'data-n': n, 'data-d': -1, 'aria-label': 'Quitar espacio' }, '−'),
      h('b', {}, e.total),
      h('button', { class: 'icono', 'data-accion': 'espacioTotal', 'data-n': n, 'data-d': 1, 'aria-label': 'Añadir espacio' }, '+')),
    h('div', { class: 'rombos' }, rombos(e.total, e.gastados, { 'data-accion': 'espacio', 'data-n': n })))));
}

function pintarEstados() {
  const p = actual;
  $$('.prof[data-accion=salv]').forEach(b => { b.dataset.nivel = p.salv[b.dataset.id] ? 1 : 0; });
  $$('.prof[data-accion=hab]').forEach(b => { b.dataset.nivel = p.hab[b.dataset.id] || 0; });
  $$('[data-muerte]').forEach(cont => {
    const tipo = cont.dataset.muerte;
    cont.replaceChildren(...rombos(3, p.muerte[tipo], { 'data-accion': 'muerte', 'data-tipo': tipo }));
  });
  $('[data-estado=inspiracion]').setAttribute('aria-pressed', p.inspiracion);
  const max = num(p.pg.max);
  const proporcion = max ? Math.max(0, Math.min(1, num(p.pg.act) / max)) : 0;
  const barra = $('[data-estado=pgBarra]');
  barra.style.width = proporcion * 100 + '%';
  barra.className = proporcion <= .25 ? 'bajo' : proporcion <= .5 ? 'medio' : '';
}

// ===== Imagen del personaje =====
const RETRATO = { ancho: 180, alto: 240 };  // igual que .retrato en estilos.css
const ZOOM_MAX = 4;
let editandoImagen = false;

// La imagen siempre cubre todo el recuadro; zoom la agranda y x/y eligen qué parte se ve.
function medidasImagen(imagen, ancho, alto) {
  const escala = Math.max(ancho / imagen.ancho, alto / imagen.alto) * imagen.zoom;
  return { w: imagen.ancho * escala, h: imagen.alto * escala };
}

function colocarImagen(img, imagen, ancho, alto) {
  const m = medidasImagen(imagen, ancho, alto);
  img.style.width = m.w + 'px';
  img.style.height = m.h + 'px';
  img.style.left = (ancho - m.w) * imagen.x + 'px';
  img.style.top = (alto - m.h) * imagen.y + 'px';
}

function pintarRetrato() {
  const im = actual.imagen;
  if (!im) editandoImagen = false;
  const img = $('#retrato-img');
  img.hidden = !im;
  $('#retrato-vacio').hidden = !!im;
  $('#btn-subir').textContent = im ? 'Cambiar imagen' : 'Subir imagen';
  $('#btn-encuadrar').hidden = !im || editandoImagen;
  $('#btn-quitar').hidden = !im;
  $('#retrato-edicion').hidden = !editandoImagen;
  $('#retrato').classList.toggle('editando', editandoImagen);
  if (im) {
    if (img.getAttribute('src') !== im.src) img.src = im.src;
    colocarImagen(img, im, RETRATO.ancho, RETRATO.alto);
    $('#retrato-zoom').value = im.zoom;
  } else {
    img.removeAttribute('src');
  }
}

function leerArchivoImagen(archivo) {
  return new Promise((ok, mal) => {
    const url = URL.createObjectURL(archivo);
    const img = new Image();
    img.onload = () => { URL.revokeObjectURL(url); ok(img); };
    img.onerror = () => { URL.revokeObjectURL(url); mal(new Error('imagen no válida')); };
    img.src = url;
  });
}

// Reduce la imagen (lado mayor 1000 px, JPEG) para que quepa en el almacenamiento del móvil.
async function cargarImagen(archivo) {
  let img;
  try {
    img = await leerArchivoImagen(archivo);
  } catch {
    aviso('No se ha podido abrir la imagen');
    return;
  }
  const factor = Math.min(1, 1000 / Math.max(img.naturalWidth, img.naturalHeight));
  const ancho = Math.round(img.naturalWidth * factor);
  const alto = Math.round(img.naturalHeight * factor);
  const lienzo = h('canvas', { width: ancho, height: alto });
  const ctx = lienzo.getContext('2d');
  ctx.fillStyle = '#ffffff';  // el JPEG no admite transparencia
  ctx.fillRect(0, 0, ancho, alto);
  ctx.drawImage(img, 0, 0, ancho, alto);
  actual.imagen = { src: lienzo.toDataURL('image/jpeg', .85), ancho, alto, zoom: 1, x: .5, y: .5 };
  editandoImagen = true;
  guardar();
  pintarRetrato();
}

function moverImagen(dx, dy) {
  const im = actual.imagen;
  const m = medidasImagen(im, RETRATO.ancho, RETRATO.alto);
  const sobraX = m.w - RETRATO.ancho;
  const sobraY = m.h - RETRATO.alto;
  if (sobraX > 0) im.x = Math.min(1, Math.max(0, im.x - dx / sobraX));
  if (sobraY > 0) im.y = Math.min(1, Math.max(0, im.y - dy / sobraY));
}

function zoomImagen(zoom) {
  actual.imagen.zoom = Math.min(ZOOM_MAX, Math.max(1, zoom));
}

// Arrastrar con un dedo (o el ratón) y pellizcar con dos.
const punteros = new Map();
const distancia = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);

function iniciarGestoImagen(ev) {
  if (!editandoImagen || !actual.imagen) return;
  ev.preventDefault();
  $('#retrato').setPointerCapture(ev.pointerId);
  punteros.set(ev.pointerId, { x: ev.clientX, y: ev.clientY });
}

function moverGestoImagen(ev) {
  const antes = punteros.get(ev.pointerId);
  if (!antes) return;
  const ahora = { x: ev.clientX, y: ev.clientY };
  if (punteros.size === 1) {
    moverImagen(ahora.x - antes.x, ahora.y - antes.y);
  } else {
    const otro = [...punteros].find(([id]) => id !== ev.pointerId)[1];
    const d = distancia(antes, otro);
    if (d > 0) zoomImagen(actual.imagen.zoom * distancia(ahora, otro) / d);
  }
  punteros.set(ev.pointerId, ahora);
  pintarRetrato();
}

function terminarGestoImagen(ev) {
  if (punteros.delete(ev.pointerId)) guardar();
}

// ===== Hoja: cálculos =====
function valorHabilidad(id) {
  const hb = HABILIDADES.find(x => x.id === id);
  return modificador(actual.punt[hb.car]) + bonifCompetencia(actual.nivel) * (actual.hab[id] || 0);
}

function recalcular() {
  const p = actual;
  const prof = bonifCompetencia(p.nivel);
  const mod = id => modificador(p.punt[id]);
  const ap = p.magia.aptitud;
  const valores = {
    titulo: p.nombre || 'Sin nombre',
    subtitulo: resumen(p),
    competencia: conSigno(prof),
    iniciativa: conSigno(mod('des') + num(p.iniciativaExtra)),
    pasiva: 10 + valorHabilidad('percepcion'),
    modMagia: ap ? conSigno(mod(ap)) : '—',
    cdMagia: ap ? 8 + mod(ap) + prof : '—',
    ataqueMagia: ap ? conSigno(mod(ap) + prof) : '—',
    dgGastados: p.dg.gastados,
    dgTotal: nivelValido(p.nivel),
    dgDisponibles: Math.max(0, nivelValido(p.nivel) - p.dg.gastados),
    dgDado: p.dg.dado || 'd?',
    modCon: conSigno(mod('con')),
  };
  for (const c of CARACTERISTICAS) {
    valores['mod-' + c.id] = conSigno(mod(c.id));
    valores['salv-' + c.id] = conSigno(mod(c.id) + (p.salv[c.id] ? prof : 0));
  }
  for (const hb of HABILIDADES) valores['hab-' + hb.id] = conSigno(valorHabilidad(hb.id));
  $$('[data-calc]').forEach(e => {
    const v = valores[e.dataset.calc];
    if (v !== undefined) e.textContent = v;
  });
  pintarEstados();
}

// Copia los valores del personaje a los campos de la hoja.
function rellenar(raiz = $('#hoja')) {
  raiz.querySelectorAll('[data-campo]').forEach(e => {
    const v = leer(actual, e.dataset.campo);
    if (e.type === 'checkbox') e.checked = !!v;
    else e.value = v ?? '';
  });
}

function pintarHoja() {
  pintarArmas();
  pintarConjuros();
  pintarEspacios();
  editandoImagen = false;
  pintarRetrato();
  rellenar();
  recalcular();
  mostrarPestana(pestana);
}

function mostrarPestana(nombre) {
  pestana = nombre;
  $$('.panel').forEach(p => { p.hidden = p.dataset.panel !== nombre; });
  $$('.pestanas button').forEach(b => {
    if (b.dataset.p === nombre) b.setAttribute('aria-current', 'page');
    else b.removeAttribute('aria-current');
  });
  window.scrollTo(0, 0);
  // Las áreas de texto solo se pueden medir cuando están visibles.
  requestAnimationFrame(() => $$(`[data-panel=${nombre}] textarea`).forEach(autoajustar));
}

// ===== Navegación =====
function abrir(id, pestanaInicial = 'combate') {
  actual = personajes.find(p => p.id === id);
  pestana = pestanaInicial;
  pintarHoja();
  $('#vista-lista').hidden = true;
  $('#vista-hoja').hidden = false;
  history.pushState({ hoja: id }, '', '#hoja');
}

function cerrar() {
  guardarYa();
  actual = null;
  $('#vista-hoja').hidden = true;
  $('#vista-lista').hidden = false;
  pintarLista();
  window.scrollTo(0, 0);
}

window.addEventListener('popstate', () => { if (actual) cerrar(); });

// ===== Combate =====
function cantidadIntroducida() {
  const campo = $('#cantidad');
  const n = Math.floor(num(campo.value));
  if (n <= 0) {
    aviso('Escribe primero la cantidad');
    campo.focus();
    return 0;
  }
  campo.value = '';
  return n;
}

function aplicarDano(n) {
  const pg = actual.pg;
  const deTemporales = Math.min(num(pg.temp), n);
  pg.temp = num(pg.temp) - deTemporales || '';
  pg.act = Math.max(0, num(pg.act) - (n - deTemporales));
  aviso(`−${n} PG` + (deTemporales ? ` (${deTemporales} de temporales)` : ''));
}

function curar(n) {
  const pg = actual.pg;
  if (num(pg.act) === 0) actual.muerte = { exitos: 0, fallos: 0 };
  const max = num(pg.max);
  pg.act = max ? Math.min(max, num(pg.act) + n) : num(pg.act) + n;
}

function abrirDescansoCorto() {
  recalcular();
  $('#corto-dados').value = 0;
  $('#corto-pg').value = '';
  $('#dlg-corto').showModal();
}

function terminarDescansoCorto(ev) {
  if (!ev.submitter || ev.submitter.value !== 'ok') return;
  const disponibles = Math.max(0, nivelValido(actual.nivel) - actual.dg.gastados);
  const dados = Math.min(disponibles, Math.max(0, Math.floor(num($('#corto-dados').value))));
  const pgRecuperados = Math.max(0, Math.floor(num($('#corto-pg').value)));
  actual.dg.gastados += dados;
  if (pgRecuperados) curar(pgRecuperados);
  guardar();
  rellenar();
  recalcular();
  aviso(`Descanso corto: +${pgRecuperados} PG, ${dados} dado(s) de golpe gastado(s)`);
}

function descansoLargo() {
  if (!confirm('Descanso largo: recuperas todos los PG, los dados de golpe y los espacios de conjuro. ¿Continuar?')) return;
  const p = actual;
  if (p.pg.max !== '') p.pg.act = p.pg.max;
  p.pg.temp = '';
  p.dg.gastados = 0;
  p.muerte = { exitos: 0, fallos: 0 };
  p.magia.espacios.forEach(e => { e.gastados = 0; });
  guardar();
  rellenar();
  pintarEspacios();
  recalcular();
  aviso('Descanso largo completado');
}

// ===== Eventos =====
const acciones = {
  nuevo: crear,
  importar: () => $('#archivo-importar').click(),
  exportarTodos: () => {
    if (!personajes.length) return aviso('No hay personajes que exportar');
    exportar(personajes, `hojas_personaje_${new Date().toISOString().slice(0, 10)}.json`);
  },
  volver: () => history.back(),
  exportar: () => exportar([actual], nombreArchivo(actual.nombre)),
  borrarActual: () => { if (borrar(actual.id)) history.back(); },
  pestana: b => mostrarPestana(b.dataset.p),
  salv: b => { actual.salv[b.dataset.id] = !actual.salv[b.dataset.id]; },
  hab: b => { actual.hab[b.dataset.id] = ((actual.hab[b.dataset.id] || 0) + 1) % 3; },
  inspiracion: () => { actual.inspiracion = !actual.inspiracion; },
  muerte: b => {
    const i = Number(b.dataset.i);
    actual.muerte[b.dataset.tipo] = actual.muerte[b.dataset.tipo] === i + 1 ? i : i + 1;
  },
  dg: b => {
    actual.dg.gastados = Math.min(nivelValido(actual.nivel), Math.max(0, actual.dg.gastados + Number(b.dataset.d)));
  },
  dano: () => { const n = cantidadIntroducida(); if (n) { aplicarDano(n); rellenar(); } },
  curar: () => { const n = cantidadIntroducida(); if (n) { curar(n); rellenar(); aviso(`+${n} PG`); } },
  corto: abrirDescansoCorto,
  largo: descansoLargo,
  espacioTotal: b => {
    const e = actual.magia.espacios[b.dataset.n];
    e.total = Math.min(9, Math.max(0, e.total + Number(b.dataset.d)));
    e.gastados = Math.min(e.gastados, e.total);
    pintarEspacios();
  },
  espacio: b => {
    const e = actual.magia.espacios[b.dataset.n];
    const i = Number(b.dataset.i);
    e.gastados = e.gastados === i + 1 ? i : i + 1;
    pintarEspacios();
  },
  nuevaArma: () => {
    actual.armas.push(nuevaArma());
    pintarArmas(actual.armas.length - 1);
    rellenar($('#lista-armas'));
    $('#lista-armas details[open] input').focus();
  },
  borrarArma: b => {
    const a = actual.armas[b.dataset.i];
    if (!confirm(`¿Borrar «${a.nombre || 'Sin nombre'}»?`)) return;
    actual.armas.splice(b.dataset.i, 1);
    pintarArmas();
    rellenar($('#lista-armas'));
  },
  nuevoConjuro: () => {
    actual.conjuros.push(nuevoConjuro());
    pintarConjuros(actual.conjuros.length - 1);
    rellenar($('#lista-conjuros'));
    $('#lista-conjuros details[open] input').focus();
  },
  borrarConjuro: b => {
    const c = actual.conjuros[b.dataset.i];
    if (!confirm(`¿Borrar «${c.nombre || 'Sin nombre'}»?`)) return;
    actual.conjuros.splice(b.dataset.i, 1);
    pintarConjuros();
    rellenar($('#lista-conjuros'));
  },
  subirImagen: () => $('#archivo-imagen').click(),
  encuadrar: () => {
    editandoImagen = !editandoImagen;
    pintarRetrato();
  },
  centrarImagen: () => {
    Object.assign(actual.imagen, { zoom: 1, x: .5, y: .5 });
    pintarRetrato();
  },
  quitarImagen: () => {
    if (!confirm('¿Quitar la imagen del personaje?')) return;
    actual.imagen = null;
    pintarRetrato();
  },
  ordenarConjuros: () => {
    actual.conjuros.sort((a, b) => num(a.nivel) - num(b.nivel) || a.nombre.localeCompare(b.nombre, 'es'));
    pintarConjuros();
    rellenar($('#lista-conjuros'));
  },
};
// Acciones que no modifican el personaje (no hace falta guardar ni recalcular).
const SIN_CAMBIOS = new Set(['nuevo', 'importar', 'exportarTodos', 'volver', 'exportar', 'borrarActual', 'pestana', 'corto', 'largo', 'subirImagen', 'encuadrar']);

document.addEventListener('click', ev => {
  const b = ev.target.closest('[data-accion]');
  if (!b) return;
  ev.preventDefault();
  const accion = b.dataset.accion;
  acciones[accion](b);
  if (actual && !SIN_CAMBIOS.has(accion)) {
    guardar();
    recalcular();
  }
});

$('#hoja').addEventListener('input', ev => {
  const t = ev.target;
  const ruta = t.dataset.campo;
  if (!ruta) return;
  let v = t.type === 'checkbox' ? t.checked : t.value;
  if (t.dataset.tipo === 'num' && v !== '') v = Number(v);
  escribir(actual, ruta, v);
  guardar();
  recalcular();
  if (t.tagName === 'TEXTAREA') autoajustar(t);
  const det = t.closest('details[data-lista]');
  if (det) pintarResumen(det);
});

// Al abrir un desplegable, ajusta la altura de sus notas.
$('#hoja').addEventListener('toggle', ev => {
  if (ev.target.open) ev.target.querySelectorAll('textarea').forEach(autoajustar);
}, true);

$('#archivo-importar').addEventListener('change', ev => {
  const archivo = ev.target.files[0];
  ev.target.value = '';
  if (archivo) importar(archivo);
});

$('#dlg-corto form').addEventListener('submit', terminarDescansoCorto);

$('#archivo-imagen').addEventListener('change', ev => {
  const archivo = ev.target.files[0];
  ev.target.value = '';
  if (archivo) cargarImagen(archivo);
});
$('#retrato-zoom').addEventListener('input', ev => {
  zoomImagen(Number(ev.target.value));
  pintarRetrato();
  guardar();
});
const retrato = $('#retrato');
retrato.addEventListener('pointerdown', iniciarGestoImagen);
retrato.addEventListener('pointermove', moverGestoImagen);
retrato.addEventListener('pointerup', terminarGestoImagen);
retrato.addEventListener('pointercancel', terminarGestoImagen);
retrato.addEventListener('wheel', ev => {
  if (!editandoImagen || !actual.imagen) return;
  ev.preventDefault();
  zoomImagen(actual.imagen.zoom * (1 - ev.deltaY * .002));
  pintarRetrato();
  guardar();
}, { passive: false });

// ===== Inicio =====
$('#version').textContent = VERSION;
construirCaracteristicas();
if (location.hash) history.replaceState(null, '', location.pathname + location.search);
pintarLista();

if (navigator.storage && navigator.storage.persist) navigator.storage.persist();
if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
  navigator.serviceWorker.register('sw.js');
}
