
export function parseQuery(query) {
    const {node, rest} = parseSubQuery(query);
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
        .bind('outputColumns', many(namedExpression, {separator: comma}))
        .then(keyword('FROM'))
        .bind('primaryTable', tableName)
        .map(limitClause);
}

function limitClause(context) {
    const {node, rest: [first, ...rest]} = context;
    if (first && isKeyword('LIMIT', first)) {
        if (rest[0] && rest[0].type === 'number') {
            return parser(rest.slice(1), merge(node, {limit: rest[0].value}));
        }
        else {
            const found = rest[0] ? rest[0].string : '(end of input)';
            throw SyntaxError(`Expected a number in limit clause, found "${found}"`);
        }
    }
    else return context;
}

function identifier([first, ...rest]) {
    if (isType(first, 'word')) {
        return parser(rest, first.string.toLowerCase());
    }
    throw SyntaxError(
        `Expected an identifier, found "${first.string || '(end of input)'}"`);
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

function isKeyword(word, token) {
    return token && token.type === 'keyword' && token.string === word;
}

function atom([first, ...rest]) {
    if (isType(first, 'word') && isType(rest[0], 'parOpen')) {
        return parser(rest.slice(1), {type: 'call', functionName: first.string.toUpperCase()})
            .bind('arguments', many(expression, {separator: comma, min: 0}))
            .then(parClose)
            .mapNode(node => {
                const argsString = node.arguments.map(arg => arg.string).join(', ');
                node.string = `${node.functionName}(${argsString})`;
                return node;
            });
    }
    else if (isType(first, 'word', 'number', 'string')) {
        return parser(rest, first);
    }
    throw SyntaxError(
        `Expected an expression, found "${first.string || '(end of input)'}"`);
}

function expression(tokens) {
    const {rest, node: left} = atom(tokens);
    return parser(rest, left);
}

function expressionToName(exp) {
    return exp.string;
}

function namedExpression(tokens) {
    const {node: exp, rest} = expression(tokens);

    const node = {
        type: 'namedExpression',
        expression: exp,
        name: expressionToName(exp),
    };

    if (isKeyword('AS', rest[0])) {
        return parser(rest.slice(1), node).bind('name', identifier);
    }
    else return parser(rest, node);
}

function tableName([first, ...rest]) {
    if (isType(first, 'string')) {
        return parser(rest, first.value);
    }
    throw SyntaxError(
        `Expected a table name, found "${first.string || '(end of input)'}"`);
}

function comma([first, ...rest]) {
    if (isType(first, 'comma')) {
        return parser(rest, ',');
    }
    throw SyntaxError(
        `Expected a comma, found "${first.string || '(end of input)'}"`);
}

function parClose([first, ...rest]) {
    if (isType(first, 'parClose')) {
        return parser(rest, ')');
    }
    throw SyntaxError(
        `Expected a closing parenthesis, found "${first.string || '(end of input)'}"`);
}

function many(parseFunc, {separator}={}) {
    return tokens => {
        let node, rest;
        const parts = [];
        try {
            ({node, rest} = parseFunc(tokens));
            parts.push(node);
            while (rest.length > 0) {
                if (separator) {
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
        return parser(rest, parts);
    };
}

function isType(node, ...types) {
    return node && types.some(type => node.type === type);
}

var tokenTypes = {
    word: /^[a-z_]\w*/i,
    parOpen: /^\(/,
    parClose: /^\)/,
    star: /^\*/,
    number: /^\d+(\.\d+)?/,
    operator: /^(=|<=|>=|!=|<|>)/,
    string: /^"[^"]*"/,
    comma: /^,/,
};

function tokenize(query) {
    const tokens = [];
    let rest = query;

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
    const keywordRegex = /^(SELECT|FROM|WHERE|GROUP|BY|AS|AND|OR|LIMIT)$/i;
    return tokens.map(token => {
        if (token.type === 'word' && keywordRegex.test(token.string)) {
            token.type = 'keyword';
            token.string = token.string.toUpperCase();
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

function printRest(parser) {
    console.log(parser.rest.map(token => ({[token.type]: token.string})));
    return parser;
}

function parser(rest, node={}) {
    return {
        rest,
        node,
        bind(key, parseFunc) {
            const {rest, node} = parseFunc(this.rest);
            return parser(rest, merge(this.node, {[key]: node}));
        },
        then(parseFunc) {
            const {rest} = parseFunc(this.rest);
            return parser(rest, this.node);
        },
        mapNode(func) {
            return parser(this.rest, func(this.node));
        },
        map(func) {
            return func(this);
        },
    };
}

function merge(a, b) {
    const merged = {};
    for (let key in a) if (a.hasOwnProperty(key)) {
        merged[key] = a[key];
    }
    for (let key in b) if (b.hasOwnProperty(key)) {
        merged[key] = b[key];
    }
    return merged;
}