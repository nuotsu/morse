<script lang="ts">
	import './layout.css'
	import favicon from '#lib/assets/favicon.svg'
	import type { LayoutProps } from './$types'

	let { children }: LayoutProps = $props()
</script>

<svelte:head>
	<title>Morse</title>
	<meta name="description" content="" />

	<link rel="icon" href={favicon} />
</svelte:head>

{@render children()}
