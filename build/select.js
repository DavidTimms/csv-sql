"use strict";

Object.defineProperty(exports, "__esModule", {
	value: true
});
exports.performSelect = performSelect;

function performSelect(query, inRow) {
	var outRow = {};
	var outputColumns = query.outputColumns;
	for (var i = 0; i < outputColumns.length; i++) {
		outRow[outputColumns[i].name] = inRow[outputColumns[i].expression.string];
	}
	return outRow;
}