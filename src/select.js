
export function performSelect(query) {
	return inRow => {
		const outRow = {};
		const outputColumns = query.outputColumns;
		if (outputColumns === '*') {
			return inRow;
		}
		for (var i = 0; i < outputColumns.length; i++) {
			const value = evaluateExpression(outputColumns[i].expression, inRow);
			outRow[outputColumns[i].name] = value;
		}
		return outRow;
	}
}

function evaluateExpression(exp, context) {
	switch (exp.type) {
		case 'number':
		case 'string':
			return exp.value;
		case 'word':
			return context[exp.string];
		case 'call':
			if (exp.functionName in functions) {
				const argValues = exp.arguments.map(
					arg => evaluateExpression(arg, context)
				);
				return functions[exp.functionName](...argValues);
			}
			throw ReferenceError(`SQL function not found: ${exp.functionName}`);
		default:
			throw Error(`Unexpected expression type: ${exp.type}`);
	}
}

const functions = {
	UPPERCASE(s) {
		return s === null && s === undefined ? null : String(s).toUpperCase();
	},
	LOWERCASE(s) {
		return s === null && s === undefined ? null : String(s).toLowerCase();
	},
}