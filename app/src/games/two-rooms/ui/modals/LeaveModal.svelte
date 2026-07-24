<script lang="ts">
  // Salida ELEGANTE: la partida sigue sin el que se va (sus votos se anulan);
  // el texto es idéntico para todos — no delata si eres Presidente/Bombardero.
  import { app } from '../../../../core/sync/store.svelte';
  import { guard } from '../../../../core/sync/guard';
  import * as A from '../../actions';
</script>

<h3>🚪 ¿Dejar la partida?</h3>
<p class="small-note">La partida SIGUE sin ti: tus votos de rehén se anulan y tu hueco desaparece. Si aún estabais en el reparto, se reparte de nuevo entre los demás.</p>
<p class="small-note">⚠️ Eso sí: si eres el Presidente o el Bombardero, tu bando se rinde y gana el otro en el acto. Y si quedáis menos de 6, la partida se disuelve sin ganador.</p>
<button class="danger block" data-a="tr-leave-confirm" onclick={() => guard(async () => { await A.leaveTwoRooms(); app.ui.modal = null; })}>🚪 Sí, dejar la partida</button>
<button class="ghost block" data-a="close-modal" onclick={() => (app.ui.modal = null)}>Cancelar</button>
