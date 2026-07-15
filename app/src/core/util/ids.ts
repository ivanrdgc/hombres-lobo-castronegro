// Identificadores de la v1, portados SIN CAMBIOS: los ids de los docs de
// Firestore derivan de estos (groups/{slugify(nombre)}, players/p-{slugify}).
// Cambiarlos rompería la compatibilidad con los grupos existentes.

export function slugify(name: string): string {
  return name.normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40);
}

export function randomId(prefix: string): string {
  return prefix + '_' + Math.random().toString(36).slice(2, 10) + Math.random().toString(36).slice(2, 6);
}

export function playerIdFor(name: string): string | null {
  const s = slugify(name || '');
  return s ? 'p-' + s : null;
}
