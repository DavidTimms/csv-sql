
export function evaluateExpression(exp, context) {
    switch (exp.type) {
        case 'number':
        case 'string':
        case 'literal':
            return exp.value;
        case 'word':
            return context[exp.string];
        case 'call':
            if (exp.functionName in functions) {
                const argValues = exp.arguments.map(
                    arg => evaluateExpression(arg, context));
                return functions[exp.functionName](...argValues);
            }
            throw ReferenceError(`SQL function not found: ${exp.functionName}`);
        case 'binaryExpression':
            return performBinaryOperation(
                exp.operator,
                evaluateExpression(exp.left, context),
                evaluateExpression(exp.right, context));
        default:
            throw Error(`Unexpected expression type: ${exp.type}`);
    }
}

function performBinaryOperation(operator, left, right) {
    switch (operator) {
        case '=':
            return str(left) === str(right);
        case '!=':
        case '<>':
            return str(left) !== str(right);
        case '>':
            return +left > +right;
        case '<':
            return +left < +right;
        case '>=':
            return +left >= +right;
        case '<=':
            return +left <= +right;
        // TODO make logical operators short-circuit
        case 'OR':
            return Boolean(left) || Boolean(right);
        case 'AND':
            return Boolean(left) && Boolean(right);
        default:
            throw Error(`Unknown operator: ${operator}`);   
    }
}

function str(value) {
    if (value === null || value === undefined) return '';
    else return String(value);
}

const functions = {
    UPPERCASE(s) {
        return s === null && s === undefined ? null : String(s).toUpperCase();
    },
    LOWERCASE(s) {
        return s === null && s === undefined ? null : String(s).toLowerCase();
    },
    COALESCE(...args) {
        for (let i = 0; i < args.length; i++) {
            if (!isNull(args[i])) return args[i];
        }
        return null;
    },
};

functions.IFNULL = functions.COALESCE;

export function isNull(value) {
    return value === null || value === undefined || value === '';
}