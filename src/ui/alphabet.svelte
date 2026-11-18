<script lang="ts">
	import { closeOnOutside } from '#lib/dom.ts'

	const words = [
		'Alpha',
		'Bravo',
		'Charlie',
		'Delta',
		'Echo',
		'Foxtrot',
		'Golf',
		'Hotel',
		'India',
		'Juliett',
		'Kilo',
		'Lima',
		'Mike',
		'November',
		'Oscar',
		'Papa',
		'Quebec',
		'Romeo',
		'Sierra',
		'Tango',
		'Uniform',
		'Victor',
		'Whiskey',
		'X-ray',
		'Yankee',
		'Zulu'
	]
</script>

<details class="group/details side-details border border-current/25" {@attach closeOnOutside}>
	<summary
		class="p-[.5ch] backdrop-blur transition-opacity not-hover:opacity-50 group-open/details:opacity-100"
	>
		Alphabet
	</summary>

	<dl
		class="grid max-h-svh gap-x-ch overflow-y-auto border border-current/25 p-[.5ch] uppercase backdrop-blur"
	>
		{#each words as word (word)}
			<div class="col-span-full grid grid-cols-subgrid items-center">
				<dt class="order-last">{word}</dt>

				<dd class="scale-150 text-center font-gallaudet text-[1.5em] leading-none">
					{word[0]}
				</dd>
			</div>
		{/each}
	</dl>
</details>

<style>
	summary {
		writing-mode: sideways-rl;
	}

	dl {
		grid-template-columns: auto 1fr;
	}
</style>
