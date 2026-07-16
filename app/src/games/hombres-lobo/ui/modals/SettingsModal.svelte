<script lang="ts">
  // Ajustes de partida: filas con interruptor (port de settingsModal v1).
  import { app } from '../../../../core/sync/store.svelte';
  import { guard } from '../../../../core/sync/guard';
  import * as A from '../../actions';
  import { OFFICIAL_MIN_PLAYERS } from '../../roles';
  import type { TableSettings } from '../../../../core/sync/schema';

  const s = $derived((app.group?.settings || {}) as Record<string, unknown>);

  const ROWS: { k: string; name: string; desc: string }[] = [
    { k: 'revealDead', name: '💀 Revelar rol al morir', desc: 'Al eliminar a alguien se anuncia qué rol tenía (regla oficial).' },
    { k: 'showComposition', name: '🎴 Composición pública', desc: 'Al empezar se anuncia qué cartas hay en juego (como en el juego de mesa).' },
    { k: 'primeraNocheTranquila', name: '🌙 Primera noche sin sangre', desc: 'La primera noche los lobos se reconocen y los roles actúan, pero nadie es devorado.' },
    { k: 'videnteSoloBando', name: '🔮 La vidente solo ve el bando', desc: 'En vez del rol exacto, la vidente solo descubre si el jugador es hombre lobo o no.' },
    { k: 'ocultarCausas', name: '🌫️ Ocultar causas de muerte', desc: 'Las muertes nocturnas no explican si fueron los lobos, la bruja u otra cosa: solo quién ha muerto.' },
    { k: 'casual', name: '🎲 Modo casual', desc: `Permite jugar con menos de ${OFFICIAL_MIN_PLAYERS} jugadores (mínimo 3), fuera de las reglas oficiales (8-18 + narrador).` },
  ];

  function toggleSetting(k: string) {
    guard(() => A.setSettings({ [k]: !s[k] } as Partial<TableSettings>));
  }
</script>

<h3>🔧 Ajustes de partida</h3>
{#each ROWS as row (row.k)}
  <div class="settingrow"><div class="sinfo"><div class="sname">{row.name}</div><div class="sdesc">{row.desc}</div></div>
  <div class="switch {s[row.k] ? 'on' : ''}" data-a="toggle-setting" data-p={row.k}
    onclick={() => toggleSetting(row.k)}
    role="switch" aria-checked={!!s[row.k]} aria-label={row.name} tabindex="0"
    onkeydown={(e) => { if (e.key === 'Enter') toggleSetting(row.k); }}></div></div>
{/each}
<!-- Ritmo: descripción a ancho completo y las opciones en su propia fila
     (apretadas al lado del texto quedaban en columna y comían media pantalla). -->
<div class="settingrow" style="display:block">
  <div class="sinfo">
    <div class="sname">🎚️ Ritmo del narrador</div>
    <div class="sdesc">Pausas Y cantidad de narración. ⚡ Rápido: pausas cortas y solo lo esencial. 🎭 Teatral: pausas amplias, más ambientación y llamadas dramatizadas. Las esperas de disimulo no cambian nunca (no delatan nada).</div>
  </div>
  <div class="btnrow" style="margin-top:8px">
    {#each [['rapido', '⚡ Rápido'], ['normal', '🌙 Normal'], ['teatral', '🎭 Teatral']] as [k, label] (k)}
      <button
        class="small {((s.pacing as string) || 'teatral') === k ? 'primary' : 'ghost'}"
        style="flex:1;min-width:90px"
        data-a="set-pacing"
        data-p={k}
        onclick={() => guard(() => A.setSettings({ pacing: k as string }))}
      >{label}</button>
    {/each}
  </div>
</div>
<button class="ghost block" data-a="reset-settings" onclick={() => guard(() => A.resetGameSettings())}>↩️ Restaurar ajustes por defecto</button>
<button class="primary block" data-a="close-modal" onclick={() => (app.ui.modal = null)}>✔️ Listo</button>
