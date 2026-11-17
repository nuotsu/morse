<script lang="ts">
	import type { Group } from '#lib/morse.ts'

	type Props = {
		enabled: Record<Group, boolean>
		/** called after `enabled` has changed */
		onchange?: () => void
	}

	let { enabled = $bindable(), onchange }: Props = $props()

	const groups: { id: Group; label: string }[] = [
		{ id: 'alphabet', label: 'Alphabet' },
		{ id: 'numbers', label: 'Numbers' },
		{ id: 'punctuation', label: 'Punctuation' }
	]

	function update(e: Event & { currentTarget: HTMLInputElement }, id: Group) {
		enabled[id] = e.currentTarget.checked

		// never leave everything off: fall back to the alphabet
		if (!groups.some((g) => enabled[g.id])) enabled.alphabet = true
		e.currentTarget.checked = enabled[id] // re-sync the box we just forced back on

		onchange?.()
	}
</script>

<fieldset class="mx-auto flex flex-wrap justify-center gap-x-[2ch]">
	<legend class="sr-only">Characters</legend>

	{#each groups as { id, label } (id)}
		<label>
			<input type="checkbox" checked={enabled[id]} onchange={(e) => update(e, id)} />
			{label}
		</label>
	{/each}
</fieldset>
