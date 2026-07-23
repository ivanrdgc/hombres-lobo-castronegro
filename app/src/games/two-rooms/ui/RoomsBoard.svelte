<script lang="ts">
  // Tablero público: quién está en cada sala. En el reparto y las rondas solo se
  // ven los nombres (los bandos son secretos); al final (`reveal`) se destapan
  // bandos y roles.
  import { roomMembers } from '../engine';
  import type { TwoRoomsState } from '../types';

  const { game, meId, reveal = false }: { game: TwoRoomsState; meId: string; reveal?: boolean } = $props();
  const rooms: (0 | 1)[] = [0, 1];
  const roleTag = (pid: string) => (game.roles[pid] === 'president' ? ' 🎖️ Presidente' : game.roles[pid] === 'bomber' ? ' 💣 Bombardero' : '');
</script>

<div class="rooms">
  {#each rooms as r (r)}
    <div class="room {game.room[meId] === r ? 'mine' : ''}">
      <div class="rhead">🚪 Sala {r + 1}{game.room[meId] === r ? ' · aquí estás' : ''}</div>
      <div class="rlist">
        {#each roomMembers(game, r) as pid (pid)}
          <div class="rp {reveal ? game.teams[pid] : ''}">
            <span>{game.names[pid] || pid}{pid === meId ? ' (tú)' : ''}</span>
            {#if reveal}<span class="rrole">{roleTag(pid)}</span>{/if}
          </div>
        {/each}
      </div>
    </div>
  {/each}
</div>

<style>
  .rooms { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin: 6px 0 10px; }
  .room { border: 1px solid var(--line, #2a2f45); border-radius: 12px; padding: 8px 10px; background: var(--card, #171a2b); }
  .room.mine { border-color: var(--accent, #d8a24a); box-shadow: 0 0 0 1px var(--accent, #d8a24a) inset; }
  .rhead { font-weight: 700; font-size: 0.92rem; margin-bottom: 6px; }
  .rlist { display: flex; flex-direction: column; gap: 3px; }
  .rp { font-size: 0.9rem; padding: 3px 8px; border-radius: 8px; background: #1e2236; display: flex; justify-content: space-between; gap: 6px; }
  .rp.blue { background: #1b2a4a; }
  .rp.red { background: #3a1e28; }
  .rrole { font-size: 0.78rem; opacity: 0.9; white-space: nowrap; }
</style>
