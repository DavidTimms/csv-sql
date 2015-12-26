'use strict';

Object.defineProperty(exports, '__esModule', {
	value: true
});
exports.performSelect = performSelect;

function _toConsumableArray(arr) { if (Array.isArray(arr)) { for (var i = 0, arr2 = Array(arr.length); i < arr.length; i++) arr2[i] = arr[i]; return arr2; } else { return Array.from(arr); } }

function performSelect(query) {
	return function (inRow) {
		var outRow = {};
		var outputColumns = query.outputColumns;
		if (outputColumns === '*') {
			return inRow;
		}
		for (var i = 0; i < outputColumns.length; i++) {
			var value = evaluateExpression(outputColumns[i].expression, inRow);
			outRow[outputColumns[i].name] = value;
		}
		return outRow;
	};
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
				var argValues = exp.arguments.map(function (arg) {
					return evaluateExpression(arg, context);
				});
				return functions[exp.functionName].apply(functions, _toConsumableArray(argValues));
			}
			throw ReferenceError('SQL function not found: ' + exp.functionName);
		case 'binaryExpression':
			return performBinaryOperation(exp.operator, evaluateExpression(exp.left, context), evaluateExpression(exp.right, context));
		default:
			throw Error('Unexpected expression type: ' + exp.type);
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
			throw Error('Unknown operator: ' + operator);
	}
}

function str(value) {
	if (value === null || value === undefined) return '';else return String(value);
}

var functions = {
	UPPERCASE: function UPPERCASE(s) {
		return s === null && s === undefined ? null : String(s).toUpperCase();
	},
	LOWERCASE: function LOWERCASE(s) {
		return s === null && s === undefined ? null : String(s).toLowerCase();
	} };