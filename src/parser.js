import {merge} from './utils';
import {tokenize} from './tokenizer';
import * as ast from './ast';


export function parseQuery(query) {
    const {node, rest} = parseSubQuery(query).ifNextToken(isType('semicolon'), curr => 
        curr.then(semicolon)
    );

    if (rest.length > 0) {
        const restString = rest.map(token => token.string).join(' ');
        throw SyntaxError(`Parser completed with input remaining: "${restString}"`);
    }
    return node;
}

function parseSubQuery(query) {
    const tokens = tokenize(query);

    return parser(tokens)
        .then(keyword('SELECT'))
        .bind('select', outputColumns)
        .then(keyword('FROM'))
        .bind('from', tableName)
        .bind('where', createConditionClause('WHERE'))
        .map(parseGroupByHaving)
        .bind('orderBy', orderByClause)
        .bind('limit', limitClause)
        .bind('offset', offsetClause)
        .mapNode(ast.query);
}

function parseGroupByHaving(parser) {
    return parser
        .ifNextToken(isKeyword('GROUP'), curr =>
            curr.then(keyword('GROUP'))
                .then(keyword('BY'))
                .bind('groupBy', many(expression, {separator: comma}))
                .bind('having', createConditionClause('HAVING'))
        )
        .mapNode(node => merge({groupBy: null, having: null}, node));
}

function createConditionClause(conditionType) {
    return tokens => 
        parser(tokens).ifNextToken(isKeyword(conditionType), curr =>
            curr.then(keyword(conditionType))
                .just(expression)
        );
}

function orderByClause(tokens) {
    return parser(tokens).ifNextToken(isKeyword('ORDER'), curr =>
        curr.then(keyword('ORDER'))
            .then(keyword('BY'))
            .just(many(orderingTerm, {separator: comma}))
    );
}

function orderingTerm(tokens) {
    return parser(tokens)
        .bind('expression', expression)
        .bind('direction', tokens => {
            const [first, ...rest] = tokens;
            if (isKeyword('ASC', first) || isKeyword('DESC', first)) {
                return parser(rest, first.string);
            }
            return parser(tokens, 'ASC');
        })
        .mapNode(node => ast.orderingTerm(node.expression, node.direction));
}

function limitClause(tokens) {
    return parser(tokens).ifNextToken(isKeyword('LIMIT'), curr =>
        curr.then(keyword('LIMIT')).just(number)
    );
}

function offsetClause(tokens) {
    return parser(tokens).ifNextToken(isKeyword('OFFSET'), curr =>
        curr.then(keyword('OFFSET')).just(number)
    );
}

function atom([first, ...rest]) {
    // grouped expression
    if (isType('parOpen', first)) {
        return expression(rest).then(parClose);
    }
    // literal TRUE, FALSE, or NULL
    else if (isType('keyword', first)) {
        const s = first.string;
        if (s === 'TRUE' || s === 'FALSE' || s === 'NULL') {
            return parser(rest, ast.literal(JSON.parse(s.toLowerCase())));
        }
    }
    // function call
    else if (isType('identifier', first) && isType('parOpen', rest[0])) {
        const functionName = first.value;

        if (functionName.toUpperCase() === 'COUNT' && isType('star', rest[1])) {
            return parser(rest.slice(2))
                .then(parClose)
                .mapNode(node => ast.call(functionName, [ast.star()]));
        }

        return parser(rest.slice(1))
            .bind('arguments', many(expression, {separator: comma, min: 0}))
            .then(parClose)
            .mapNode(node => ast.call(functionName, node.arguments))
    }
    // identifier, number, or string
    else if (isType(['identifier', 'number', 'string'], first)) {
        return parser(rest, first);
    }

    throw SyntaxError(
        `Expected an expression, found "${first.string || '(end of input)'}"`);
}

function expression(tokens) {
    return atom(tokens).ifNextToken(isType('operator'), curr => 
        curr.mapNode(left => ({left}))
            .bind('operator', operator)
            .bind('right', expression)
            .mapNode(node => ast.binaryExpression(node.operator, node.left, node.right))
    );
}

function namedExpression(tokens) {
    return expression(tokens)
        .mapNode(expression => ({expression}))
        .ifNextToken(isKeyword('AS'), curr =>
            curr.then(keyword('AS'))
                .bind('name', atom)
        )
        .mapNode(({expression, name}) => {
            return ast.namedExpression(expression, name ? name.value : null)
        });
}

function outputColumns(tokens) {
    if (isType('star', tokens[0])) {
        return parser(tokens.slice(1), '*');
    }
    return many(namedExpression, {separator: comma})(tokens);
}

function keyword(word) {
    return tokens => {
        const first = tokens[0];
        if (isKeyword(word, first)) {
            return parser(tokens.slice(1), word);
        }
        else {
            throw SyntaxError(
            `Expected "${word}", found "${first.string || '(end of input)'}"`);
        }
    };
}

const tableName = parseTokenType('string', {expected: 'a table name'});
const identifier = parseTokenType('identifier', 'an identifier');
const operator = parseTokenType('operator', {expected: 'an operator'});
const comma = parseTokenType('comma');
const number = parseTokenType('number');
const semicolon = parseTokenType('semicolon');
const parOpen = parseTokenType('parOpen', {expected: 'an opening parenthesis'});
const parClose = parseTokenType('parClose', {expected: 'a closing parenthesis'});

function parseTokenType(typeName, {expected}={expected: 'a ' + typeName}) {
    return ([first, ...rest]) => {
        if (isType(typeName, first)) {
            return parser(rest, first.value);
        }
        const found = first && first.string || '(end of input)';
        throw SyntaxError(`Expected ${expected}, found "${found}"`);
    };
}

function isKeyword(keyword, token) {
    if (arguments.length < 2) {
        return token => isKeyword(keyword, token);
    }
    return token && token.type === 'keyword' && token.string === keyword;
}

function isType(types, token) {
    if (arguments.length < 2) {
        return token => isType(types, token);
    }
    if (!Array.isArray(types)) types = [types];
    return token && types.some(type => token.type === type);
}

function many(parseFunc, {separator, min}={}) {
    if (min === undefined) min = 1;
    return tokens => {
        let node, rest = tokens;
        const parts = [];
        try {
            for (let i = 0; rest.length > 0; i ++) {
                if (separator && i > 0) {
                    ({rest} = separator(rest));
                }
                ({node, rest} = parseFunc(rest));
                parts.push(node);
            }
        }
        catch (e) {
            if (!(e instanceof SyntaxError)) {
                throw e;
            }
        }
        if (parts.length < min) {
            throwUnexpected(rest[0]);
        }
        return parser(rest, parts);
    };
}

function throwUnexpected(token) {
    throw SyntaxError(`Unexpected token: "${token.string}"`);
}

function printRest(parser) {
    console.log(parser.rest.map(token => ({[token.type]: token.string})));
    return parser;
}

function parser(rest, node=null) {
    return {
        rest,
        node,
        bind(key, parseFunc) {
            const {rest, node} = parseFunc(this.rest);
            return parser(rest, merge(this.node, {[key]: node}));
        },
        just(parseFunc) {
            return parseFunc(this.rest);
        },
        then(parseFunc) {
            const {rest} = parseFunc(this.rest);
            return parser(rest, this.node);
        },
        ifNextToken(predicate, ifFunc, elseFunc) {
            if (predicate(this.rest[0])) {
                return ifFunc(this);
            }
            else if (elseFunc) {
                return elseFunc(this);
            }
            else return this;
        },
        mapNode(func) {
            const mapped = func(this.node);

            return parser(this.rest, mapped === undefined ? this.node : mapped);
        },
        map(func) {
            return func(this);
        },
    };
}
