import { $, read } from 'refui'

export function addS(val) {
	return $(() => (read(val) === 1 ? '' : 's'))
}
