
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
        .bind('outputColumns', outputColumns)
        .then(keyword('FROM'))
        .bind('primaryTable', tableName)
        .bind('condition', whereClause)
        .bind('orderBy', orderByClause)
        .bind('limit', limitClause)
        .bind('offset', offsetClause);
}

function whereClause(tokens) {
    return parser(tokens).ifNextToken(isKeyword('WHERE'), curr =>
        curr.then(keyword('WHERE')).just(expression)
    );
}

function orderByClause(tokens) {
    return parser(tokens)
        .ifNextToken(isKeyword('ORDER'), curr =>
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
                return parser(rest, first.string.toLowerCase());
            }
            return parser(tokens, 'asc');
        });
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
        switch (first.string) {
            case 'TRUE':
            case 'FALSE':
            case 'NULL':
                return parser(rest, {
                    type: 'literal',
                    value: JSON.parse(first.string.toLowerCase()),
                    string: first.string,
                });
        }
    }
    // function call
    else if (isType('word', first) && isType('parOpen', rest[0])) {
        return parser(rest.slice(1), {type: 'call', functionName: first.string.toUpperCase()})
            .bind('arguments', many(expression, {separator: comma, min: 0}))
            .then(parClose)
            .mapNode(node => {
                const argsString = node.arguments.map(arg => arg.string).join(', ');
                node.string = `${node.functionName}(${argsString})`;
            });
    }
    // identifier, number, or string
    else if (isType(['word', 'number', 'string'], first)) {
        return parser(rest, first);
    }

    throw SyntaxError(
        `Expected an expression, found "${first.string || '(end of input)'}"`);
}

function expression(tokens) {
    return atom(tokens).ifNextToken(isType('operator'), curr => 
        curr.mapNode(left => ({type: 'binaryExpression', left}))
            .bind('operator', operator)
            .bind('right', expression)
            .mapNode(node => {
                const leftString = parenWrappedBinaryExpString(node.left);
                const rightString = parenWrappedBinaryExpString(node.right);
                node.string = `${leftString} ${node.operator} ${rightString}`;
            })
    );
}

function parenWrappedBinaryExpString(exp) {
    if (exp.type === 'binaryExpression') {
        return `(${exp.string})`;
    }
    else return exp.string;
}

function namedExpression(tokens) {
    const {node: exp, rest} = expression(tokens);

    const node = {
        type: 'namedExpression',
        expression: exp,
        name: exp.string,
    };

    if (isKeyword('AS', rest[0])) {
        return parser(rest.slice(1), node)
            .bind('name', atom)
            .mapNode(node => {
                node.name = node.name.value || node.name.string;
            });
    }
    else return parser(rest, node);
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
        else throw SyntaxError(
            `Expected "${word}", found "${first.string || '(end of input)'}"`);
    };
}

const tableName = parseTokenType('string', {expected: 'a table name'});
const identifier = parseTokenType('word', 'an identifier');
const operator = parseTokenType('operator', {expected: 'an operator'});
const comma = parseTokenType('comma');
const number = parseTokenType('number');
const semicolon = parseTokenType('semicolon');
const parOpen = parseTokenType('parOpen', {expected: 'an opening parenthesis'});
const parClose = parseTokenType('parClose', {expected: 'a closing parenthesis'});

function parseTokenType(typeName, {expected}={}) {
    expected = expected || 'a ' + typeName;

    return ([first, ...rest]) => {
        if (isType(typeName, first)) {
            return parser(rest, first.value || first.string);
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
};

// TODO rename 'word' to identifier

var tokenTypes = {
    word: /^[a-z_]\w*/i,
    parOpen: /^\(/,
    parClose: /^\)/,
    star: /^\*/,
    number: /^\d+(\.\d+)?/,
    operator: /^(=|<=|>=|!=|<>|<|>)/,
    string: /^"[^"]*"/,
    comma: /^,/,
    semicolon: /^;/,
};

export function tokenize(query) {
    const tokens = [];
    let rest = query;

    if (!query) {
        throw Error('No input to tokenize');
    }

    nextToken:
    while (true) {
        rest = rest.match(/^\s*([\s\S]*)$/)[1];
        if (rest.length === 0) break;

        for (let tokenType in tokenTypes) {
            const match = rest.match(tokenTypes[tokenType]);
            if (match) {
                tokens.push({type: tokenType, string: match[0]});
                rest = rest.slice(match[0].length);
                continue nextToken;
            }
        }
        throw Error("unable to tokenize: " + JSON.stringify(rest));
    }

    const KEYWORDS = [
        'SELECT',
        'FROM',
        'WHERE',
        'GROUP',
        'BY',
        'AS',
        'ORDER',
        'ASC',
        'DESC',
        'LIMIT',
        'OFFSET',
        'CASE',
        'WHEN',
        'THEN',
        'ELSE',
        'END',
        'NOT',
        'NULL',
        'TRUE',
        'FALSE',
    ];

    const WORD_OPERATORS = [
        'AND',
        'OR',
        'IS',
        'LIKE',
    ];

    const keywordRegex = new RegExp(`^(${ KEYWORDS.join('|') })$`, 'i');
    const operatorRegex = new RegExp(`^(${ WORD_OPERATORS.join('|') })$`, 'i');

    return tokens.map(token => {
        if (token.type === 'word') {
            if (keywordRegex.test(token.string)) {
                token.type = 'keyword';
                token.string = token.string.toUpperCase();
            }
            else if (operatorRegex.test(token.string)) {
                token.type = 'operator';
                token.string = token.string.toUpperCase();
            }
        }
        else if (token.type === 'number') {
            token.value = Number(token.string);
        }
        else if (token.type === 'string') {
            token.value = JSON.parse(token.string);
        }
        return token;
    });
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

function merge(a, b) {
    const merged = {};
    if (a) for (let key in a) if (a.hasOwnProperty(key)) {
        merged[key] = a[key];
    }
    if (b) for (let key in b) if (b.hasOwnProperty(key)) {
        merged[key] = b[key];
    }
    return merged;
}

function or(predicates) {
    return (...args) => predicates.some(predicate => predicate(...args));
}
