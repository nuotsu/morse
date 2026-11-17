<script lang="ts">
	import { isTyping } from '#lib/dom.ts'
	import type { Group } from '#lib/morse.ts'

	type Props = {
		enabled: Record<Group, boolean>
		/** called after `enabled` has changed */
		onchange?: () => void
	}

	let { enabled = $bindable(), onchange }: Props = $props()

	// the first letter of each label is its shift + key shortcut
	const groups: { id: Group; label: string }[] = [
		{ id: 'alphabet', label: 'Alphabet' },
		{ id: 'numbers', label: 'Numbers' },
		{ id: 'punctuation', label: 'Punctuation' }
	]

	// what was enabled before a cmd/ctrl + click isolated a group, to restore on the next one
	let before: Record<Group, boolean> | null = null

	function isolate(id: Group) {
		const alone = groups.every((g) => enabled[g.id] === (g.id === id))

		if (alone) {
			enabled = before ?? { alphabet: true, numbers: true, punctuation: true }
			before = null
		} else {
			before = { ...enabled }
			enabled = { alphabet: false, numbers: false, punctuation: false, [id]: true }
		}

		onchange?.()
	}

	// the browser has already toggled the box by the time a click handler runs, and still
	// fires `change` after it, so a modified click has to overwrite the box and skip that
	let skipChange = false

	function onclick(e: MouseEvent & { currentTarget: HTMLInputElement }, id: Group) {
		if (!(e.metaKey || e.ctrlKey)) return

		skipChange = true
		isolate(id)
		e.currentTarget.checked = enabled[id]
	}

	function update(e: Event & { currentTarget: HTMLInputElement }, id: Group) {
		if (skipChange) return (skipChange = false)

		enabled[id] = e.currentTarget.checked

		// never leave everything off: fall back to the alphabet
		if (!groups.some((g) => enabled[g.id])) enabled.alphabet = true
		e.currentTarget.checked = enabled[id] // re-sync the box we just forced back on

		onchange?.()
	}

	const shortcuts: Record<string, Group> = {
		KeyA: 'alphabet',
		KeyN: 'numbers',
		KeyP: 'punctuation'
	}

	// shift + A / N / P toggles a group
	function onkeydown(e: KeyboardEvent) {
		const id = shortcuts[e.code]
		if (!id || !e.shiftKey || e.metaKey || e.ctrlKey || e.altKey || e.repeat) return
		if (isTyping(e.target)) return

		e.preventDefault()
		enabled[id] = !enabled[id]
		if (!groups.some((g) => enabled[g.id])) enabled.alphabet = true
		onchange?.()
	}
</script>

<svelte:window {onkeydown} />

<fieldset class="flex flex-wrap justify-center gap-x-[2ch] px-ch">
	<legend class="sr-only">Characters</legend>

	{#each groups as { id, label } (id)}
		<label>
			<input
				type="checkbox"
				checked={enabled[id]}
				onclick={(e) => onclick(e, id)}
				onchange={(e) => update(e, id)}
			/>

			<kbd>{label[0]}</kbd>{label.slice(1)}
		</label>
	{/each}
</fieldset>
