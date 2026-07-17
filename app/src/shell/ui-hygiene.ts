// Higiene de estado efímero (port del bloque onChange de main.js v1): al
// cambiar el contexto de juego se limpia la selección, avisos y modales de
// lobby; Enter en un input pulsa el botón principal de su tarjeta.
import { applyRoute, onChange, state } from '../core/sync/store.svelte';

function contextSignature(): string {
  const g = state.group?.game;
  if (!g) return state.group ? state.group.status : 'none';
  // Campos de El Espía (undefined en Hombres Lobo: inofensivos en la firma).
  const e = g as unknown as { round?: number; voteSeq?: number; timeupTurn?: number | null };
  return [g.phase, g.night, g.stepIdx, g.dayNum, g.votesLeft, (g.pending || []).length,
    ((g.pending || [])[0] || {}).type || '', g.roleRefresh ? 'rr' : '', g.refreshNonce || 0, g.paused ? 'p' : '',
    e.round ?? '', e.voteSeq ?? '', e.timeupTurn ?? ''].join(':');
}

export function installUiHygiene(): void {
  let lastCtx = '';
  let lastStatusKey = ''; // «slug|status»: el cambio de grupo no es una transición
  onChange(() => {
    const ctx = contextSignature();
    if (ctx === lastCtx) return;
    lastCtx = ctx;
    // Transiciones de partida en el MISMO grupo (replaceState: sin ensuciar el
    // historial; la URL sigue mandando a partir de ahí):
    //  · lobby → playing: los miembros aterrizan en /g/<mesa>/<juego>/partida
    //    (la partida es su propia página).
    //  · playing → lobby: todos al lobby del juego recién jugado, vengan de
    //    donde vengan (/g/x, /empezar…), listos para la revancha.
    const slug = state.route.slug ?? '';
    const status = state.group?.status ?? '';
    const gameId = state.group?.currentGame;
    const member = !!state.session && state.players.some((p) => p.id === state.session!.pid);
    const target = slug && gameId && member
      ? (lastStatusKey === slug + '|playing' && status === 'lobby' ? `/g/${slug}/${gameId}`
        : lastStatusKey === slug + '|lobby' && status === 'playing' ? `/g/${slug}/${gameId}/partida` : null)
      : null;
    lastStatusKey = slug + '|' + status;
    if (target && location.pathname !== target) {
      history.replaceState(null, '', target);
      applyRoute();
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
