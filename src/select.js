
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
		case 'literal':
			return exp.value;
		case 'word':
			return context[exp.string];
		case 'call':
			if (exp.functionName in functions) {
				const argValues = exp.arguments.map(
					arg => evaluateExpression(arg, context));
				return functions[exp.functionName](...argValues);
			}
			throw ReferenceError(`SQL function not found: ${exp.functionName}`);
		case 'binaryExpression':
			return performBinaryOperation(
				exp.operator,
				evaluateExpression(exp.left, context),
				evaluateExpression(exp.right, context));
		default:
			throw Error(`Unexpected expression type: ${exp.type}`);
	}
}

function performBinaryOperation(operator, left, right) {
	switch (operator) {
		case '=':
			return str(left) === str(right);
		case '!=':
		case '<>':
			return str(left) !== str(right);
		case '>':
			return +left > +right;
		case '<':
			return +left < +right;
		case '>=':
			return +left >= +right;
		case '<=':
			return +left <= +right;
		default:
			throw Error(`Unknown operator: ${operator}`);	
	}
}

function str(value) {
	if (value === null || value === undefined) return '';
	else return String(value);
}

const functions = {
	UPPERCASE(s) {
		return s === null && s === undefined ? null : String(s).toUpperCase();
	},
	LOWERCASE(s) {
		return s === null && s === undefined ? null : String(s).toLowerCase();
	},
}
