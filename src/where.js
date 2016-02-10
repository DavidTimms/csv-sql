
import {evaluateExpression} from './evaluate-expression';

export function performWhere({where}) {
    if (!where) return row => row;

    return row => {
        return evaluateExpression(where, row) ? row : null;
    }
}
