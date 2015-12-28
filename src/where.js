
import {evaluateExpression} from './evaluate-expression';

export function performWhere({condition}) {
    if (!condition) return row => row;

    return row => {
        return evaluateExpression(condition, row) ? row : null;
    }
}
