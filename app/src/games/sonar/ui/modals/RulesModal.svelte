<script lang="ts">
  // 📖 REGLAS — lo que abre la pastilla flotante (B34 · una sola puerta).
  // Captain Sonar es de EQUIPO: la «carta» de la tripulación (submarino,
  // posición, estela, energía y cuaderno) YA está en la consola, así que aquí
  // no se repite ni una vez. Esta ventana es solo la referencia que no cambia:
  // cómo se gana, qué es secreto y qué hace cada acción. Vale igual para quien
  // juega y para quien mira, y en cualquier fase.
  import { app } from '../../../../core/sync/store.svelte';
  import { MAX_ENERGY, MAX_HP } from '../../engine';
  import { H, W } from '../../map';
  import { ACTION_REF, ACTIONS_TITLE } from '../../texts';
  import RefRows from '../../../../shell/RefRows.svelte';

  const BASICS = [
    {
      emoji: '🎯', name: 'Cómo se gana',
      desc: `Hundiendo al rival: cada submarino aguanta ${MAX_HP} de daño ❤️. No hay empate — si un mismo torpedo hunde a los dos, gana el que NO disparó.`,
    },
    {
      emoji: '🔄', name: 'El turno', note: 'una acción y pasa',
      desc: 'Turnos alternos: UNA sola acción por turno. La pulsa cualquiera de la tripulación, pero se decide entre todos.',
    },
    {
      emoji: '🔒', name: 'Qué es secreto', note: 'y qué no',
      desc: 'Secretos: vuestra casilla y vuestra estela. Públicos: la vida ❤️, la energía ⚡ y todo lo que se canta en alto (rumbos, torpedos, dron y emersiones).',
    },
    {
      emoji: '⚡', name: 'La energía', note: `tope ${MAX_ENERGY}`,
      desc: 'Solo se carga navegando: +1 por casilla. Los sistemas solo gastan, así que cada disparo se paga con turnos de navegación… y con rumbos cantados.',
    },
    {
      emoji: '🗺️', name: 'El mapa', note: `${W}×${H} con islas`,
      desc: 'Cada submarino salió de las 3 columnas de su lado: el Rojo 🔴 de la A, la B o la C; el Azul 🔵 de la F, la G o la H. Es por donde empieza la triangulación.',
    },
  ];
</script>

<h3 style="margin:0 0 4px">📖 Reglas de Captain Sonar</h3>
<p class="small-note" style="margin:0">Solo lo que no cambia. Lo de vuestra tripulación —submarino, casilla, estela, energía y cuaderno— no se repite aquí: vive en la consola, detrás de esta ventana.</p>
<RefRows title="⚓ Lo esencial" rows={BASICS} />
<RefRows title={ACTIONS_TITLE} rows={ACTION_REF} />
<button class="primary block" style="margin-top:14px" data-a="close-modal" onclick={() => (app.ui.modal = null)}>Cerrar</button>
