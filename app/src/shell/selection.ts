// Selección genérica en listas de jugadores (port del handler 'sel' de la v1):
// una única selección viva, con clave de contexto y máximo de elegidos.
import { state } from '../core/sync/store.svelte';

export function selIds(key: string): string[] {
  return state.ui.sel && state.ui.sel.key === key ? state.ui.sel.ids : [];
}

export function toggleSel(key: string, pid: string, max = 1): void {
  let cur = state.ui.sel && state.ui.sel.key === key ? state.ui.sel.ids.slice() : [];
  if (cur.includes(pid)) cur = cur.filter((x) => x !== pid);
  else {
    cur.push(pid);
    while (cur.length > max) cur.shift();
  }
  state.ui.sel = { key, ids: cur };
}

export function sel1(key: string): string | null {
  return selIds(key)[0] || null;
}

export function clearSel(): void {
  state.ui.sel = null;
}
