export const DOT = '•'
export const DASH = '–'

/** Shorthand: morse('.-') -> DOT + DASH. The only place raw '.'/'-' appear. */
const morse = (shorthand: string) => [...shorthand].map((s) => (s === '.' ? DOT : DASH)).join('')

export type Group = 'alphabet' | 'numbers' | 'punctuation'

const table: Record<Group, Record<string, string>> = {
	alphabet: {
		E: '.',
		T: '-',
		I: '..',
		A: '.-',
		N: '-.',
		M: '--',
		S: '...',
		U: '..-',
		R: '.-.',
		W: '.--',
		D: '-..',
		K: '-.-',
		G: '--.',
		O: '---',
		H: '....',
		V: '...-',
		F: '..-.',
		L: '.-..',
		P: '.--.',
		J: '.---',
		B: '-...',
		X: '-..-',
		C: '-.-.',
		Y: '-.--',
		Z: '--..',
		Q: '--.-'
	},
	numbers: {
		1: '.----',
		2: '..---',
		3: '...--',
		4: '....-',
		5: '.....',
		6: '-....',
		7: '--...',
		8: '---..',
		9: '----.',
		0: '-----'
	},
	punctuation: {
		'.': '.-.-.-',
		',': '--..--',
		'?': '..--..',
		"'": '.----.',
		'!': '-.-.--',
		'/': '-..-.',
		'(': '-.--.',
		')': '-.--.-',
		'&': '.-...',
		':': '---...',
		';': '-.-.-.',
		'=': '-...-',
		'+': '.-.-.',
		'-': '-....-',
		'@': '.--.-.'
	}
}

export type MorseNode = {
	/** the character; empty for a prefix that isn't a character itself */
	char: string
	code: string
	/** which group the character belongs to; null for a prefix that isn't a character */
	group: Group | null
	/** an enabled character. The rest are only here because an enabled one passes through them */
	active: boolean
	/** 1-based CSS grid position */
	col: number
	row: number
	/** grid offset to the parent node (or Start) */
	dx: number
	dy: number
}

export type Chart = {
	nodes: MorseNode[]
	byCode: Map<string, MorseNode>
	start: { col: number; row: number }
	cols: number
	rows: number
}

const allChars = new Map<string, { char: string; group: Group }>()
for (const [group, entries] of Object.entries(table) as [Group, Record<string, string>][]) {
	for (const [char, shorthand] of Object.entries(entries)) {
		allChars.set(morse(shorthand), { char, group })
	}
}

// ---------------------------------------------------------------------------
// layout: an HV drawing. Every node has at most one "horizontal" child (the symbol
// that matches its half's first symbol) placed to the side in the same row, and one
// "vertical" child placed below in the same column, so every line is straight and
// nothing overlaps. Each node picks whichever of two compositions is smaller.

type Pos = Map<string, [number, number]>
type Box = { pos: Pos; w: number; h: number }

function layout(known: Set<string>, code: string, side: string, other: string): Box {
	const hCode = code + side
	const vCode = code + other
	const pos: Pos = new Map([[code, [0, 0]]])

	const place = (box: Box, dx: number, dy: number) => {
		for (const [k, [x, y]] of box.pos) pos.set(k, [x + dx, y + dy])
	}

	const hasH = known.has(hCode)
	const hasV = known.has(vCode)

	if (!hasH && !hasV) return { pos, w: 1, h: 1 }

	if (!hasV) {
		const h = layout(known, hCode, side, other)
		place(h, 1, 0)
		return { pos, w: h.w + 1, h: h.h }
	}

	if (!hasH) {
		const v = layout(known, vCode, side, other)
		place(v, 0, 1)
		return { pos, w: v.w, h: v.h + 1 }
	}

	const h = layout(known, hCode, side, other)
	const v = layout(known, vCode, side, other)

	// A: vertical subtree goes below the horizontal one
	const aw = Math.max(1 + h.w, v.w)
	const ah = h.h + v.h
	// B: horizontal subtree goes beside the vertical one
	const bw = v.w + h.w
	const bh = Math.max(v.h + 1, h.h)

	if (aw + ah < bw + bh || (aw + ah === bw + bh && aw * ah <= bw * bh)) {
		place(h, 1, 0)
		place(v, 0, h.h)
		return { pos, w: aw, h: ah }
	}

	place(h, v.w, 0)
	place(v, 0, 1)
	return { pos, w: bw, h: bh }
}

const empty: Box = { pos: new Map(), w: 0, h: 0 }
const cache = new Map<string, Chart>()

/**
 * The chart for the enabled groups. Only enabled characters, and the nodes that lead
 * to them, are laid out, so the grid is as small as it can be.
 */
export function buildChart(enabled: Record<Group, boolean>): Chart {
	const key = (Object.keys(table) as Group[]).map((g) => +enabled[g]).join('')
	const cached = cache.get(key)
	if (cached) return cached

	const active = new Set<string>()
	for (const [code, { group }] of allChars) if (enabled[group]) active.add(code)

	const known = new Set<string>(active)
	for (const code of active) {
		for (let i = 1; i < code.length; i++) known.add(code.slice(0, i))
	}

	// dots run left, dashes run right; the other symbol drops down
	const left = known.has(DOT) ? layout(known, DOT, DOT, DASH) : empty
	const right = known.has(DASH) ? layout(known, DASH, DASH, DOT) : empty

	const start = { col: left.w + 1, row: 1 }

	const placed = [...known].map((code) => {
		const isLeft = code.startsWith(DOT)
		const [x, y] = (isLeft ? left : right).pos.get(code)!
		const entry = allChars.get(code)

		return {
			char: entry?.char ?? '',
			code,
			group: entry?.group ?? null,
			active: active.has(code),
			col: isLeft ? left.w - x : left.w + 2 + x,
			row: y + 1
		}
	})

	const at = new Map(placed.map((n) => [n.code, n]))
	const nodes: MorseNode[] = placed.map((n) => {
		const parent = at.get(n.code.slice(0, -1)) ?? start
		return { ...n, dx: parent.col - n.col, dy: parent.row - n.row }
	})

	const chart: Chart = {
		nodes,
		byCode: new Map(nodes.map((n) => [n.code, n])),
		start,
		cols: left.w + 1 + right.w,
		rows: Math.max(left.h, right.h, 1)
	}

	cache.set(key, chart)
	return chart
}

const everything: Record<Group, boolean> = { alphabet: true, numbers: true, punctuation: true }

/** Whether `code` is a character, or the start of one, in any group (enabled or not). */
export const isKnownCode = (code: string) => buildChart(everything).byCode.has(code)

/** Whether a character in an enabled group has a code that continues `code`. */
export function canExtend(code: string, enabled: Record<Group, boolean> = everything) {
	for (const [other, { group }] of allChars) {
		if (other.length > code.length && other.startsWith(code) && enabled[group]) return true
	}
	return false
}

/** The character for a code in any group, or '' if it's only a prefix. */
export const decodeCode = (code: string) => allChars.get(code)?.char ?? ''

/** Nodes visited from the start to `code`, in order (excludes the start). */
export function pathTo(chart: Chart, code: string): MorseNode[] {
	return [...code].map((_, i) => chart.byCode.get(code.slice(0, i + 1))!)
}

const codeByChar = new Map([...allChars].map(([code, { char }]) => [char, code]))

/** Morse code for a single character (case-insensitive), or undefined if it has none. */
export const encodeChar = (char: string) => codeByChar.get(char.toUpperCase())
