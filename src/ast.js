import {merge, md5} from './utils';
import {OPERATORS} from './operators';

export function literal(value) {
    return {
        type: 'literal',
        value,
        string: String(value).toUpperCase(),
    };
}

export function string(s) {
    return {
        type: 'string',
        value: s,
        string: quoteString(s, '"'),
    }
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
export const parOpen = tokenMaker('parOpen', '(');
export const parClose = tokenMaker('parClose', ')');
export const star = tokenMaker('star', '*');
export const comma = tokenMaker('comma', ',');
export const semicolon = tokenMaker('semicolon', ';');

export function operator(s) {
    const upper = s.toUpperCase();

    return {
        type: 'operator',
        string: upper,
        value: upper,
        precedence: OPERATORS[upper].precedence,
        associativity: OPERATORS[upper].associativity,
    }
}

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

export function aggregate(...callArgs) {
    const callNode = call(...callArgs);
    return merge(callNode, {type: 'aggregate', id: md5(callNode.string)});
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

export function caseIf(cases, elseExpression=null) {
    const node = {
        type: 'caseIf',
        cases,
        elseExpression,
    };

    node.string = caseString(node);
    return node;
}

export function caseSwitch(switchExpression, cases, elseExpression=null) {
    const node = {
        type: 'caseSwitch',
        switchExpression,
        cases,
        elseExpression,
    };

    node.string = caseString(node);
    return node;
}

function caseString({switchExpression, cases, elseExpression}) {
    const switchString = switchExpression ? ` ${switchExpression.string}` : '';
    const elseString = elseExpression ? ` ELSE ${elseExpression.string}` : '';

    return `CASE${switchString} ${cases.map(c => c.string).join(' ')}${elseString} END`;
}

export function whenThen(when, then) {
    return {
        type: 'whenThen',
        when,
        then,
        string: `WHEN ${when.string} THEN ${then.string}`,
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

export function orderingTerm(expression, direction='asc') {
    return {
        type: 'orderingTerm',
        expression,
        direction: direction.toLowerCase(),
    };
}

export function query({select,
                       from,
                       where=null,
                       groupBy=null,
                       having=null,
                       orderBy=null,
                       limit=null,
                       offset=null,
                       aggregates=null}) {

    return {
        select,
        from,
        where,
        groupBy,
        having,
        orderBy,
        limit,
        offset,
        aggregates,
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
