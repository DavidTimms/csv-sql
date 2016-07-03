'use strict';

Object.defineProperty(exports, "__esModule", {
    value: true
});
exports.performFilter = performFilter;

var _evaluateExpression = require('./evaluate-expression');

function performFilter(testExpression) {
    if (!testExpression) return function (row) {
        return row;
    };

    return function (row) {
        return (0, _evaluateExpression.evaluateExpression)(testExpression, row) ? row : null;
    };
}