// Higiene de estado efímero (port del bloque onChange de main.js v1): al
// cambiar el contexto de juego se limpia la selección, avisos y modales de
// lobby; Enter en un input pulsa el botón principal de su tarjeta.
import { onChange, state } from '../core/sync/store.svelte';

function contextSignature(): string {
  const g = state.group?.game;
  if (!g) return state.group ? state.group.status : 'none';
  return [g.phase, g.night, g.stepIdx, g.dayNum, g.votesLeft, (g.pending || []).length,
    ((g.pending || [])[0] || {}).type || '', g.roleRefresh ? 'rr' : '', g.refreshNonce || 0, g.paused ? 'p' : ''].join(':');
}

export function installUiHygiene(): void {
  let lastCtx = '';
  onChange(() => {
    const ctx = contextSignature();
    if (ctx === lastCtx) return;
    lastCtx = ctx;
    // Navegación del lobby: al entrar en el lobby se «congela» qué mira este
    // dispositivo (según el juego seleccionado de la mesa), y a partir de ahí
    // los cambios remotos ya no le mueven de pantalla. Al empezar la partida se
    // olvida, para que al volver al lobby se recoloque en el lobby del juego.
    if (state.group && state.group.status === 'lobby') {
      // La página principal del grupo es SIEMPRE la mesa (dispositivos, voz,
      // catálogo). Al lobby de un juego se entra a mano («Jugar a esto»), aunque
      // el grupo ya tenga un juego seleccionado de una vez anterior.
      if (state.ui.lobbyView === undefined) state.ui.lobbyView = 'catalog';
    } else if (state.group && state.group.status === 'playing') {
      state.ui.lobbyView = undefined;
    }
    state.ui.sel = null;
    state.ui.actorPower = null;
    state.ui.brujaHeal = false;
    state.ui.narratorWho = false; // el «¿quién es?» se oculta al cambiar de paso
    state.ui.refreshOpen = false;
    state.ui.revealOpen = false;
    if (state.group && state.group.status === 'playing') {
      // Los avisos tipo «selecciona primero a un jugador» caducan al cambiar
      // de fase o de paso (fuera de partida se conservan: p. ej. «grupo eliminado»).
      state.flash = null;
      state.ui.formError = null;
    }
    if (state.ui.modal && ['view-roles', 'manual-player'].includes(state.ui.modal.type) === false
      && state.group && state.group.status === 'playing') {
      // los modales de lobby se cierran si empieza/acaba una partida
      if (['roles', 'settings', 'player-menu'].includes(state.ui.modal.type)) state.ui.modal = null;
    }
  });

  // Enter en un input pulsa el botón principal de su tarjeta.
  document.addEventListener('keydown', (ev) => {
    if (ev.key !== 'Enter' || !(ev.target instanceof HTMLInputElement)) return;
    const card = ev.target.closest('.card, .modal');
    const primary = card && card.querySelector<HTMLButtonElement>('button.primary');
    if (primary) primary.click();
  });
}
