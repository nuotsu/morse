<script lang="ts">
	import { buildChart, DOT, pathTo, type Group } from '#lib/morse.ts'
	import Button from '#ui/button.svelte'

	let {
		enabled,
		selected = $bindable(null)
	}: { enabled: Record<Group, boolean>; selected?: string | null } = $props()

	// only what's enabled (plus the nodes leading to it) is laid out, so the chart shrinks to fit
	const chart = $derived(buildChart(enabled))

	// drop the selection if its character just disappeared
	$effect.pre(() => {
		if (selected && !chart.byCode.get(selected)?.active) selected = null
	})

	const path = $derived(selected ? pathTo(chart, selected) : [])
	const onPath = $derived(new Set(path.map((n) => n.code)))

	const codeByChar = $derived(
		new Map(chart.nodes.filter((n) => n.active).map((n) => [n.char, n.code]))
	)

	const toggle = (code: string) => (selected = selected === code ? null : code)

	function onkeydown(e: KeyboardEvent) {
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
	class="chart isolate mx-auto no-scrollbar grid max-w-max overflow-x-auto px-0.5 py-[.5ch] text-center"
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
			<span class="grid bg-background px-[.5ch]">Start</span>
		</button>

		{#if path.length}
			{#key path.at(-1)?.char}
				<output
					class="my-auto flex items-center gap-ch transition-opacity starting:opacity-0"
					style="grid-column: {chart.start.col}; grid-row: 2 / -1"
					aria-live="polite"
				>
					<span
						class="grid aspect-square size-[1.25lh] place-content-center rounded-full bg-foreground text-background"
					>
						{path.at(-1)?.char}
					</span>

					{#each [...selected!] as symbol, i (i)}
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
			dimmed={path.length > 0 && !onPath.has(node.code)}
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
			color: var(--dot);
		}
		[data-symbol='DASH'] {
			color: var(--dash);
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
