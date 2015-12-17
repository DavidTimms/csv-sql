
export function performLimit({limit}) {
	let rowCount = 0;
	return row => {
		if (rowCount >= limit) {
			return null;
		}
		else {
			rowCount += 1;
			return row;
		}
	}
}
