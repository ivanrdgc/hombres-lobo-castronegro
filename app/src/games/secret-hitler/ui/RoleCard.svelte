<script lang="ts">
  // Tu carta: bando + el CONOCIMIENTO que la app calcula en oculto (los
  // fascistas se reconocen entre sí y saben quién es Hitler; el Hitler ciego con
  // 7+ jugadores).
  //
  // Postura 🍽️ MESA (B28): esta carta NUNCA se pinta en la pantalla de la fase
  // —vive dentro de la cortina de privacidad— y aquí se dibuja NEUTRA: mismo
  // marco, mismos colores y la MISMA ALTURA para liberal, fascista e Hitler.
  // Antes el borde iba teñido por bando (rojo/azul) y el panel fascista era dos
  // líneas más largo: de reojo, desde la silla de al lado, eso delataba el bando
  // sin leer una sola palabra.
  import { ROLE_LABEL, knowledgeOf } from '../roles';
  import type { SHState } from '../types';

  const { game, pid, note = '' }: { game: SHState; pid: string; note?: string } = $props();

  const k = $derived(knowledgeOf(game.roles, game.playerIds, pid));
  const nm = (p: string) => game.names[p] || '¿?';

  // Lo que sabes, SIEMPRE en dos líneas dentro de un bloque de alto mínimo fijo:
  // que el fascista tenga compañeros y el liberal no, no puede notarse en la
  // silueta de la tarjeta.
  const knows = $derived.by((): [string, string] => {
    const kn = k.knows;
    if (kn.kind === 'fascist-team') return [
      `🐷 Tus fascistas: ${kn.fascists.length ? kn.fascists.map(nm).join(', ') : 'ninguno más, vas solo'}.`,
      `💀 Hitler es ${nm(kn.hitler)}: protegedlo sin cantarlo y coladlo de Canciller con 3 decretos fascistas.`,
    ];
    if (kn.kind === 'hitler-knows') return [
      `🐷 Tu fascista de confianza: ${kn.fascists.map(nm).join(', ')}.`,
      '💀 Hazte pasar por liberal: si te ejecutan, la República gana.',
    ];
    if (kn.kind === 'hitler-blind') return [
      '🐷 Con 7 o más NO sabes quiénes son tus fascistas; ellos sí te conocen.',
      '💀 Hazte pasar por liberal: si te ejecutan, la República gana.',
    ];
    return [
      '🕊️ No conoces el bando de nadie: deduce por los votos y los decretos.',
      '🗳️ Ojo a quién llega a Canciller con 3 decretos fascistas: si es Hitler, se acabó.',
    ];
  });
</script>

<div class="rolecard" data-a="sh-rolecard">
  <span class="remoji">{k.role === 'hitler' ? '💀' : k.role === 'fascist' ? '🐷' : '🕊️'}</span>
  <span class="rname">{ROLE_LABEL[k.role]}</span>
  <div class="rteam">{k.faction === 'fascist' ? 'Bando fascista' : 'Bando liberal'}</div>
  <div class="rextra knows">
    <p>{knows[0]}</p>
    <p>{knows[1]}</p>
  </div>
  {#if note}<p class="small-note rnote">{note}</p>{/if}
</div>

<style>
  /* Alto mínimo común (y los cuatro textos, de largo parecido): las tres cartas
     miden lo mismo, que es lo que se lee de lejos. */
  .knows { min-height: 6.8em; text-align: left; display: flex; flex-direction: column; justify-content: center; gap: 7px; }
  .knows p { margin: 0; line-height: 1.35; }
  .rnote { margin-top: 10px; }
</style>
