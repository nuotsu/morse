<script lang="ts">
	import { untrack } from 'svelte'
	import { sound, UNIT } from '#lib/audio.svelte.ts'
	import { isTyping } from '#lib/dom.ts'
	import {
		canExtend,
		DASH,
		DOT,
		decodeCode,
		decodeEnabled,
		isKnownCode,
		type Group
	} from '#lib/morse.ts'

	let {
		selected = $bindable(null),
		enabled,
		listening = $bindable(false),
		onstart,
		onwrite
	}: {
		selected?: string | null
		/** the groups the parser reads; nothing outside them is written */
		enabled: Record<Group, boolean>
		/** the mic is on */
		listening?: boolean
		/** the first tone heard since listening began */
		onstart?: () => void
		/** characters were heard */
		onwrite?: (char: string) => void
	} = $props()

	const TICK_MS = 5 // how often the mic is sampled
	const SETTLE_MS = 15 // a change has to last at least this long before it counts...
	const ON_SETTLE = 0.3 // ...and a tone this many dots, so a click or knock isn't one
	const OFF_SETTLE = 0.5 // ...and a gap this many dots, so a dip mid-dash doesn't split it in two
	const MIN_TONE = 0.5 // a tone shorter than this many dots is a blip, not a dot...
	const MIN_TONE_MS = 30 // ...or than this, however fast the sender seems to be
	const PITCH_DRIFT = 2 // a real tone holds its pitch: wandering more bins than this is noise
	const PITCH_BINS = 2 // once a sender's pitch is known, only this many bins either side count
	const UNLOCK_MS = 5000 // silent this long: forget the pitch, a new sender may differ
	const MIN_HZ = 300 // band a morse tone is searched for in
	const MAX_HZ = 1500
	const ON_DB = 20 // louder than the noise floor by this much: a tone
	const OFF_DB = 12 // a tone ends below this above the floor...
	const DROP_DB = 12 // ...or this far below its own loudest, so an echo's tail doesn't stretch it
	const CHAR_GAP = 3.5 // silent this many dots: the character is finished
	const RISE_DB = 10 // a new tone jumps this far above the quietest since the last, unlike an echo
	const TONAL_DB = 24 // a tone is a narrow peak: this far above the rest of the band (noise is flat)
	const FLOOR_MS = 2000 // the noise floor is a low percentile of the loudness over this long
	const WARMUP_MS = 500 // mics start near-silent; nothing is detected until the floor is learned
	const MAX_TONE_MS = 1500 // longer than any dash: it's noise, not a tone
	const LINGER_MS = 1500 // how long the heard character stays shown on the chart

	let held = $state<'DOT' | 'DASH' | null>(null)
	let error = $state<string | null>(null)

	// shift + R toggles the receiver
	function onkeydown(e: KeyboardEvent) {
		if (e.code !== 'KeyR' || !e.shiftKey || e.metaKey || e.ctrlKey || e.altKey || e.repeat) return
		if (isTyping(e.target)) return

		e.preventDefault()
		listening = !listening
	}

	$effect(() => {
		if (!listening) return
		let cancelled = false

		// our own tones would be heard by the mic, so they're muted while listening
		const wasEnabled = untrack(() => sound.enabled)
		sound.enabled = false
		let teardown: (() => void) | undefined

		listen().then(
			(stop) => (cancelled ? stop() : (teardown = stop)),
			(e: unknown) => {
				error = e instanceof Error ? e.message : 'Microphone unavailable'
				listening = false
			}
		)

		return () => {
			cancelled = true
			teardown?.()
			sound.enabled = wasEnabled
		}
	})

	async function listen() {
		error = null
		const stream = await navigator.mediaDevices.getUserMedia({
			// the raw signal: these filters treat a steady tone as noise and fade it out
			audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false }
		})

		const ctx = new AudioContext()
		const analyser = ctx.createAnalyser()
		// a short window (~11ms at 48kHz) so tones and the gaps between them stay sharp
		analyser.fftSize = 512
		analyser.smoothingTimeConstant = 0
		ctx.createMediaStreamSource(stream).connect(analyser)

		const bins = new Float32Array(analyser.frequencyBinCount)
		const hz = ctx.sampleRate / analyser.fftSize
		const lo = Math.floor(MIN_HZ / hz)
		const hi = Math.ceil(MAX_HZ / hz)

		const history: number[] = [] // recent loudness, in dB, for the noise floor
		const startedAt = performance.now()
		let level = -Infinity // loudest the current tone has been
		let pitch: number | undefined // the sender's frequency bin, once heard
		let pitchSum = 0 // the bins the current tone was loudest in, to average into a pitch
		let pitchCount = 0
		let pitchMin = Infinity // the range of bins the current tone was loudest in
		let pitchMax = -Infinity
		let quietest = -Infinity // quietest it's been since a tone began to fade, in dB
		let silentSince = performance.now() // where the gap before the current tone began
		let on = false
		let changedAt: number | undefined // when the opposite state was first seen
		let since = performance.now() // when the current tone or silence began

		// typical dot and dash lengths, each learned from what's heard: a tone is whichever
		// it's closer to (on a log scale), so the sender's speed and ratio can drift freely
		let dot = UNIT * 1000
		let dash = UNIT * 3000
		// the dot length to time gaps by: dashes are learned too, and a third of one is a steadier
		// guide when dots come out clipped
		const unit = () => Math.max(dot, dash / 3)

		let buffer = ''
		let started = false
		let lingerTimer: ReturnType<typeof setTimeout> | undefined

		function commit() {
			const chars = decodeEnabled(buffer, enabled)
			buffer = ''
			if (!chars) return
			onwrite?.(chars)
		}

		function toneEnded(ms: number) {
			// too short to be a dot, or wandering in pitch: noise. The gap before it carries on as
			// if it never happened
			if (ms < Math.max(MIN_TONE_MS, dot * MIN_TONE) || pitchMax - pitchMin > PITCH_DRIFT) {
				held = null
				since = silentSince
				return
			}

			if (pitchCount) {
				const heard = Math.round(pitchSum / pitchCount)
				pitch = pitch === undefined ? heard : Math.round(pitch + (heard - pitch) * 0.3)
			}

			const isDash = ms > Math.sqrt(dot * dash)
			if (isDash) dash += (ms - dash) * 0.3
			else dot += (ms - dot) * 0.3
			// keep the two apart, so one misread can't pull them together
			dot = Math.min(400, Math.max(25, dot))
			dash = Math.max(dash, dot * 2)
			if (!isDash) dot = Math.min(dot, dash / 2)

			// the same smart parse as the telegraph: a symbol that can't continue the buffer ends its
			// character and starts the next, and so does a character nothing enabled can extend
			const symbol = isDash ? DASH : DOT
			if (!isKnownCode(buffer + symbol)) commit()
			buffer += symbol
			const shown = buffer
			if (!canExtend(buffer, decodeCode(buffer) ? enabled : undefined)) commit()

			held = null
			selected = shown
			clearTimeout(lingerTimer)
			lingerTimer = setTimeout(() => (selected = null), LINGER_MS)
		}

		const timer = setInterval(() => {
			analyser.getFloatFrequencyData(bins)
			const now = performance.now()
			if (pitch !== undefined && !on && now - since > UNLOCK_MS) pitch = undefined

			// the loudest bin: anywhere in the band, or near the sender's pitch once it's known
			const from = pitch === undefined ? lo : Math.max(lo, pitch - PITCH_BINS)
			const to = pitch === undefined ? hi : Math.min(hi, pitch + PITCH_BINS)
			let bin = from
			for (let i = from; i <= to; i++) if (bins[i] > bins[bin]) bin = i
			const peak = bins[bin]
			if (!Number.isFinite(peak)) return

			// how far the peak stands out from the band around it: high for a tone, low for noise
			const band = bins.slice(lo, hi + 1).sort()
			const tonal = peak - band[band.length >> 1]

			history.push(peak)
			if (history.length > FLOOR_MS / TICK_MS) history.shift()
			if (now - startedAt < WARMUP_MS) return

			// the floor is the quieter end of the recent past: morse leaves gaps often enough
			// that a 20th percentile is the room, not a tone, and it follows the room up and down
			const floor = [...history].sort((a, b) => a - b)[Math.floor(history.length * 0.2)]
			const loud = on
				? peak > Math.max(floor + OFF_DB, level - DROP_DB) && tonal > TONAL_DB / 2
				: peak > floor + ON_DB && tonal > TONAL_DB && peak > quietest + RISE_DB

			// a tone's echo only fades, a new tone jumps up: measure the jump from the quietest point
			// since the last one started fading (reset while a tone holds, as a brief dip isn't its end)
			if (on && loud) quietest = Infinity
			else quietest = Math.min(quietest, peak)

			if (on && loud) {
				level = Math.max(level, peak)
				pitchSum += bin
				pitchCount++
				pitchMin = Math.min(pitchMin, bin)
				pitchMax = Math.max(pitchMax, bin)
			}

			// a "tone" that never ends is noise that got past the floor: drop it
			if (on && now - since > MAX_TONE_MS) {
				on = false
				held = null
				buffer = ''
				since = now
				changedAt = undefined
				return
			}

			if (loud === on) {
				changedAt = undefined
			} else {
				changedAt ??= now
				const settle = Math.max(SETTLE_MS, dot * (loud ? ON_SETTLE : OFF_SETTLE))
				if (now - changedAt >= settle) {
					// the change began when it was first seen, not now that it's settled
					const ms = changedAt - since
					if (loud) silentSince = since
					since = changedAt
					changedAt = undefined
					on = loud

					if (on) {
						level = peak
						pitchSum = 0
						pitchCount = 0
						pitchMin = Infinity
						pitchMax = -Infinity
						if (!started) {
							started = true
							onstart?.()
						}
						held = 'DOT'
					} else toneEnded(ms)
				}
			}

			const elapsed = now - since
			if (on) {
				if (elapsed > Math.sqrt(dot * dash)) held = 'DASH'
			} else {
				// a gap of 3 units ends a character, 1 is inside one: wait for the full 3 (and more),
				// as a hand-keyed gap inside a character often runs long
				if (buffer && elapsed > unit() * CHAR_GAP) commit()
			}
		}, TICK_MS)

		return () => {
			clearInterval(timer)
			clearTimeout(lingerTimer)
			if (buffer) commit()
			held = null
			selected = null
			for (const track of stream.getTracks()) track.stop()
			ctx.close()
		}
	}
</script>

<svelte:window {onkeydown} />

<label
	class="inline-flex w-full touch-none justify-center border py-lh text-center text-current/25 not-active:transition-colors not-active:duration-250 hover:bg-current/25 data-[held=DASH]:bg-dash data-[held=DOT]:bg-dot"
	data-held={held}
	title={error ?? (listening ? 'Listening to the microphone' : 'Decode morse from the microphone')}
>
	<input type="checkbox" hidden bind:checked={listening} />
	{#if error}
		🙉 No mic
	{:else}
		👂 <kbd>R</kbd>eceiv{listening ? 'ing' : 'e'}
	{/if}
</label>

<style>
	label:has(:checked) {
		animation: receiving 1s linear infinite;
	}

	@keyframes receiving {
		50% {
			border-color: var(--color-foreground);
		}
	}
</style>
