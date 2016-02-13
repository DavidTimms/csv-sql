
export function evaluateExpression(exp, context) {
    switch (exp.type) {
        case 'number':
        case 'string':
        case 'literal':
            return exp.value;
        case 'identifier':
            if (context.hasOwnProperty(exp.value)) {
                return context[exp.value];
            }
            throw ReferenceError('Column not found: ' + exp.string);
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
            return Number(left) > Number(right);
        case '<':
            return Number(left) < Number(right);
        case '>=':
            return Number(left) >= Number(right);
        case '<=':
            return Number(left) <= Number(right);
        // TODO make logical operators short-circuit
        case 'OR':
            return Boolean(left) || Boolean(right);
        case 'AND':
            return Boolean(left) && Boolean(right);
        case 'LIKE':
            return str(left).search(patternToRegExp(right)) !== -1;
        default:
            throw Error(`Unknown operator: ${operator}`);   
    }
}

const escapeChars = '.[]\\^|$()?:*+{}!';

const escapeCharsRegExp = new RegExp(
    `(${escapeChars.split('').map(c => '\\' + c).join('|')})`,
    'g'
);

const patternRegExpCache = {};

export function patternToRegExp(pattern) {
    if (!patternRegExpCache.hasOwnProperty(pattern)) {
        const regExpString = pattern
            .replace(escapeCharsRegExp, '\\$1')
            .replace(/_|%/g, c => c === '_' ? '.' : '.*');
        patternRegExpCache[pattern] = new RegExp(`^${regExpString}$`, 'gi');
    }
    return patternRegExpCache[pattern];
}

const functions = {
    UPPERCASE(s) {
        return s === null && s === undefined ? null : String(s).toUpperCase();
    },
    LOWERCASE(s) {
        return s === null && s === undefined ? null : String(s).toLowerCase();
    },
    LEN(s) {
        return isNull(s) ? null : str(s).length;
    },
    COALESCE(...args) {
        for (let i = 0; i < args.length; i++) {
            if (!isNull(args[i])) return args[i];
        }
        return null;
    },
    TRIM(s, chars) {
        if (isNull(s)) return null;

        s = str(s);

        if (arguments.length < 2) {
            return s.trim();
        }
        else {
            let startIndex = 0
            let endIndex = s.length - 1;

            while (chars.indexOf(s[startIndex]) >= 0) startIndex++;
            if (startIndex === s.length) return '';
            while (chars.indexOf(s[endIndex]) >= 0) endIndex--;
            return s.substring(startIndex, endIndex + 1);
        }
    },
    LTRIM(s, chars=' \t\n\r', min=0) {
        if (isNull(s)) return null;

        s = str(s);
        let startIndex = 0

        while (chars.indexOf(s[startIndex]) >= 0 && s.length - startIndex > min) {
            startIndex++;
        }
        return s.substring(startIndex);
    },
};

functions.IFNULL = functions.COALESCE;

export function isNull(value) {
    return value === null || value === undefined || value === '';
}

export function str(value) {
    if (value === null || value === undefined) return '';
    else return String(value);
}