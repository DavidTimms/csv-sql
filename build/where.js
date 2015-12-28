'use strict';

Object.defineProperty(exports, '__esModule', {
    value: true
});
exports.performWhere = performWhere;

var _evaluateExpression = require('./evaluate-expression');

function performWhere(_ref) {
    var condition = _ref.condition;

    if (!condition) return function (row) {
        return row;
    };

    return function (row) {
        return (0, _evaluateExpression.evaluateExpression)(condition, row) ? row : null;
    };
}