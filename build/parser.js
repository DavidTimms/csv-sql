'use strict';

Object.defineProperty(exports, '__esModule', {
    value: true
});
exports.parseQuery = parseQuery;

function _toArray(arr) { return Array.isArray(arr) ? arr : Array.from(arr); }

function parseQuery(query) {
    var _parseSubQuery = parseSubQuery(query);

    var node = _parseSubQuery.node;
    var rest = _parseSubQuery.rest;

    if (rest.length > 0) {
        throw SyntaxError('Parser completed with input remaining: "' + rest + '"');
    }
    return node;
}

function parseSubQuery(query) {
    var tokens = tokenize(query);
    return parser(tokens).bind('type', keyword('SELECT')).bind('outputColumns', many(namedExpression, { separator: comma })).bind('from', keyword('FROM')).bind('primaryTable', tableName);
}

function keyword(word) {
    return function (tokens) {
        var first = tokens[0];
        if (isKeyword(word, first)) {
            return parser(tokens.slice(1), word);
        } else throw SyntaxError('Expected "' + word + '", found "' + (first.string || '(end of input)') + '"');
    };
}

function isKeyword(word, token) {
    return token && token.type === 'keyword' && token.string === word;
}

function expression(_ref) {
    var _ref2 = _toArray(_ref);

    var first = _ref2[0];

    var rest = _ref2.slice(1);

    if (first && first.type === 'word') {
        return parser(rest, first);
    } else throw SyntaxError('Expected an expression, found "' + (first.string || '(end of input)') + '"');
}

function expressionToName(exp) {
    return exp.string;
}

function namedExpression(tokens) {
    var _expression = expression(tokens);

    var exp = _expression.node;
    var rest = _expression.rest;

    var node = {
        expression: exp,
        name: expressionToName(exp) };

    if (isKeyword('AS', rest[0])) {
        if (rest[1] && rest[1].type === 'word') {
            node.name = rest[1].string;
            return parser(rest.slice(2), node);
        }
    } else return parser(tokens.slice(1), node);
}

function tableName(tokens) {
    var first = tokens[0];
    if (first && first.type === 'string') {
        return parser(tokens.slice(1), first.value);
    } else throw SyntaxError('Expected a table name, found "' + (first.string || '(end of input)') + '"');
}

function comma(tokens) {
    var first = tokens[0];
    if (first && first.type === 'comma') {
        return parser(tokens.slice(1), ',');
    } else throw SyntaxError('Expected a comma, found "' + (first.string || '(end of input)') + '"');
}

function many(parseFunc) {
    var _ref3 = arguments[1] === undefined ? {} : arguments[1];

    var separator = _ref3.separator;

    return function (tokens) {
        var node = undefined,
            rest = undefined;
        var parts = [];
        try {
            var _parseFunc = parseFunc(tokens);

            node = _parseFunc.node;
            rest = _parseFunc.rest;

            parts.push(node);
            while (rest.length > 0) {
                if (separator) {
                    var _separator = separator(rest);

                    rest = _separator.rest;
                }

                var _parseFunc2 = parseFunc(rest);

                node = _parseFunc2.node;
                rest = _parseFunc2.rest;

                parts.push(node);
            }
        } catch (e) {
            if (!(e instanceof SyntaxError)) {
                throw e;
            }
        }
        return parser(rest, parts);
    };
}

var tokenTypes = {
    word: /^[a-z_]\w*/i,
    parOpen: /^\(/,
    parClose: /^\)/,
    star: /^\*/,
    number: /^\d+(\.\d+)?/,
    operator: /^(=|<=|>=|!=|<|>)/,
    string: /^"[^"]*"/,
    comma: /^,/ };

function tokenize(query) {
    var tokens = [];
    var rest = query;

    nextToken: while (true) {
        rest = rest.match(/^\s*([\s\S]*)$/)[1];
        if (rest.length === 0) break;

        for (var tokenType in tokenTypes) {
            var match = rest.match(tokenTypes[tokenType]);
            if (match) {
                tokens.push({ type: tokenType, string: match[0] });
                rest = rest.slice(match[0].length);
                continue nextToken;
            }
        }
        throw Error('unable to tokenize: ' + JSON.stringify(rest));
    }
    var keywordRegex = /^(SELECT|FROM|WHERE|GROUP|BY|AS|AND|OR)$/i;
    return tokens.map(function (token) {
        if (token.type === 'word' && keywordRegex.test(token.string)) {
            token.type = 'keyword';
            token.string = token.string.toUpperCase();
        } else if (token.type === 'number') {
            token.value = Number(token.string);
        } else if (token.type === 'string') {
            token.value = JSON.parse(token.string);
        }
        return token;
    });
}

function parser(rest) {
    var node = arguments[1] === undefined ? {} : arguments[1];

    return {
        rest: rest,
        node: node,
        bind: function bind(key, parseFunc) {
            var child = parseFunc(this.rest);
            var newNode = {};
            for (var oldKey in this.node) {
                newNode[oldKey] = this.node[oldKey];
            }
            newNode[key] = child.node;
            return parser(child.rest, newNode);
        },
        mapNode: function mapNode(func) {
            return parser(this.rest, func(this.node));
        } };
}