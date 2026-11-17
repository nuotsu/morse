/** whether keystrokes aimed at `target` are text being typed */
export const isTyping = (target: EventTarget | null) =>
	target instanceof HTMLElement &&
	(target.isContentEditable ||
		target instanceof HTMLTextAreaElement ||
		(target instanceof HTMLInputElement && target.type !== 'checkbox'))
