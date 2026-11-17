export const DOT = '•'
export const DASH = '–'

/** Shorthand: morse('.-') -> DOT + DASH. The only place raw '.'/'-' appear. */
const morse = (shorthand: string) =>
	[...shorthand].map((s) => (s === '.' ? DOT : DASH)).join('')

export type MorseNode = {
	letter: string
	code: string
	/** 1-based CSS grid position, tuned to mirror the printed chart */
	col: number
	row: number
}

const node = (letter: string, code: string, col: number, row: number): MorseNode => ({
	letter,
	code,
	col,
	row
})

export const nodes: MorseNode[] = [
	// main line (left = dot, right = dash)
	node('H', morse('....'), 1, 1),
	node('S', morse('...'), 2, 1),
	node('I', morse('..'), 3, 1),
	node('E', morse('.'), 4, 1),
	node('T', morse('-'), 6, 1),
	node('M', morse('--'), 7, 1),
	node('O', morse('---'), 8, 1),

	// under S / I / E
	node('V', morse('...-'), 2, 2),
	node('U', morse('..-'), 3, 2),
	node('F', morse('..-.'), 3, 3),
	node('A', morse('.-'), 4, 2),
	node('R', morse('.-.'), 3, 4),
	node('L', morse('.-..'), 2, 4),
	node('W', morse('.--'), 4, 5),
	node('P', morse('.--.'), 3, 5),
	node('J', morse('.---'), 4, 6),

	// under M
	node('G', morse('--.'), 7, 2),
	node('Q', morse('--.-'), 8, 2),
	node('Z', morse('--..'), 7, 3),

	// under T
	node('N', morse('-.'), 6, 4),
	node('K', morse('-.-'), 7, 4),
	node('Y', morse('-.--'), 8, 4),
	node('C', morse('-.-.'), 7, 5),
	node('D', morse('-..'), 6, 6),
	node('X', morse('-..-'), 7, 6),
	node('B', morse('-...'), 6, 7)
]

export const byCode = new Map(nodes.map((n) => [n.code, n]))

/** Nodes visited from the start to `code`, in order (excludes the start). */
export function pathTo(code: string): MorseNode[] {
	return [...code].map((_, i) => byCode.get(code.slice(0, i + 1))!)
}

export const START = { col: 5, row: 1 }

/** Grid offset from a node to its parent (the node one symbol shorter, or Start). */
export function offsetToParent({ code, col, row }: MorseNode) {
	const parent = byCode.get(code.slice(0, -1)) ?? START
	return { dx: parent.col - col, dy: parent.row - row }
}
