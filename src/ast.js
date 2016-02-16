
export function literal(value) {
    let string;
    if (typeof value === 'string') {
        string = quoteString(value, '"');
    }
    else {
        string = String(value).toUpperCase();
    }
    return {
        type: 'literal',
        value,
        string,
    };
}

function tokenMaker(type, defaultString = null) {
    return (s = defaultString) => {
        const upper = s.toUpperCase();
        return {
            type,
            string: upper,
            value: upper,
        };
    };
}

export const keyword = tokenMaker('keyword');
export const operator = tokenMaker('operator');
export const parOpen = tokenMaker('parOpen', '(');
export const parClose = tokenMaker('parClose', ')');
export const star = tokenMaker('star', '*');
export const comma = tokenMaker('comma', ',');
export const semicolon = tokenMaker('semicolon', ';');

export function identifier(value) {
    let string = value;

    const basicIdentifierRegex = /^[a-z_]\w*$/i;
    if (!basicIdentifierRegex.test(value)) {
        string = quoteString(value, '`');
    }

    return {
        type: 'identifier',
        string,
        value,
    };
}

export function number(num) {
    return {
        type: 'number',
        string: String(num),
        value: Number(num),
    };
}

export function call(functionName, args=[]) {
    functionName = functionName.toUpperCase();
    return {
        type: 'call',
        functionName,
        arguments: args,
        string: `${functionName}(${args.map(arg => arg.string).join(', ')})`,
    };
}

export function binaryExpression(operator, left, right) {
    return {
        type: 'binaryExpression',
        operator,
        left,
        right,
        string: `${parenWrap(left)} ${operator} ${parenWrap(right)}`,
    }
}

export function namedExpression(expression, name=null) {
    if (!name) {
        name = expression.type === 'identifier' ? expression.value : expression.string;
    }
    return {
        type: 'namedExpression',
        expression,
        name,
    }
}

function parenWrap(exp) {
    if (exp.type === 'binaryExpression') {
        return `(${exp.string})`;
    }
    else return exp.string;
}

function quoteString(s, delimiter) {
    // TODO properly escape delimiters in strings when quoting
    return delimiter + s.split(delimiter).join('\\' + delimiter) + delimiter;
}
