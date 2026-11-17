<script lang="ts">
	import type { Group } from '#lib/morse.ts'
	import Controls from '#ui/controls.svelte'
	import MorseChart from '#ui/morse-chart.svelte'
	import Prompt from '#ui/prompt.svelte'

	let enabled = $state<Record<Group, boolean>>({
		alphabet: true,
		numbers: false,
		punctuation: false
	})

	let selected = $state<string | null>(null)
</script>

<main class="flex min-h-svh flex-col gap-ch *:w-full">
	<h1 class="p-ch text-center">Morse</h1>

	<div class="my-auto px-ch">
		<Controls bind:enabled />
		<MorseChart {enabled} bind:selected />
	</div>

	<Prompt bind:selected />
</main>
