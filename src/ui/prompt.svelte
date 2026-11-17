<script lang="ts">
	import { DOT, encodeChar } from '#lib/morse.ts'
	import { scale } from 'svelte/transition'

	let { selected = $bindable(null) }: { selected?: string | null } = $props()

	let value = $state('Hello, world!')

	const words = $derived(
		value
			.split(/\s+/)
			.map((word) =>
				[...word]
					.map((char) => ({ char: char.toUpperCase(), code: encodeChar(char) }))
					.filter((c): c is { char: string; code: string } => c.code !== undefined)
			)
			.filter((word) => word.length)
	)
</script>

<article class="relative z-1 p-ch pt-0">
	<textarea
		class="field-sizing-content max-h-[10lh] w-full overflow-y-auto border p-ch"
		rows={3}
		placeholder="Enter text to convert"
		bind:value></textarea>

	<fieldset
		class="absolute bottom-full left-1/2 z-1 flex min-w-max -translate-x-1/2 translate-y-[.5lh] flex-wrap items-center justify-center gap-x-ch bg-background px-[.5ch]"
	>
		<legend class="flex items-center">
			<svg
				class="size-[1em]"
				viewBox="0 0 24 24"
				width="1em"
				height="1em"
				fill="none"
				stroke="currentColor"
				stroke-width="2"
				stroke-linecap="round"
				stroke-linejoin="round"
				aria-hidden="true"
			>
				<path d="m17 11-5-5-5 5" />
				<path d="m17 18-5-5-5 5" />
			</svg>
			<span class="sr-only">Morse code</span>
		</legend>
	</fieldset>

	<output class="absolute inset-x-0 bottom-full order-first p-ch backdrop-blur">
		<div class="flex max-h-[10lh] flex-wrap content-start gap-x-ch gap-y-[.25lh] overflow-y-auto">
			{#each words as word, i (i)}
				<span class="flex flex-wrap gap-px">
					{#each word as { char, code }, j (j)}
						<ruby>
							<button
								in:scale|global={{ start: 0.5, duration: 250 }}
								out:scale|global={{ start: 0.5, duration: 250 }}
								class="flex items-center gap-[.25ch] bg-foreground/10 px-[.5ch] transition-colors aria-pressed:bg-foreground/25"
								aria-pressed={selected === code}
								onclick={() => (selected = selected === code ? null : code)}
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
		color: var(--dot);
	}
	[data-symbol='DASH'] {
		color: var(--dash);
	}
</style>
