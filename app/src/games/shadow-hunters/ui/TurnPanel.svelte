<script lang="ts">
  // Turno: elige UNA acción — pista secreta, atacar (dados), descansar o
  // revelarte y usar tu poder. En pasos y con todo delante (B25/B26):
  //   1) Las cuatro acciones como tarjetas con su efecto Y lo que arriesgan.
  //   2) Elegida una: qué va a pasar, el objetivo (con su vida y lo que se sabe
  //      de él) y un botón final que NOMBRA la consecuencia. Todo reversible.
  //   3) Plegada al fondo, la chuleta de los 8 personajes y las 8 pistas.
  // 🍽️ MESA (B28): una pasada anterior clavaba TU carta (personaje, bando y
  // poder) arriba del panel, y el panel se queda abierto sobre la mesa mientras
  // piensas: era el chivato más caro del juego. Ni el panel ni el botón de
  // confirmar nombran tu personaje.
  // B34: la pasada siguiente lo arregló metiendo AQUÍ un segundo «👁 ver mi
  // carta» dentro del paso de revelarte — otra puerta a lo mismo. Tu carta se
  // abre desde un único sitio, la pastilla 🎴, que está fija en pantalla y no se
  // lleva por delante la acción elegida: el panel solo dice dónde está.
  import { guard } from '../../../core/sync/guard';
  import * as A from '../actions';
  import { isAlive, charOf } from '../engine';
  import { CHARS, FACTION_SHORT, charRefRows, pistaRefRows } from '../chars';
  import RefRows from '../../../shell/RefRows.svelte';
  import type { PlayerDoc } from '../../../core/sync/schema';
  import type { ShadowHState } from '../types';

  const { game, my }: { game: ShadowHState; my: PlayerDoc } = $props();
  const nm = (pid: string) => game.names[pid] || '¿?';
  const others = $derived(game.playerIds.filter((pid) => pid !== my.id && isAlive(game, pid)));
  const c = $derived(charOf(game, my.id));
  const hp = $derived(game.hp[my.id]);
  const revealed = $derived(game.revealed[my.id]);
  const full = $derived(hp >= game.maxHp);

  type Mode = 'pista' | 'attack' | 'rest' | 'reveal';
  let mode = $state<Mode | null>(null);
  let tgt = $state<string | null>(null);
  // Al cambiar de acción, el objetivo elegido se olvida.
  $effect(() => { void mode; tgt = null; });

  // Fuka es la única que puede elegirse a sí misma (su poder cura).
  const revealTargets = $derived(c.id === 'fuka' ? [my.id, ...others] : others);
  const needsTarget = $derived(mode === 'pista' || mode === 'attack' || (mode === 'reveal' && c.powerTarget));
  const targets = $derived(mode === 'reveal' ? revealTargets : others);
  const canGo = $derived(!!mode && (!needsTarget || !!tgt));

  const ACTS = $derived([
    {
      id: 'pista' as Mode, emoji: '🔮', name: 'Dar una pista', ask: '¿A quién le das la pista?',
      what: 'La app roba 1 de las 8 pistas y se la enseña EN SECRETO a quien elijas: esa persona sufre su efecto (pierde o cura 1 punto de vida, según su bando) y la pista la leéis solo ella y tú.',
      risk: 'La mesa solo oye el resultado, así que tú deduces algo que nadie más sabe… y ella sabe que lo sabes. Si la pista la deja a 0, muere.',
      off: false, why: '',
    },
    {
      id: 'attack' as Mode, emoji: '⚔️', name: 'Atacar', ask: '¿A quién atacas?',
      what: 'La app tira un dado de 6 y otro de 4: el daño es su DIFERENCIA, de 0 a 5 (1,8 de media).',
      risk: 'Si los dados empatan fallas, y pasa 1 de cada 6 veces. Además atacar te señala: la mesa entera ve a quién pegas.',
      off: false, why: '',
    },
    {
      // 💊 y no 💤: es el mismo emoji con el que el diario canta el descanso y
      // con el que lo nombran la ayuda y el tutorial (un nombre por cosa).
      id: 'rest' as Mode, emoji: '💊', name: 'Descansar', ask: '',
      what: full
        ? `Recuperarías 1 punto de vida, pero ya estás al máximo (${hp} de ${game.maxHp}): no te curaría nada.`
        : `Recuperas 1 punto de vida: pasas de ${hp} a ${hp + 1} de ${game.maxHp}.`,
      risk: 'No arriesgas nada y no delatas nada… pero gastas el turno entero.',
      off: false, why: '',
    },
    {
      id: 'reveal' as Mode, emoji: '🎭', name: 'Revelarte y usar tu poder',
      ask: '¿Sobre quién usas tu poder?',
      // Sin tu nombre de personaje: el panel se queda abierto encima de la mesa.
      what: 'Tu identidad pasa a ser PÚBLICA para siempre: la mesa sabrá qué personaje eres y de qué bando. En el acto usas TU poder, de un solo uso.',
      risk: 'Tu bando sabrá que estás con él… y el contrario, a quién tiene que atacar.',
      off: revealed, why: 'Ya te revelaste: tu poder era de un solo uso y ya está gastado.',
    },
  ]);
  const act = $derived(ACTS.find((a) => a.id === mode) || null);

  // Lo que se sabe EN PÚBLICO de cada posible objetivo: su vida y, si ya se
  // destapó, su bando. Elegir víctima sin esto obligaba a subir al tablero.
  const pub = (pid: string) => {
    const life = `❤️ ${game.hp[pid]} de ${game.maxHp}`;
    if (!game.revealed[pid]) return `${life} · ❓ sin destapar`;
    const ch = CHARS[game.chars[pid]];
    return `${life} · ${ch.emoji} ${ch.name} · ${FACTION_SHORT[ch.faction]}`;
  };

  const goLabel = $derived.by(() => {
    if (!mode) return '';
    if (mode === 'pista') return `🔮 Dar la pista a ${tgt ? nm(tgt) : '…'}`;
    if (mode === 'attack') return `⚔️ Atacar a ${tgt ? nm(tgt) : '…'}`;
    if (mode === 'rest') return '💤 Descansar y recuperar 1 punto de vida';
    // «Revelarte como Vampiro» en el botón más grande de la pantalla era el
    // chivato definitivo: la consecuencia se nombra sin decir quién eres.
    if (!needsTarget) return '🎭 Revelar tu identidad y usar tu poder';
    return `🎭 Revelar tu identidad y usar tu poder sobre ${tgt ? (tgt === my.id ? 'ti' : nm(tgt)) : '…'}`;
  });
  // Una línea en claro con lo que va a ocurrir al confirmar.
  const preview = $derived.by(() => {
    const t = tgt ? (tgt === my.id ? 'ti' : nm(tgt)) : '';
    if (mode === 'pista' && tgt) return `${nm(tgt)} recibirá una pista que solo leeréis ${nm(tgt)} y tú; la mesa verá si pierde vida, se cura o no le pasa nada.`;
    if (mode === 'attack' && tgt) return `${nm(tgt)} (${pub(tgt)}) recibirá de 0 a 5 de daño… o ninguno si los dados empatan.`;
    if (mode === 'rest') return full ? `Sigues con ${hp} de ${game.maxHp}: gastas el turno sin ganar vida.` : `Subes a ${hp + 1} de ${game.maxHp} puntos de vida.`;
    if (mode === 'reveal') return `Toda la mesa verá tu personaje y tu bando, para siempre${needsTarget && t ? `, y tu poder caerá sobre ${t}` : ''}.`;
    return '';
  });

  function go() {
    if (!mode || !canGo) return;
    // La elección NO se borra hasta que la acción ha viajado: si la transacción
    // se descarta (partida en pausa, red lenta), el panel sigue como estaba en
    // vez de devolverte al menú sin explicación.
    const m = mode; const t = tgt; const conObjetivo = needsTarget;
    guard(async () => {
      if (m === 'pista') await A.givePista(t!);
      else if (m === 'attack') await A.attack(t!);
      else if (m === 'rest') await A.rest();
      else await A.revealSelf(conObjetivo ? t : null);
      mode = null; tgt = null;
    });
  }
</script>

<div class="actionpanel">
  <h3>🎬 Te toca: elige UNA acción</h3>

  {#if !mode}
    <p class="hint" style="margin:10px 0 8px">Toca una acción para ver qué hace; después eliges a quién y lo confirmas. Tu carta sigue tapada: si la necesitas está donde siempre, en la pastilla 🎴 Mi carta de abajo a la derecha.</p>
    <div class="shacts">
      {#each ACTS as a (a.id)}
        <button class="shact {a.off ? 'off' : ''}" data-a={`sh-mode-${a.id}`} disabled={a.off} onclick={() => (mode = a.id)}>
          <span class="aemo">{a.emoji}</span>
          <span class="aname">{a.name}</span>
          <span class="awhat">{a.what}</span>
          <span class="arisk">{a.off ? `🔒 ${a.why}` : `⚠️ ${a.risk}`}</span>
        </button>
      {/each}
    </div>
  {:else if act}
    <div class="shchosen">
      <div class="chead"><span class="aemo">{act.emoji}</span><span class="aname">{act.name}</span></div>
      <div class="awhat">{act.what}</div>
      <div class="arisk">⚠️ {act.risk}</div>
    </div>
    {#if mode === 'reveal'}
      <!-- Es la única decisión que pide tu carta… y por eso mismo NO se abre una
           segunda puerta aquí (B34): se dice dónde está la única que hay. Abrir
           la pastilla es un modal encima, así que al cerrarla sigues en este
           paso con la acción (y el objetivo) tal y como los dejaste. -->
      <p class="small-note" style="margin:10px 0 0">¿No recuerdas qué poder vas a gastar? Míralo en la pastilla 🎴 Mi carta, abajo a la derecha: al cerrarla vuelves aquí, con esta acción todavía elegida.</p>
    {/if}
    <button class="ghost block small" style="margin:8px 0" data-a="sh-back" onclick={() => (mode = null)}>↩️ Cambiar de acción</button>

    {#if needsTarget}
      <p class="small-note" style="margin:10px 0 4px"><b>{act.ask}</b></p>
      <div class="shtargets">
        {#each targets as pid (pid)}
          <button class="shtarget {tgt === pid ? 'sel' : ''}" data-a={`sh-${mode}-target`} data-p={pid} onclick={() => (tgt = pid)}>
            <span class="tname">{tgt === pid ? '✅ ' : ''}{pid === my.id ? 'Tú mismo' : nm(pid)}</span>
            <span class="tstat">{pub(pid)}</span>
          </button>
        {/each}
      </div>
    {:else if mode === 'reveal'}
      <p class="small-note" style="margin-top:10px">Tu poder no elige objetivo: solo confirma.</p>
    {:else}
      <p class="small-note" style="margin-top:10px">Descansar no elige objetivo: solo confirma.</p>
    {/if}

    {#if preview}<p class="small-note" style="margin:12px 0 4px">▶️ Al confirmar: <b>{preview}</b></p>{/if}
    <button class="primary block" data-a="sh-do" disabled={!canGo} onclick={go}>{goLabel}</button>
    {#if !canGo}<p class="small-note" style="margin-top:6px">Elige antes a quién: sin objetivo no se puede confirmar.</p>{/if}
  {/if}

  <!-- Referencia al pie y plegada: nadie debería salir de la pantalla en la que
       está decidiendo. Aquí vive «cómo se gana»; el reparto («Sois 5: 2 y 2…»)
       NO se repite, que está justo debajo, bajo el tablero (un dato, un sitio). -->
  <details class="shref">
    <summary data-a="sh-ref">📖 Consultar: cómo se gana, los 8 personajes y las 8 pistas</summary>
    <p class="small-note" style="margin:8px 0 0">🏹 Los Cazadores ganan cuando no queda ninguna 🌑 Sombra en pie; las Sombras, cuando no queda ningún Cazador. Los 🧭 neutrales van a lo suyo.</p>
    <RefRows title="🎭 Los 8 personajes posibles" rows={charRefRows()} />
    <RefRows title="🔮 Las 8 pistas posibles" rows={pistaRefRows()} />
    <p class="small-note" style="margin-top:8px">Siempre son estas ocho: cuatro quitan 1 punto de vida y cuatro lo curan, según el bando de quien la recibe.</p>
  </details>
</div>

<style>
  .shacts { display: flex; flex-direction: column; gap: 8px; }
  .shact {
    display: grid; grid-template-columns: auto 1fr; column-gap: 10px; row-gap: 2px;
    width: 100%; text-align: left; min-height: 44px; padding: 11px 12px;
    border-radius: var(--r-2); border: 1px solid var(--border); background: var(--card2); color: inherit;
  }
  .shact.off { opacity: 0.6; border-style: dashed; }
  .aemo { grid-row: 1 / 3; font-size: 1.6rem; align-self: start; }
  .aname { font-size: 1.02rem; font-weight: 700; color: var(--moon); }
  .awhat { font-size: 0.84rem; color: var(--text); white-space: normal; }
  .arisk { grid-column: 2; font-size: 0.78rem; color: var(--muted); white-space: normal; margin-top: 2px; }
  .shchosen {
    padding: 12px; border-radius: var(--r-2);
    border: 1px solid var(--accent); background: color-mix(in srgb, var(--accent) 12%, var(--card2));
  }
  .chead { display: flex; align-items: center; gap: 8px; }
  .shchosen .aemo { font-size: 1.5rem; }
  .shchosen .awhat, .shchosen .arisk { display: block; margin-top: 6px; }

  .shtargets { display: flex; flex-direction: column; gap: 6px; }
  .shtarget {
    display: flex; align-items: center; justify-content: space-between; gap: 10px; flex-wrap: wrap;
    width: 100%; min-height: 44px; padding: 9px 12px; text-align: left;
    border-radius: var(--r-2); border: 1px solid var(--border); background: var(--card2); color: inherit;
  }
  .shtarget.sel { border-color: var(--accent); background: color-mix(in srgb, var(--accent) 16%, var(--card2)); }
  .tname { font-weight: 700; font-size: 0.92rem; }
  .tstat { font-size: 0.8rem; color: var(--muted); }

  .shref { margin-top: 14px; border-top: 1px solid var(--border); padding-top: 8px; }
  .shref summary { cursor: pointer; font-size: 0.88rem; color: var(--accent); min-height: 24px; }
</style>
