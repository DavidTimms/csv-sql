import {merge} from './utils';
import * as ast from './ast';
import {isNull} from './evaluate-expression';

export function identifyAggregatesInQuery(query) {
    // Converts any calls to aggregate functions in the output columns,
    // the ORDER BY clause, or the HAVING clause to aggregate expressions
    // and stores a list of the aggregate function calls separately on the
    // query. This is used to know which expressions need to be evaluated
    // at the grouping stage, rather than the SELECT stage.

    // TODO validate that aggregates are not used in WHERE or GROUP BY clauses

    let select, selectAggs;

    if (query.select === '*') {
        select = query.select;
        selectAggs = [];
    }
    else {
        ({
            expression: select,
            aggregates: selectAggs,
        } = identifyAggregatesInExpression(query.select));
    }

    const {
        expression: having,
        aggregates: havingAggs,
    } = identifyAggregatesInExpression(query.having);

    const {
        expression: orderBy,
        aggregates: orderByAggs,
    } = identifyAggregatesInExpression(query.orderBy);

    const combinedAggs = selectAggs.concat(havingAggs, orderByAggs);
    const aggregates = deduplicateAggregates(combinedAggs);

    return merge(query, {select, orderBy, having, aggregates});
}

export function identifyAggregatesInExpression(exp) {
    let expWithAggregates;

    switch (exp && exp.type) {
        case 'call':
            if (aggregateFunctions.hasOwnProperty(exp.functionName)) {
                // Convert the 'call' node to an 'aggregate' node
                // and add it to the list of aggregates

                if (exp.arguments.some(expressionContainsAggregate)) {
                    throw Error('Calls to aggregate functions cannot be nested');
                }
                const aggregateExp = ast.aggregate(exp.functionName, exp.arguments);
                expWithAggregates = {
                    aggregates: [aggregateExp],
                    expression: aggregateExp,
                };
            }
            else {
                // recursively search for aggregates in the function
                // call's arguments
                const initial = {
                    aggregates: [],
                    expression: merge(exp, {arguments: []}),
                };
                expWithAggregates = exp.arguments
                    .map(identifyAggregatesInExpression)
                    .reduce((current, {aggregates, expression}) => {
                        current.aggregates.push(...aggregates);
                        current.expression.arguments.push(expression);
                        return current;
                    }, initial);
            }
            break;
        case 'binaryExpression':
            // recursively search for aggregates in the operands of the
            // binary expression
            const left = identifyAggregatesInExpression(exp.left);
            const right = identifyAggregatesInExpression(exp.right);
            expWithAggregates = {
                aggregates: left.aggregates.concat(right.aggregates),
                expression: merge(exp, {
                    left: left.expression,
                    right: right.expression,
                }),
            };
            break;
        case 'namedExpression':
        case 'orderingTerm':
            const {expression, aggregates} = 
                identifyAggregatesInExpression(exp.expression);

            expWithAggregates = {
                aggregates,
                expression: merge(exp, {expression}),
            };
            break;
        default:
            if (exp instanceof Array) {
                const itemResults = exp.map(identifyAggregatesInExpression);
                const concatAggs = (all, {aggregates}) => all.concat(aggregates);
                expWithAggregates = {
                    aggregates: itemResults.reduce(concatAggs, []),
                    expression: itemResults.map(result => result.expression),
                };
            }
            else {
                // return the expression unchanged, a it is a basic type
                // that cannot contain aggregates
                expWithAggregates = {
                    aggregates: [],
                    expression: exp,
                };                
            }
    }

    expWithAggregates.aggregates = deduplicateAggregates(expWithAggregates.aggregates);
    return expWithAggregates;
}

function deduplicateAggregates(aggregates) {
    return Array.from(
        aggregates
            .reduce((map, aggregate) => map.set(aggregate.id, aggregate), new Map())
            .values()
    );
}

function expressionContainsAggregate(exp) {
    return identifyAggregatesInExpression(exp).aggregates.length > 0;
}

export const aggregateFunctions = {
    COUNT: {
        initial: 0,
        reducer: (subTotal, value) => subTotal + (isNull(value) ? 0 : 1),
    },
    MIN: {
        initial: null,
        reducer: (currentMin, value) => {
            if (isNull(value)) {
                return currentMin;
            }
            const numValue = Number(value);
            if (isNull(currentMin) || numValue < currentMin) {
                return numValue;
            }
            else {
                return currentMin;
            }
        }
    },
    MAX: {
        initial: null,
        reducer: (currentMax, value) => {
            if (isNull(value)) {
                return currentMax;
            }
            const numValue = Number(value);
            if (isNull(currentMax) || numValue > currentMax) {
                return numValue;
            }
            else {
                return currentMax;
            }
        }
    },
    SUM: {
        initial: null,
        reducer: (total, value) => {
            if (value === undefined) {
                return total;
            }
            return Number(total) + Number(value);
        }
    },
    GROUP_CONCAT: {
        initial: null,
        reducer: (s, value) => {
            if (isNull(value)) {
                return s;
            }
            return (s || '') + String(value);
        }
    },
};
