/** whether keystrokes aimed at `target` are text being typed */
export const isTyping = (target: EventTarget | null) =>
	target instanceof HTMLElement &&
	(target.isContentEditable ||
		target instanceof HTMLTextAreaElement ||
		(target instanceof HTMLInputElement && target.type !== 'checkbox'))

/** attachment: a <details> closes when anything outside it is pressed */
export const closeOnOutside = (details: HTMLDetailsElement) => {
	const onpointerdown = (e: PointerEvent) => {
		if (details.open && !details.contains(e.target as Node)) details.open = false
	}
	window.addEventListener('pointerdown', onpointerdown)
	return () => window.removeEventListener('pointerdown', onpointerdown)
}
