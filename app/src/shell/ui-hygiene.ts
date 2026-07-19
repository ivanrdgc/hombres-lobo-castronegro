// Higiene de estado efímero (port del bloque onChange de main.js v1): al
// cambiar el contexto de juego se limpia la selección, avisos y modales de
// lobby; Enter en un input pulsa el botón principal de su tarjeta. Con varias
// partidas por mesa, el contexto es LA PARTIDA de este dispositivo (la que
// juega/narra, o la que mira por URL) y la URL se recoloca al entrar o salir.
import { applyRoute, ctxMatch, myMatch, onChange, state } from '../core/sync/store.svelte';

function contextSignature(): string {
  const m = ctxMatch();
  const g = m?.game;
  if (!m || !g) return state.group ? 'lobby' : 'none';
  // Campos de El Espía (undefined en Hombres Lobo: inofensivos en la firma).
  const e = g as unknown as { round?: number; voteSeq?: number; timeupTurn?: number | null };
  return [m.id, g.phase, g.night, g.stepIdx, g.dayNum, g.votesLeft, (g.pending || []).length,
    ((g.pending || [])[0] || {}).type || '', g.roleRefresh ? 'rr' : '', g.refreshNonce || 0, g.paused ? 'p' : '',
    e.round ?? '', e.voteSeq ?? '', e.timeupTurn ?? ''].join(':');
}

export function installUiHygiene(): void {
  let lastCtx = '';
  // Última partida propia vista por este dispositivo: «slug|mid|gameId».
  let lastMine: { slug: string; mid: string; gameId: string } | null = null;
  onChange(() => {
    const slug = state.route.slug ?? '';
    const mine = myMatch();

    // Recolocación de URL con replaceState (sin ensuciar el historial):
    //  · Estoy en una partida → su URL es /g/<mesa>/<juego>/partida/<mid>.
    //  · Mi partida terminó → al lobby de ese juego, listo para la revancha.
    //  · Miraba una partida ajena que ya no existe → al lobby de ese juego.
    let target: string | null = null;
    if (slug && mine) {
      target = `/g/${slug}/${mine.gameId}/partida/${mine.id}`;
      lastMine = { slug, mid: mine.id, gameId: mine.gameId };
    } else if (lastMine && lastMine.slug === slug && state.matchesReady) {
      target = `/g/${slug}/${lastMine.gameId}`;
      lastMine = null;
    } else if (!slug) {
      lastMine = null;
    } else if (state.route.matchId && state.matchesReady
      && !state.matches.some((m) => m.id === state.route.matchId)) {
      target = `/g/${slug}/${state.route.game}`;
    }
    if (target && location.pathname !== target) {
      history.replaceState(null, '', target);
      applyRoute();
    }

    const ctx = contextSignature();
    if (ctx === lastCtx) return;
    lastCtx = ctx;
    state.ui.sel = null;
    state.ui.actorPower = null;
    state.ui.brujaHeal = false;
    state.ui.narratorWho = false; // el «¿quién es?» se oculta al cambiar de paso
    state.ui.refreshOpen = false;
    state.ui.revealOpen = false;
    const inMatch = !!ctxMatch();
    if (inMatch) {
      // Los avisos tipo «selecciona primero a un jugador» caducan al cambiar
      // de fase o de paso (fuera de partida se conservan: p. ej. «grupo eliminado»).
      state.flash = null;
      state.ui.formError = null;
    }
    if (state.ui.modal && ['view-roles', 'manual-player'].includes(state.ui.modal.type) === false && inMatch) {
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
