
import {evaluateExpression} from './evaluate-expression';

export function performFilter(testExpression) {
    if (!testExpression) return row => row;

    return row => {
        return evaluateExpression(testExpression, row) ? row : null;
    }
}
