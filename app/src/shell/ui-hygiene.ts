// Higiene de estado efímero (port del bloque onChange de main.js v1): al
// cambiar el contexto de juego se limpia la selección, avisos y modales de
// lobby; Enter en un input pulsa el botón principal de su tarjeta.
import { applyRoute, onChange, state } from '../core/sync/store.svelte';

function contextSignature(): string {
  const g = state.group?.game;
  if (!g) return state.group ? state.group.status : 'none';
  return [g.phase, g.night, g.stepIdx, g.dayNum, g.votesLeft, (g.pending || []).length,
    ((g.pending || [])[0] || {}).type || '', g.roleRefresh ? 'rr' : '', g.refreshNonce || 0, g.paused ? 'p' : ''].join(':');
}

export function installUiHygiene(): void {
  let lastCtx = '';
  let lastStatusKey = ''; // «slug|status»: el cambio de grupo no es una transición
  onChange(() => {
    const ctx = contextSignature();
    if (ctx === lastCtx) return;
    lastCtx = ctx;
    // Al TERMINAR una partida (playing → lobby en el MISMO grupo), todos los
    // dispositivos aterrizan en el lobby del juego recién jugado (listos para
    // la revancha), vengan de donde vengan (/g/x, /empezar…). replaceState:
    // sin ensuciar el historial; la URL sigue mandando a partir de ahí.
    const slug = state.route.slug ?? '';
    const status = state.group?.status ?? '';
    const endedGame = slug && lastStatusKey === slug + '|playing' && status === 'lobby'
      ? state.group?.currentGame : null;
    lastStatusKey = slug + '|' + status;
    if (endedGame) {
      const target = `/g/${slug}/${endedGame}`;
      if (location.pathname !== target) {
        history.replaceState(null, '', target);
        applyRoute();
      }
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
