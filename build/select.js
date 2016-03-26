'use strict';

Object.defineProperty(exports, '__esModule', {
    value: true
});
exports.performSelect = performSelect;

var _evaluateExpression = require('./evaluate-expression');

function performSelect(query) {
    return function (inRow) {
        var outRow = {};
        var outputColumns = query.select;
        if (outputColumns === '*') {
            if (inRow.hasOwnProperty('_aggregateValues')) {
                delete inRow._aggregateValues;
            }
            return inRow;
        }
        for (var i = 0; i < outputColumns.length; i++) {
            var value = (0, _evaluateExpression.evaluateExpression)(outputColumns[i].expression, inRow);
            outRow[outputColumns[i].name] = value;
        }
        return outRow;
    };
}