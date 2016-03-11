import {evaluateExpression, str} from './evaluate-expression';
import {aggregateFunctions} from './aggregates';
import stream from 'stream';

class EmptyObject extends null {}
EmptyObject.prototype._hasOwnProperty = Object.prototype.hasOwnProperty;

export class GroupingStream extends stream.Transform {
    constructor({groupBy, aggregates}) {
        super({objectMode: true});

        this.aggregates = aggregates;
        this.expressions = groupBy || [];

        if (this.expressions.length > 0) {
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
        baseRow._aggregateValues = {};
        for (let i = 0; i < this.aggregates.length; i++) {
            const aggregate = this.aggregates[i];
            const initial = aggregateFunctions[aggregate.functionName].initial;
            baseRow._aggregateValues[aggregate.id] = initial;
        }
    }

    updateGroupAggregations(baseRow, row) {
        for (let i = 0; i < this.aggregates.length; i++) {
            const aggregate = this.aggregates[i];
            const reducer = aggregateFunctions[aggregate.functionName].reducer;
            const current = baseRow._aggregateValues[aggregate.id];
            const rowValue = evaluateExpression(aggregate.arguments[0], row);
            baseRow._aggregateValues[aggregate.id] = reducer(current, rowValue);
        }
    }
}
