<script lang="ts">
	import { buildChart, decodeCode, DOT, isKnownCode, pathTo, type Group } from '#lib/morse.ts'
	import { isTyping } from '#lib/dom.ts'
	import { playCode, sound, stop } from '#lib/audio.svelte.ts'
	import Button from '#ui/button.svelte'

	let {
		enabled,
		selected = $bindable(null),
		transcribe = $bindable(false),
		onstart,
		onwrite
	}: {
		enabled: Record<Group, boolean>
		selected?: string | null
		transcribe?: boolean
		/** a new input began (the page clears the prompt on the first one while transcribing) */
		onstart?: () => void
		/** a character was entered */
		onwrite?: (char: string) => void
	} = $props()

	// only what's enabled (plus the nodes leading to it) is laid out, so the chart shrinks to fit
	const chart = $derived(buildChart(enabled))

	// drop the selection if its character just disappeared
	$effect.pre(() => {
		if (selected && !isKnownCode(selected)) selected = null
	})

	// the selection may lead off the chart (a disabled group): follow only the part that's drawn
	const path = $derived(
		selected ? pathTo(chart, selected).filter((n): n is NonNullable<typeof n> => !!n) : []
	)
	const onPath = $derived(new Set(path.map((n) => n.code)))

	const codeByChar = $derived(
		new Map(chart.nodes.filter((n) => n.active).map((n) => [n.char, n.code]))
	)

	const toggle = (code: string) => {
		if (selected === code) {
			selected = null
			stop()
		} else {
			selected = code
			playCode(code)
			onstart?.()
			onwrite?.(decodeCode(code))
		}
	}

	function onkeydown(e: KeyboardEvent) {
		// escape aborts any sound, wherever focus is
		if (e.key === 'Escape') stop()

		// shift + M mutes; the other shift + letter shortcuts belong to the group toggles
		if (e.shiftKey && !e.metaKey && !e.ctrlKey && !e.altKey && /^Key[ANPM]$/.test(e.code)) {
			if (isTyping(e.target)) return
			if (e.code === 'KeyM' && !e.repeat) sound.enabled = !sound.enabled
			return
		}

		// only when nothing is focused (focus rests on body / the root)
		const active = document.activeElement
		if (active && active !== document.body && active !== document.documentElement) return

		if (e.key === 'Escape') return (selected = null)

		if (e.metaKey || e.ctrlKey || e.altKey || e.repeat) return

		const code = codeByChar.get(e.key.toUpperCase())
		if (!code) return

		e.preventDefault() // e.g. "/" and "'" open quick-find in some browsers
		toggle(code)
	}
</script>

<svelte:window {onkeydown} />

<figure
	class="chart isolate grid text-center lg:text-[1.5em]"
	style="--cols: {chart.cols}; grid-template-columns: repeat({chart.start.col -
		1}, var(--w)) min-content repeat({chart.cols -
		chart.start.col}, var(--w)); grid-template-rows: repeat({chart.rows}, var(--h))"
	role="group"
	aria-label="Morse code decoder chart"
>
	<figcaption
		class="flex flex-col gap-[1.5ch]"
		style="grid-column: {chart.start.col}; grid-row: {chart.start.row}"
	>
		<button class="px-[.5ch]" onclick={() => (selected = null)}>
			<span
				class="grid bg-background px-[.5ch] transition-colors data-selected:bg-foreground data-selected:text-background"
				data-selected={selected ? '' : undefined}
			>
				Start
			</span>
		</button>

		<label class="group/sound" aria-label="Sound">
			<input type="checkbox" bind:checked={sound.enabled} />
			<span class="group-has-checked/sound:hidden">🔇</span>
			<span class="group-not-has-checked/sound:hidden">🔊</span>
		</label>

		<label aria-label="Transcribe">
			<input type="checkbox" bind:checked={transcribe} />
			<span>✍️</span>
		</label>

		{#if selected}
			{#key selected}
				<output
					class="my-auto flex items-center gap-ch transition-opacity starting:opacity-0"
					style="grid-column: {chart.start.col}; grid-row: 2 / -1"
					aria-live="polite"
				>
					<span
						class="grid aspect-square size-[1.25lh] place-content-center rounded-full bg-foreground text-background"
					>
						{decodeCode(selected)}
					</span>

					{#each [...selected] as symbol, i (i)}
						<span data-symbol={symbol === DOT ? 'DOT' : 'DASH'}>{symbol}</span>
					{/each}
				</output>
			{/key}
		{/if}
	</figcaption>

	{#each chart.nodes as node (node.code)}
		<Button
			{node}
			junction={!node.active}
			selected={selected === node.code}
			onPath={onPath.has(node.code)}
			dimmed={!!selected && !onPath.has(node.code)}
			onclick={() => toggle(node.code)}
		/>
	{/each}
</figure>

<style>
	output {
		writing-mode: vertical-lr;

		span:first-child {
			writing-mode: horizontal-tb;
		}

		[data-symbol='DOT'] {
			color: var(--color-dot);
		}
		[data-symbol='DASH'] {
			color: var(--color-dash);
		}
	}

	.chart {
		--w: 2.5ch;
		--h: 1lh;
		--gap-x: 0.5lh;
		--gap-y: 1lh;
		--sx: calc(var(--w) + var(--gap-x));
		--sy: calc(var(--h) + var(--gap-y));

		gap: var(--gap-y) var(--gap-x);
	}
</style>
