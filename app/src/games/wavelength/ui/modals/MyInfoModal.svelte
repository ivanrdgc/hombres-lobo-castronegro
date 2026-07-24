<script lang="ts">
  // Lo que hay detrás de la pastilla flotante. En un juego de EQUIPO (B34) la
  // «carta» ya vive en la pantalla —el objetivo lo tiene el Psíquico en su dial
  // y el papel de la ronda lo dice la cabecera—, así que aquí NO se repite nada
  // de lo que está fuera: ni tu papel, ni el espectro, ni los puntos. Solo las
  // reglas, que son lo único que no cabe en la pantalla de partida.
  import { app } from '../../../../core/sync/store.svelte';
  import RefRows from '../../../../shell/RefRows.svelte';

  const rows = [
    { emoji: '🔮', name: 'El Psíquico', note: 'rota cada ronda', desc: 'Solo él ve el objetivo, en su móvil y tapado (aparece mientras mantiene pulsado). Da UNA pista en voz alta que caiga justo ahí y puede escribirla para que la mesa la relea. Después calla: ni aclaraciones, ni gestos, ni tocar el dial.' },
    { emoji: '🎚️', name: 'El equipo', desc: 'Debate la pista y mueve la marca, que es COMPARTIDA: la misma en todos los móviles. Cuando hay acuerdo, la fija uno por todos (pide dos toques). El Psíquico no participa.' },
    { emoji: '📏', name: 'El dial', note: 'de 0 a 100', desc: '0 es el extremo izquierdo del espectro, 100 el derecho y 50 el centro justo. Cuando la app dice «el objetivo estaba en 82», habla de esa escala.' },
    { emoji: '🎯', name: 'Puntos por cercanía', desc: 'Alrededor del objetivo hay una diana de ±15 que solo ve el Psíquico: su centro vale 4 puntos, la parte media 3 y la exterior 2. Fuera, 0. Suman al total del equipo y a la cuenta del Psíquico de la ronda.' },
    { emoji: '🙈', name: 'Nadie mira el móvil del Psíquico', desc: 'Su pantalla no la puede ver nadie, tampoco los suyos: si alguien le ve el objetivo, la ronda ya no vale. El resto de pantallas son públicas y se ven iguales.' },
    { emoji: '⏭️', name: 'Salidas del menú ⋯', desc: '«Saltar ronda» la anula sin puntuar y pasa el turno (la pulsa cualquiera). «Terminar» cierra la partida para todos y borra los puntos.' },
  ];
</script>

<RefRows title="📖 Reglas de Wavelength" {rows} />
<button class="primary block" style="margin-top:14px" data-a="close-modal" onclick={() => (app.ui.modal = null)}>Cerrar</button>
