<script lang="ts">
	import { DOT, type MorseNode } from '#lib/morse.ts'

	type Props = {
		node: MorseNode
		/** not an enabled character: just the marker on the way to one, no text, not clickable */
		junction: boolean
		/** this letter is the final, selected one */
		selected: boolean
		/** this letter is somewhere on the selected path */
		onPath: boolean
		/** a path is selected and this letter isn't on it */
		dimmed: boolean
		onclick: () => void
	}

	let { node, junction, selected, onPath, dimmed, onclick }: Props = $props()

	const { char, code, col, row, dx, dy } = $derived(node)
</script>

<button
	style="grid-column: {col}; grid-row: {row}; --dx: {dx}; --ax: {Math.abs(dx)}; --ay: {Math.abs(
		dy
	)}"
	data-h={dx > 0 ? 'right' : 'left'}
	data-v={dy > 0 ? 'down' : 'up'}
	data-on-path={onPath || undefined}
	data-dimmed={dimmed || undefined}
	aria-pressed={selected}
	aria-hidden={junction || undefined}
	disabled={junction}
	{onclick}
>
	<span
		class="relative isolate grid text-background"
		data-type={code.at(-1) === DOT ? 'DOT' : 'DASH'}
		data-junction={junction || undefined}
		data-axis={dx === 0 ? 'vertical' : 'horizontal'}
	>
		{char}
	</span>
</button>

<style>
	/* keep the cell's height even with no text, so the marker below always has a box to centre in */
	[data-type] {
		min-height: 1lh;
	}

	/* a junction keeps its marker and colour but hides the text */
	[data-junction] {
		color: transparent;
	}

	/* the dot / dash marker behind the letter */
	:is([data-type='DOT'], [data-type='DASH'])::before {
		content: '';
		position: absolute;
		top: 50%;
		left: 50%;
		translate: -50% -50%;
		z-index: -1;
		transition:
			background-color 0.2s,
			scale 0.2s;
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

	/* no text to hold up: shrink the marker */
	[data-junction]::before {
		scale: 0.5;
	}

	[aria-pressed='true'] > [data-type]::before {
		outline: 2px solid var(--color-foreground);
	}

	/* the line to the parent: ::before is horizontal, ::after is vertical */
	button {
		--lw: 1px;
		--line: GrayText;
		position: relative;

		&:disabled {
			cursor: default;
		}

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

		/*
		 * dim everything off the selected path. Not opacity on the button itself:
		 * that would make it a stacking context and trap its lines above neighbours.
		 */
		&[data-dimmed] {
			> span {
				--mix: 50%;
			}

			&::before,
			&::after {
				opacity: 0.5;
			}
		}
	}
</style>
