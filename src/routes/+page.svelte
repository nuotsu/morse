<script lang="ts">
	import type { Group } from '#lib/morse.ts'
	import Controls from '#ui/controls.svelte'
	import Chart from '#ui/chart.svelte'
	import Prompt from '#ui/prompt.svelte'
	import Telegraph from '#ui/telegraph.svelte'
	import Receiver from '#ui/receiver.svelte'

	let enabled = $state<Record<Group, boolean>>({
		alphabet: true,
		numbers: false,
		punctuation: false
	})

	let selected = $state<string | null>(null)
	let transcribe = $state(false)
	let receiving = $state(false)
	let text = $state('Hello, world!')

	// transcribing starts from a blank prompt, on the first input after it's switched on
	let cleared = false
	$effect(() => {
		if (!transcribe) cleared = false
	})

	// receiving writes to the prompt, so it switches transcribing on (and starts from a blank one)
	$effect(() => {
		if (!receiving) return
		transcribe = true
		cleared = false
	})

	function start() {
		if (!transcribe || cleared) return
		text = ''
		cleared = true
	}

	function write(char: string) {
		if (transcribe) text += char
	}
</script>

<main class="flex min-h-svh flex-col gap-ch *:w-full">
	<h1 class="p-ch text-center">Morse</h1>

	<div class="my-auto flex flex-col gap-lh *:w-full *:px-ch">
		<Controls bind:enabled />

		<div class="mx-auto no-scrollbar max-w-max overflow-x-auto py-1">
			<Chart
				{enabled}
				bind:selected
				bind:transcribe
				locked={receiving}
				onstart={start}
				onwrite={write}
			/>
		</div>

		<div class="mx-auto grid max-w-[20ch] gap-ch">
			<Telegraph {enabled} bind:selected locked={receiving} onstart={start} onwrite={write} />
			<Receiver
				bind:selected
				{enabled}
				bind:listening={receiving}
				onstart={start}
				onwrite={write}
			/>
		</div>
	</div>

	<Prompt bind:selected bind:value={text} />
</main>

<style>
	main {
		padding-bottom: env(safe-area-inset-bottom);
	}
</style>
