'use strict';

Object.defineProperty(exports, "__esModule", {
    value: true
});
exports.aggregateFunctions = undefined;
exports.identifyAggregatesInQuery = identifyAggregatesInQuery;
exports.identifyAggregatesInExpression = identifyAggregatesInExpression;

var _utils = require('./utils');

var _ast = require('./ast');

var ast = _interopRequireWildcard(_ast);

var _evaluateExpression = require('./evaluate-expression');

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj.default = obj; return newObj; } }

function _toConsumableArray(arr) { if (Array.isArray(arr)) { for (var i = 0, arr2 = Array(arr.length); i < arr.length; i++) { arr2[i] = arr[i]; } return arr2; } else { return Array.from(arr); } }

function identifyAggregatesInQuery(query) {
    // Converts any calls to aggregate functions in the output columns,
    // the ORDER BY clause, or the HAVING clause to aggregate expressions
    // and stores a list of the aggregate function calls separately on the
    // query. This is used to know which expressions need to be evaluated
    // at the grouping stage, rather than the SELECT stage.

    // TODO validate that aggregates are not used in WHERE or GROUP BY clauses

    var select = void 0,
        selectAggs = void 0;

    if (query.select === '*') {
        select = query.select;
        selectAggs = [];
    } else {
        var _identifyAggregatesIn = identifyAggregatesInExpression(query.select);

        select = _identifyAggregatesIn.expression;
        selectAggs = _identifyAggregatesIn.aggregates;
    }

    var _identifyAggregatesIn2 = identifyAggregatesInExpression(query.having);

    var having = _identifyAggregatesIn2.expression;
    var havingAggs = _identifyAggregatesIn2.aggregates;

    var _identifyAggregatesIn3 = identifyAggregatesInExpression(query.orderBy);

    var orderBy = _identifyAggregatesIn3.expression;
    var orderByAggs = _identifyAggregatesIn3.aggregates;


    var combinedAggs = selectAggs.concat(havingAggs, orderByAggs);
    var aggregates = deduplicateAggregates(combinedAggs);

    return (0, _utils.merge)(query, { select: select, orderBy: orderBy, having: having, aggregates: aggregates });
}

function identifyAggregatesInExpression(exp) {
    var expWithAggregates = void 0;

    switch (exp && exp.type) {
        case 'call':
            if (aggregateFunctions.hasOwnProperty(exp.functionName)) {
                // Convert the 'call' node to an 'aggregate' node
                // and add it to the list of aggregates

                if (exp.arguments.some(expressionContainsAggregate)) {
                    throw Error('Calls to aggregate functions cannot be nested');
                }
                var aggregateExp = ast.aggregate(exp.functionName, exp.arguments);
                expWithAggregates = {
                    aggregates: [aggregateExp],
                    expression: aggregateExp
                };
            } else {
                // recursively search for aggregates in the function
                // call's arguments
                var initial = {
                    aggregates: [],
                    expression: (0, _utils.merge)(exp, { arguments: [] })
                };
                expWithAggregates = exp.arguments.map(identifyAggregatesInExpression).reduce(function (current, _ref) {
                    var _current$aggregates;

                    var aggregates = _ref.aggregates;
                    var expression = _ref.expression;

                    (_current$aggregates = current.aggregates).push.apply(_current$aggregates, _toConsumableArray(aggregates));
                    current.expression.arguments.push(expression);
                    return current;
                }, initial);
            }
            break;
        case 'binaryExpression':
            // recursively search for aggregates in the operands of the
            // binary expression
            var left = identifyAggregatesInExpression(exp.left);
            var right = identifyAggregatesInExpression(exp.right);
            expWithAggregates = {
                aggregates: left.aggregates.concat(right.aggregates),
                expression: (0, _utils.merge)(exp, {
                    left: left.expression,
                    right: right.expression
                })
            };
            break;
        case 'namedExpression':
        case 'orderingTerm':
            var _identifyAggregatesIn4 = identifyAggregatesInExpression(exp.expression);

            var expression = _identifyAggregatesIn4.expression;
            var aggregates = _identifyAggregatesIn4.aggregates;


            expWithAggregates = {
                aggregates: aggregates,
                expression: (0, _utils.merge)(exp, { expression: expression })
            };
            break;
        default:
            if (exp instanceof Array) {
                var itemResults = exp.map(identifyAggregatesInExpression);
                var concatAggs = function concatAggs(all, _ref2) {
                    var aggregates = _ref2.aggregates;
                    return all.concat(aggregates);
                };
                expWithAggregates = {
                    aggregates: itemResults.reduce(concatAggs, []),
                    expression: itemResults.map(function (result) {
                        return result.expression;
                    })
                };
            } else {
                // return the expression unchanged, a it is a basic type
                // that cannot contain aggregates
                expWithAggregates = {
                    aggregates: [],
                    expression: exp
                };
            }
    }

    expWithAggregates.aggregates = deduplicateAggregates(expWithAggregates.aggregates);
    return expWithAggregates;
}

function deduplicateAggregates(aggregates) {
    return Array.from(aggregates.reduce(function (map, aggregate) {
        return map.set(aggregate.id, aggregate);
    }, new Map()).values());
}

function expressionContainsAggregate(exp) {
    return identifyAggregatesInExpression(exp).aggregates.length > 0;
}

var aggregateFunctions = exports.aggregateFunctions = {
    COUNT: {
        initial: 0,
        reducer: function reducer(subTotal, value) {
            return subTotal + ((0, _evaluateExpression.isNull)(value) ? 0 : 1);
        }
    },
    MIN: {
        initial: null,
        reducer: function reducer(currentMin, value) {
            if ((0, _evaluateExpression.isNull)(value)) {
                return currentMin;
            }
            var numValue = Number(value);
            if ((0, _evaluateExpression.isNull)(currentMin) || numValue < currentMin) {
                return numValue;
            } else {
                return currentMin;
            }
        }
    },
    MAX: {
        initial: null,
        reducer: function reducer(currentMax, value) {
            if ((0, _evaluateExpression.isNull)(value)) {
                return currentMax;
            }
            var numValue = Number(value);
            if ((0, _evaluateExpression.isNull)(currentMax) || numValue > currentMax) {
                return numValue;
            } else {
                return currentMax;
            }
        }
    },
    SUM: {
        initial: null,
        reducer: function reducer(total, value) {
            if (value === undefined) {
                return total;
            }
            return Number(total) + Number(value);
        }
    },
    GROUP_CONCAT: {
        initial: null,
        reducer: function reducer(s, value) {
            if ((0, _evaluateExpression.isNull)(value)) {
                return s;
            }
            return (s || '') + String(value);
        }
    }
};