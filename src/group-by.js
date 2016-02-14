import {merge, randomString} from './utils';
import {evaluateExpression, isNull, str} from './evaluate-expression';
import stream from 'stream';

class EmptyObject extends null {}
EmptyObject.prototype._hasOwnProperty = Object.prototype.hasOwnProperty;

export class GroupingStream extends stream.Transform {
    constructor({groupBy, aggregations}) {
        super({objectMode: true});

        this.expressions = groupBy;
        if (groupBy.length > 0) {
            this.grouping = new EmptyObject();
        }
        else {
            this.grouping = null;
        }
    }

    _transform(row, encoding, done) {
        let grouping = this.grouping;
        let expressionCount = this.expressions.length;

        for (let i = 0; i < expressionCount; i++) {
            const value = str(evaluateExpression(this.expressions[i], row));
            if (grouping._hasOwnProperty(value)) {
                grouping = grouping[value];
            }
            else {
                let child;
                if (i === (expressionCount - 1)) {
                    child = row;
                    this.createGroupAggregations(row);
                }
                else {
                    child = new EmptyObject();
                }
                grouping[value] = child;
                grouping = child;
            }
        }

        // set the root grouping to be the first row for aggregations
        // with no GROUP BY expressions
        if (grouping === null) {
            grouping = this.grouping = row;
            this.createGroupAggregations(row);
        }
        this.updateGroupAggregations(grouping, row);

        done();
    }

    _flush(done) {
        this.flushGroups(this.grouping, this.expressions.length);
        done();
    }

    flushGroups(grouping, depth) {
        if (depth > 0) {
            const groupKeys = Object.keys(grouping);
            for (let i = 0; i < groupKeys.length; i++) {
                this.flushGroups(grouping[groupKeys[i]], depth - 1);
            }
        }
        else {
            this.push(grouping);
        }
    }

    createGroupAggregations(baseRow) {
        return;
        row._aggregationValues = [];
        for (let i = 0; i < this.aggregations.length; i++) {

        }
    }

    updateGroupAggregations(baseRow, row) {

    }
}

export function identifyAggregatesInQuery(query) {

    // TODO validate that aggregates are not used in WHERE or GROUP BY clauses


    const select = query.select;
    const orderBy = query.orderBy;
    const having = query.having;

    return merge(query, {select, orderBy, having, aggregates});
}

export function identifyAggregatesInExpression(exp) {
    switch (exp.type) {
        case 'call':
            if (aggregateFunctions.hasOwnProperty(exp.functionName)) {
                // Convert the 'call' node to an 'aggregate' node
                // and add it to the list of aggregates

                if (exp.arguments.some(expressionContainsAggregate)) {
                    throw Error('Calls to aggregate functions cannot be nested');
                }
                const aggregateExp = merge(exp, {type: 'aggregate', id: randomString()});
                return {
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
                return exp.arguments
                    .map(identifyAggregatesInExpression)
                    .reduce((current, {aggregates, expression}) => {
                        current.aggregates.push(...aggregates);
                        current.expression.arguments.push(expression);
                        return current;
                    }, initial);
            }
        case 'binaryExpression':
            // recursively search for aggregates in the operands of the
            // binary expression
            const left = identifyAggregatesInExpression(exp.left);
            const right = identifyAggregatesInExpression(exp.right);
            return {
                aggregates: left.aggregates.concat(right.aggregates),
                expression: merge(exp, {
                    left: left.expression,
                    right: right.expression,
                }),
            };
        default:
            // return the expresssion unchanged, a it is a basic type
            // that cannot contain aggregates
            return {
                aggregates: [],
                expression: exp,
            };
    }
}

function expressionContainsAggregate(exp) {
    return identifyAggregatesInExpression(exp).aggregates.length > 0;
}

const aggregateFunctions = {
    COUNT: {
        initial: 0,
        reducer: (subTotal, value) => subTotal + (isNull(value) ? 0 : 1),
    },
};