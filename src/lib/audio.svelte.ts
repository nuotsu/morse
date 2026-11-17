import { DOT } from './morse.ts'

/** shared mute switch (bound to the checkbox in the chart) */
export const sound = $state({ enabled: true })

export const UNIT = 0.08 // seconds per dot
const FREQ = 600
const MIN_HOLD = 0.06 // shortest a tapped tone sounds, in seconds
const RAMP = 0.005 // avoids clicks at the edges of each tone

let ctx: AudioContext | undefined
const LEAD = 0.02 // schedule slightly ahead so a tone never starts in the past

function getContext() {
	ctx ??= new AudioContext()
	if (ctx.state !== 'running') ctx.resume()
	return ctx
}

// A short tap that gets the audio pipeline going, so the first real tone isn't clipped.
function tap() {
	const c = getContext()
	const osc = c.createOscillator()
	const gain = c.createGain()
	const t = c.currentTime + LEAD

	osc.frequency.value = FREQ
	gain.gain.setValueAtTime(0, t)
	gain.gain.linearRampToValueAtTime(0.1, t + RAMP)
	gain.gain.linearRampToValueAtTime(0, t + 0.03)
	osc.connect(gain).connect(c.destination)
	osc.start(t)
	osc.stop(t + 0.03)
}

// Browsers keep audio suspended until a gesture, so a tap on load only sounds where autoplay
// is allowed. Otherwise it plays on the first gesture (capture, so before any handler that
// plays), which also unlocks iOS.
if (typeof window !== 'undefined') {
	let tapped = false
	const events = ['pointerdown', 'touchend', 'keydown', 'click']

	const attempt = async () => {
		if (tapped) return
		const c = getContext()
		// iOS only unlocks audio on a sound started synchronously inside the gesture
		const silent = c.createBufferSource()
		silent.buffer = c.createBuffer(1, 1, c.sampleRate)
		silent.connect(c.destination)
		silent.start()
		await c.resume().catch(() => {})
		if (c.state !== 'running' || tapped) return

		tapped = true
		for (const e of events) window.removeEventListener(e, attempt, true)
		tap()
	}

	for (const e of events) window.addEventListener(e, attempt, true)
	attempt()
}
let current: AbortController | undefined

const sleep = (seconds: number, signal: AbortSignal) =>
	new Promise<void>((resolve) => {
		if (signal.aborted) return resolve()
		const done = () => {
			clearTimeout(timer)
			resolve()
		}
		const timer = setTimeout(() => {
			signal.removeEventListener('abort', done)
			resolve()
		}, seconds * 1000)
		signal.addEventListener('abort', done, { once: true })
	})

function tone(seconds: number, signal: AbortSignal) {
	const ctx = getContext()
	const osc = ctx.createOscillator()
	const gain = ctx.createGain()
	const t = ctx.currentTime + LEAD

	osc.frequency.value = FREQ
	gain.gain.setValueAtTime(0, t)
	gain.gain.linearRampToValueAtTime(0.3, t + RAMP)
	gain.gain.setValueAtTime(0.3, t + seconds - RAMP)
	gain.gain.linearRampToValueAtTime(0, t + seconds)

	osc.connect(gain).connect(ctx.destination)
	osc.start(t)
	osc.stop(t + seconds)

	signal.addEventListener(
		'abort',
		() => {
			try {
				gain.disconnect()
			} catch {}
		},
		{ once: true }
	)
}

async function playSymbols(code: string, signal: AbortSignal) {
	for (const [i, symbol] of [...code].entries()) {
		if (signal.aborted) return
		const length = symbol === DOT ? UNIT : UNIT * 3
		if (sound.enabled) tone(length, signal)
		await sleep(length, signal)
		if (i < code.length - 1) await sleep(UNIT, signal)
	}
}

/** stop whatever is playing */
export const stop = () => {
	current?.abort()
	current = undefined
}

/** play a single character's code. Replaces anything already playing */
export async function playCode(code: string) {
	stop()
	const controller = (current = new AbortController())
	await playSymbols(code, controller.signal)
	if (current === controller) current = undefined
}

/**
 * Play words of codes with standard spacing. `onStep` is called as each character
 * starts, and with null when finished or stopped. Replaces anything already playing.
 * Resolves true if it played to the end.
 */
export async function playWords(
	words: string[][],
	onStep: (word: number, char: number) => void,
	onEnd: () => void
) {
	stop()
	const controller = (current = new AbortController())
	const { signal } = controller

	try {
		for (const [i, word] of words.entries()) {
			for (const [j, code] of word.entries()) {
				if (signal.aborted) return
				onStep(i, j)
				await playSymbols(code, signal)
				if (j < word.length - 1) await sleep(UNIT * 3, signal)
			}
			if (i < words.length - 1) await sleep(UNIT * 7, signal)
		}
	} finally {
		if (current === controller) current = undefined
		onEnd()
	}
}

/** a tone that sounds until the returned function is called (for a held key) */
export function holdTone() {
	if (!sound.enabled) return () => {}
	const ctx = getContext()
	const osc = ctx.createOscillator()
	const gain = ctx.createGain()
	const t = ctx.currentTime + LEAD

	osc.frequency.value = FREQ
	gain.gain.setValueAtTime(0, t)
	gain.gain.linearRampToValueAtTime(0.3, t + RAMP)
	osc.connect(gain).connect(ctx.destination)
	osc.start(t)

	// a very quick tap still sounds for at least a short dot
	return () => {
		const end = Math.max(ctx.currentTime, t + MIN_HOLD)
		gain.gain.cancelScheduledValues(end)
		gain.gain.setValueAtTime(0.3, end)
		gain.gain.linearRampToValueAtTime(0, end + RAMP)
		osc.stop(end + RAMP)
	}
}
