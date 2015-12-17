
export function performSelect(query) {
	return inRow => {
		const outRow = {};
		const outputColumns = query.outputColumns;
		for (var i = 0; i < outputColumns.length; i++) {
			outRow[outputColumns[i].name] = inRow[outputColumns[i].expression.string];
		}
		return outRow;
	}
}
