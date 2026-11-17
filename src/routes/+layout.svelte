<script lang="ts">
	import './layout.css'
	import favicon from '#lib/assets/favicon.svg'
	import type { LayoutProps } from './$types'

	let { children }: LayoutProps = $props()
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
</svelte:head>

<h1 class="text-center">Morse</h1>

{@render children()}
