
import {evaluateExpression} from './evaluate-expression';

export function performSelect(query) {
    return inRow => {
        const outRow = {};
        const outputColumns = query.select;
        if (outputColumns === '*') {
            if (inRow.hasOwnProperty('_aggregateValues')) {
                delete inRow._aggregateValues;
            }
            return inRow;
        }
        for (var i = 0; i < outputColumns.length; i++) {
            const value = evaluateExpression(outputColumns[i].expression, inRow);
            outRow[outputColumns[i].name] = value;
        }
        return outRow;
    }
}
