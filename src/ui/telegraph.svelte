<script lang="ts">
	import { holdTone, stop, UNIT } from '#lib/audio.svelte.ts'
	import { DASH, DOT, decodeCode, isKnownCode } from '#lib/morse.ts'

	let {
		selected = $bindable(null),
		onstart,
		onwrite
	}: {
		selected?: string | null
		/** a new input began (the page clears the prompt on the first one while transcribing) */
		onstart?: () => void
		/** a character was finished */
		onwrite?: (char: string) => void
	} = $props()

	const HOLD_MS = UNIT * 3 * 1000 // held at least this long: a dash
	const COMMIT_MS = UNIT * 7 * 1000 // pause after which the input is a finished character
	const LINGER_MS = 1500 // how long the finished character stays shown on the chart

	let buffer = '' // symbols registered so far
	let held = $state<'DOT' | 'DASH' | null>(null)
	let release: (() => void) | undefined
	let holdTimer: ReturnType<typeof setTimeout>
	let commitTimer: ReturnType<typeof setTimeout>
	let lingerTimer: ReturnType<typeof setTimeout>

	// show the in-progress symbol on the chart, ignoring paths that lead nowhere
	function show(symbol: string) {
		if (isKnownCode(buffer + symbol)) selected = buffer + symbol
	}

	function down() {
		if (held) return
		clearTimeout(commitTimer)
		clearTimeout(lingerTimer)
		stop()
		onstart?.()
		release = holdTone()
		held = 'DOT'
		show(DOT)
		holdTimer = setTimeout(() => {
			held = 'DASH'
			show(DASH)
		}, HOLD_MS)
	}

	function up() {
		if (!held) return
		clearTimeout(holdTimer)
		release?.()
		release = undefined

		const symbol = held === 'DOT' ? DOT : DASH
		held = null
		if (isKnownCode(buffer + symbol)) buffer += symbol

		commitTimer = setTimeout(() => {
			onwrite?.(decodeCode(buffer))
			buffer = ''
		}, COMMIT_MS)
		lingerTimer = setTimeout(() => (selected = null), LINGER_MS)
	}

	// space drives the telegraph from anywhere, unless focus is on something that uses space itself
	function onwindowkey(e: KeyboardEvent) {
		if (e.key !== ' ' || e.metaKey || e.ctrlKey || e.altKey) return
		const t = e.target
		if (t !== document.body && t !== document.documentElement) return

		e.preventDefault()
		if (e.type === 'keydown') {
			if (!e.repeat) down()
		} else up()
	}

	const isKey = (e: KeyboardEvent) =>
		(e.key === ' ' || e.key === 'Enter') && !(e.metaKey || e.ctrlKey)
</script>

<svelte:window onkeydown={onwindowkey} onkeyup={onwindowkey} />

<fieldset class="mx-auto grid max-w-[20ch] place-items-center px-ch select-none">
	<button
		class="block aspect-square w-full touch-none border text-current/25 select-none [-webkit-touch-callout:none] [-webkit-user-select:none] not-active:transition-colors not-active:duration-250 hover:bg-current/25 data-[held=DASH]:bg-dash! data-[held=DOT]:bg-dot!"
		data-held={held}
		onpointerdown={(e) => {
			e.currentTarget.setPointerCapture(e.pointerId)
			down()
		}}
		onpointerup={up}
		onpointercancel={up}
		onkeydown={(e) => {
			if (!isKey(e)) return
			e.preventDefault()
			if (!e.repeat) down()
		}}
		onkeyup={(e) => {
			if (!isKey(e)) return
			e.preventDefault()
			up()
		}}
		onblur={up}
		oncontextmenu={(e) => e.preventDefault()}
	>
		Telegraph
	</button>
</fieldset>
