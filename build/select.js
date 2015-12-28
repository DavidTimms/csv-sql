'use strict';

Object.defineProperty(exports, '__esModule', {
    value: true
});
exports.performSelect = performSelect;

var _evaluateExpression = require('./evaluate-expression');

function performSelect(query) {
    return function (inRow) {
        var outRow = {};
        var outputColumns = query.outputColumns;
        if (outputColumns === '*') {
            return inRow;
        }
        for (var i = 0; i < outputColumns.length; i++) {
            var value = (0, _evaluateExpression.evaluateExpression)(outputColumns[i].expression, inRow);
            outRow[outputColumns[i].name] = value;
        }
        return outRow;
    };
}