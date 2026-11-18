<script lang="ts">
	import { DOT, encodeChar } from '#lib/morse.ts'
	import { playCode, playWords, stop } from '#lib/audio.svelte.ts'
	import { scale } from 'svelte/transition'

	let {
		selected = $bindable(null),
		value = $bindable('')
	}: { selected?: string | null; value?: string } = $props()

	let playing = $state<[number, number] | null>(null)
	let hidden = $state(false)

	let run = 0

	function toggle() {
		if (playing) return stop()
		const id = ++run
		const snapshot = words.map((w) => w.map((c) => c.code))
		playWords(
			snapshot,
			(i, j) => {
				playing = [i, j]
				selected = snapshot[i][j]
			},
			() => {
				// a newer run or a manual click owns the state now
				if (id !== run) return
				playing = null
				selected = null
			}
		)
	}

	type Word = { char: string; code: string }[]

	const parsed = $derived.by(() => {
		const words: Word[] = []
		const breaks = new Set<number>() // indices of words that start a new line

		for (const line of value.split(/\r?\n/)) {
			const lineWords = line
				.split(/\s+/)
				.map((word) =>
					[...word]
						.map((char) => ({ char: char.toUpperCase(), code: encodeChar(char) }))
						.filter((c): c is { char: string; code: string } => c.code !== undefined)
				)
				.filter((word) => word.length)

			if (lineWords.length && words.length) breaks.add(words.length)
			words.push(...lineWords)
		}

		return { words, breaks }
	})

	const words = $derived(parsed.words)

	// cmd/ctrl + enter plays, cmd/ctrl + backspace clears, even while typing in the textarea
	function onkeydown(e: KeyboardEvent) {
		if (!(e.metaKey || e.ctrlKey) || e.repeat) return
		if (e.key === 'Enter') {
			e.preventDefault()
			toggle()
		} else if (e.key === 'Backspace') {
			e.preventDefault()
			value = ''
		}
	}
</script>

<svelte:window {onkeydown} />

<article class="relative z-1 p-ch pt-0">
	<textarea
		class="field-sizing-content max-h-[10lh] w-full overflow-y-auto border border-foreground p-ch disabled:text-transparent disabled:placeholder:text-transparent"
		rows={3}
		disabled={hidden}
		placeholder="Enter text to convert"
		bind:value></textarea>

	<fieldset
		class="absolute inset-x-[2ch] bottom-full z-1 flex min-w-max translate-y-[.5lh] flex-wrap items-center *:bg-background *:px-[.5ch]"
	>
		<button onclick={toggle} aria-label={playing ? 'Pause' : 'Play'}>
			{playing ? '⏸️' : '▶️'}
		</button>

		<button
			aria-label={hidden ? 'Show text' : 'Hide text'}
			aria-pressed={hidden}
			onclick={() => (hidden = !hidden)}
		>
			{hidden ? '👀' : '🫣'}
		</button>

		<button class="ml-auto" aria-label="Clear" onclick={() => (value = '')}>🗑️</button>
	</fieldset>

	<output class="absolute inset-x-0 bottom-full order-first p-ch backdrop-blur">
		<div class="flex max-h-[10lh] flex-wrap content-start gap-x-ch gap-y-[.25lh] overflow-y-auto">
			{#each words as word, i (i)}
				{#if parsed.breaks.has(i)}
					<span class="basis-full"></span>
				{/if}
				<span class="flex flex-wrap gap-px">
					{#each word as { char, code }, j (j)}
						<ruby>
							<button
								in:scale|global={{ start: 0.5, duration: 250 }}
								out:scale|global={{ start: 0.5, duration: 250 }}
								class="flex items-center gap-[.25ch] bg-foreground/10 px-[.5ch] transition-colors aria-pressed:bg-foreground/25 data-playing:bg-foreground/40"
								aria-pressed={selected === code}
								data-playing={playing?.[0] === i && playing[1] === j ? '' : undefined}
								onclick={() => {
									run++
									stop()
									playing = null
									if (selected === code) return (selected = null)
									selected = code
									playCode(code)
								}}
							>
								{#each [...code] as symbol, k (k)}
									<span data-symbol={symbol === DOT ? 'DOT' : 'DASH'}>{symbol}</span>
								{/each}
							</button>

							<rt class="sr-only">{char}</rt>
						</ruby>
					{/each}
				</span>
			{/each}
		</div>
	</output>
</article>

<style>
	[data-symbol='DOT'] {
		color: var(--color-dot);
	}
	[data-symbol='DASH'] {
		color: var(--color-dash);
	}
</style>
