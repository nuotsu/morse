<script lang="ts">
	import { buildChart, DOT, pathTo, type Group } from '#lib/morse.ts'
	import Button from '#ui/button.svelte'
	import Controls from '#ui/controls.svelte'

	let enabled = $state<Record<Group, boolean>>({
		alphabet: true,
		numbers: false,
		punctuation: false
	})

	// only what's enabled (plus the nodes leading to it) is laid out, so the chart shrinks to fit
	const chart = $derived(buildChart(enabled))

	let selected = $state<string | null>(null) // morse code of the selected node

	const path = $derived(selected ? pathTo(chart, selected) : [])
	const onPath = $derived(new Set(path.map((n) => n.code)))

	const codeByChar = $derived(
		new Map(chart.nodes.filter((n) => n.active).map((n) => [n.char, n.code]))
	)

	const toggle = (code: string) => (selected = selected === code ? null : code)

	function onkeydown(e: KeyboardEvent) {
		if (e.key === 'Escape') return (selected = null)
		if (e.metaKey || e.ctrlKey || e.altKey || e.repeat) return

		const code = codeByChar.get(e.key.toUpperCase())
		if (!code) return

		e.preventDefault() // e.g. "/" and "'" open quick-find in some browsers
		toggle(code)
	}

	// drop the selection if its character just disappeared
	function dropHiddenSelection() {
		if (selected && !chart.byCode.get(selected)?.active) selected = null
	}
</script>

<svelte:window {onkeydown} />

<Controls bind:enabled onchange={dropHiddenSelection} />

<div
	class="chart isolate mx-auto grid max-w-max text-center"
	style="--cols: {chart.cols}; grid-template-columns: repeat({chart.start.col -
		1}, var(--w)) auto repeat({chart.cols -
		chart.start.col}, var(--w)); grid-template-rows: repeat({chart.rows}, var(--h))"
	role="group"
	aria-label="Morse code decoder chart"
>
	<button
		class="px-[.5ch]"
		style="grid-column: {chart.start.col}; grid-row: {chart.start.row}"
		onclick={() => (selected = null)}
	>
		<span class="grid bg-background px-[.5ch]">Start</span>
	</button>

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

	<output
		class="my-auto flex items-center gap-ch"
		style="grid-column: {chart.start.col}; grid-row: 2 / -1"
		aria-live="polite"
	>
		<span>{path.at(-1)?.char}</span>

		{#if path.length}
			{#each [...selected!] as symbol, i (i)}
				<span data-symbol={symbol === DOT ? 'DOT' : 'DASH'}>{symbol}</span>
			{/each}
		{/if}
	</output>
</div>

<style>
	@property --w {
		syntax: '<length>';
		inherits: true;
		initial-value: 0px;
	}
	@property --h {
		syntax: '<length>';
		inherits: true;
		initial-value: 0px;
	}
	@property --gap-x {
		syntax: '<length>';
		inherits: true;
		initial-value: 0px;
	}
	@property --gap-y {
		syntax: '<length>';
		inherits: true;
		initial-value: 0px;
	}
	@property --sx {
		syntax: '<length>';
		inherits: true;
		initial-value: 0px;
	}
	@property --sy {
		syntax: '<length>';
		inherits: true;
		initial-value: 0px;
	}

	/* global so both the chart and the <output> below it can use them */
	:global(:root) {
		--dot: var(--color-amber-400);
		--dash: var(--color-cyan-400);
	}

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
		/*
		 * Responsive: every size is in em/ch/lh, so scaling the font scales the whole
		 * chart. Shrink it just enough that all --cols columns fit the viewport
		 * (a column step is ~2.2em; the wider Start column adds ~2.5em).
		 */
		font-size: min(1rem, calc(96vw / (var(--cols) * 2.2 + 2.5)));

		--w: 3ch;
		--h: 1lh;
		--gap-x: 0.5lh;
		--gap-y: 1lh;
		--sx: calc(var(--w) + var(--gap-x));
		--sy: calc(var(--h) + var(--gap-y));

		gap: var(--gap-y) var(--gap-x);
	}
</style>
