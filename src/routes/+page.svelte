<script lang="ts">
	import { DOT, nodes, offsetToParent, pathTo, START } from '#lib/morse.ts'

	let selected = $state<string | null>(null) // morse code of the selected node

	const path = $derived(selected ? pathTo(selected) : [])
	const onPath = $derived(new Set(path.map((n) => n.code)))

	const codeByLetter = new Map(nodes.map((n) => [n.letter, n.code]))

	const toggle = (code: string) => (selected = selected === code ? null : code)

	function onkeydown(e: KeyboardEvent) {
		if (e.key === 'Escape') return (selected = null)
		if (e.metaKey || e.ctrlKey || e.altKey || e.repeat) return

		const code = codeByLetter.get(e.key.toUpperCase())
		if (code) toggle(code)
	}
</script>

<svelte:window {onkeydown} />

<div
	class="chart isolate mx-auto grid max-w-max text-center"
	role="group"
	aria-label="Morse code decoder chart"
>
	<button
		class="px-[.5ch]"
		style="grid-column: {START.col}; grid-row: {START.row}"
		onclick={() => (selected = null)}
	>
		<span class="grid bg-background px-[.5ch]">Start</span>
	</button>

	{#each nodes as node (node.code)}
		{@const { letter, code, col, row } = node}
		{@const { dx, dy } = offsetToParent(node)}
		<button
			style="grid-column: {col}; grid-row: {row}; --dx: {dx}; --ax: {Math.abs(dx)}; --ay: {Math.abs(
				dy
			)}"
			data-h={dx > 0 ? 'right' : 'left'}
			data-v={dy > 0 ? 'down' : 'up'}
			data-on-path={onPath.has(code) || undefined}
			aria-pressed={selected === code}
			onclick={() => toggle(code)}
		>
			<span
				class="relative isolate grid text-background"
				data-type={code.at(-1) === DOT ? 'DOT' : 'DASH'}
				data-axis={dx === 0 ? 'vertical' : 'horizontal'}
			>
				{letter}
			</span>
		</button>
	{/each}
</div>

<output class="flex justify-center gap-ch text-center" aria-live="polite">
	<span>{path.at(-1)?.letter}</span>

	{#if path.length}
		{#each [...selected!] as symbol, i (i)}
			<span data-symbol={symbol === DOT ? 'DOT' : 'DASH'}>{symbol}</span>
		{/each}
	{/if}
</output>

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

	output [data-symbol='DOT'] {
		color: var(--dot);
	}
	output [data-symbol='DASH'] {
		color: var(--dash);
	}

	.chart {
		--w: 3ch;
		--h: 1lh;
		--gap-x: 0.5lh;
		--gap-y: 1lh;
		--sx: calc(var(--w) + var(--gap-x));
		--sy: calc(var(--h) + var(--gap-y));

		grid-template-columns: repeat(4, var(--w)) auto repeat(3, var(--w));
		grid-template-rows: repeat(7, var(--h));
		gap: var(--gap-y) var(--gap-x);

		&:has([data-on-path]) [data-h]:not([data-on-path]) {
			> span {
				--mix: 50%;
			}

			&::before,
			&::after {
				opacity: 0.5;
			}
		}
	}

	:is([data-type='DOT'], [data-type='DASH'])::before {
		content: '';
		position: absolute;
		top: 50%;
		left: 50%;
		translate: -50% -50%;
		z-index: -1;
		transition: background-color 0.2s;
	}

	[data-type='DOT']::before {
		border-radius: 100%;
		aspect-ratio: 1;
		height: 1.25lh;
		background-color: color-mix(in oklab, var(--dot) var(--mix, 100%), var(--color-background));
	}

	[data-type='DASH']::before {
		width: var(--w);
		height: 1lh;
		background-color: color-mix(in oklab, var(--dash) var(--mix, 100%), var(--color-background));
	}

	[data-type='DASH'][data-axis='vertical']::before {
		width: 1lh;
		height: calc(var(--w) - 0.25lh);
	}

	[aria-pressed='true'] > [data-type]::before {
		outline: 2px solid var(--color-foreground);
	}

	[data-h] {
		--lw: 1px;
		--line: GrayText;
		position: relative;

		&::before,
		&::after {
			content: '';
			position: absolute;
			z-index: -2;
			background: var(--line);
			transition: opacity 0.2s;
		}

		&::before {
			top: 50%;
			height: var(--lw);
			margin-top: calc(var(--lw) / -2);
			width: calc(var(--ax) * var(--sx));
		}

		&::after {
			left: calc(50% + var(--dx) * var(--sx));
			width: var(--lw);
			margin-left: calc(var(--lw) / -2);
			height: calc(var(--ay) * var(--sy) + var(--lw) / 2);
		}

		&[data-h='right']::before {
			left: 50%;
		}
		&[data-h='left']::before {
			right: 50%;
		}
		&[data-v='down']::after {
			top: calc(50% - var(--lw) / 2);
		}
		&[data-v='up']::after {
			bottom: calc(50% - var(--lw) / 2);
		}

		&[data-on-path] {
			&::before,
			&::after {
				z-index: -1;
			}

			font-weight: bold;
			--line: currentColor;
			--lw: 3px;
		}
	}
</style>
