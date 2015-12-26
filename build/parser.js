'use strict';

Object.defineProperty(exports, '__esModule', {
    value: true
});
exports.parseQuery = parseQuery;
exports.tokenize = tokenize;

function _toArray(arr) { return Array.isArray(arr) ? arr : Array.from(arr); }

function _defineProperty(obj, key, value) { return Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); }

function parseQuery(query) {
    var _parseSubQuery = parseSubQuery(query);

    var node = _parseSubQuery.node;
    var rest = _parseSubQuery.rest;

    if (rest.length > 0) {
        var restString = rest.map(function (token) {
            return token.string;
        }).join(' ');
        throw SyntaxError('Parser completed with input remaining: "' + restString + '"');
    }
    return node;
}

function parseSubQuery(query) {
    var tokens = tokenize(query);
    return parser(tokens).then(keyword('SELECT')).bind('outputColumns', outputColumns).then(keyword('FROM')).bind('primaryTable', tableName).map(limitClause);
}

function limitClause(context) {
    var node = context.node;

    var _context$rest = _toArray(context.rest);

    var first = _context$rest[0];

    var rest = _context$rest.slice(1);

    if (isKeyword('LIMIT', first)) {
        if (rest[0] && rest[0].type === 'number') {
            return parser(rest.slice(1), merge(node, { limit: rest[0].value }));
        } else {
            var found = rest[0] ? rest[0].string : '(end of input)';
            throw SyntaxError('Expected a number in limit clause, found "' + found + '"');
        }
    } else return context;
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

function atom(_ref2) {
    var _ref22 = _toArray(_ref2);

    var first = _ref22[0];

    var rest = _ref22.slice(1);

    // grouped expression
    if (isType(first, 'parOpen')) {
        return expression(rest).then(parClose);
    }
    // literal TRUE, FALSE, or NULL
    else if (isType(first, 'keyword')) {
        switch (first.string) {
            case 'TRUE':
            case 'FALSE':
            case 'NULL':
                return parser(rest, {
                    type: 'literal',
                    value: JSON.parse(first.string.toLowerCase()),
                    string: first.string });
        }
    }
    // function call
    else if (isType(first, 'word') && isType(rest[0], 'parOpen')) {
        return parser(rest.slice(1), { type: 'call', functionName: first.string.toUpperCase() }).bind('arguments', many(expression, { separator: comma, min: 0 })).then(parClose).mapNode(function (node) {
            var argsString = node.arguments.map(function (arg) {
                return arg.string;
            }).join(', ');
            node.string = '' + node.functionName + '(' + argsString + ')';
        });
    }
    // identifier, number, or string
    else if (isType(first, ['word', 'number', 'string'])) {
        return parser(rest, first);
    }

    throw SyntaxError('Expected an expression, found "' + (first.string || '(end of input)') + '"');
}

function expression(tokens) {
    return atom(tokens).ifNextToken(isType('operator'), function (curr) {
        return curr.mapNode(function (left) {
            return { type: 'binaryExpression', left: left };
        }).bind('operator', operator).bind('right', expression).mapNode(function (node) {
            var leftString = parenWrappedBinaryExpString(node.left);
            var rightString = parenWrappedBinaryExpString(node.right);
            node.string = '' + leftString + ' ' + node.operator + ' ' + rightString;
        });
    });
}

function parenWrappedBinaryExpString(exp) {
    if (exp.type === 'binaryExpression') {
        return '(' + exp.string + ')';
    } else return exp.string;
}

function namedExpression(tokens) {
    var _expression = expression(tokens);

    var exp = _expression.node;
    var rest = _expression.rest;

    var node = {
        type: 'namedExpression',
        expression: exp,
        name: exp.string };

    if (isKeyword('AS', rest[0])) {
        return parser(rest.slice(1), node).bind('name', atom).mapNode(function (node) {
            node.name = node.name.value || node.name.string;
        });
    } else return parser(rest, node);
}

function outputColumns(tokens) {
    if (isType(tokens[0], 'star')) {
        return parser(tokens.slice(1), '*');
    }
    return many(namedExpression, { separator: comma })(tokens);
}

var tableName = parseTokenType('string', { expected: 'a table name' });
var identifier = parseTokenType('word', 'an identifier');
var operator = parseTokenType('operator', { expected: 'an operator' });
var comma = parseTokenType('comma');
var parOpen = parseTokenType('parOpen', { expected: 'an opening parenthesis' });
var parClose = parseTokenType('parClose', { expected: 'a closing parenthesis' });

function parseTokenType(typeName) {
    var _ref3 = arguments[1] === undefined ? {} : arguments[1];

    var expected = _ref3.expected;

    expected = expected || 'a ' + typeName;

    return function (_ref4) {
        var _ref42 = _toArray(_ref4);

        var first = _ref42[0];

        var rest = _ref42.slice(1);

        if (isType(first, typeName)) {
            return parser(rest, first.value || first.string);
        }
        var found = first && first.string || '(end of input)';
        throw SyntaxError('Expected ' + expected + ', found "' + found + '"');
    };
}

function many(parseFunc) {
    var _ref5 = arguments[1] === undefined ? {} : arguments[1];

    var separator = _ref5.separator;
    var min = _ref5.min;

    if (min === undefined) min = 1;
    return function (tokens) {
        var node = undefined,
            rest = tokens;
        var parts = [];
        try {
            for (var i = 0; rest.length > 0; i++) {
                if (separator && i > 0) {
                    var _separator = separator(rest);

                    rest = _separator.rest;
                }

                var _parseFunc = parseFunc(rest);

                node = _parseFunc.node;
                rest = _parseFunc.rest;

                parts.push(node);
            }
        } catch (e) {
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

function isType(node) {
    var types = arguments[1] === undefined ? null : arguments[1];

    if (types === null) {
        types = node;
        return function (node) {
            return isType(node, types);
        };
    }
    if (!Array.isArray(types)) types = [types];
    return node && types.some(function (type) {
        return node.type === type;
    });
}

var tokenTypes = {
    word: /^[a-z_]\w*/i,
    parOpen: /^\(/,
    parClose: /^\)/,
    star: /^\*/,
    number: /^\d+(\.\d+)?/,
    operator: /^(=|<=|>=|!=|<>|<|>)/,
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

    var KEYWORDS = ['SELECT', 'FROM', 'WHERE', 'GROUP', 'BY', 'AS', 'LIMIT', 'CASE', 'WHEN', 'THEN', 'ELSE', 'END', 'NOT', 'NULL', 'TRUE', 'FALSE'];

    var WORD_OPERATORS = ['AND', 'OR', 'IS', 'LIKE'];

    var keywordRegex = new RegExp('^(' + KEYWORDS.join('|') + ')$', 'i');
    var operatorRegex = new RegExp('^(' + WORD_OPERATORS.join('|') + ')$', 'i');

    return tokens.map(function (token) {
        if (token.type === 'word') {
            if (keywordRegex.test(token.string)) {
                token.type = 'keyword';
                token.string = token.string.toUpperCase();
            } else if (operatorRegex.test(token.string)) {
                token.type = 'operator';
                token.string = token.string.toUpperCase();
            }
        } else if (token.type === 'number') {
            token.value = Number(token.string);
        } else if (token.type === 'string') {
            token.value = JSON.parse(token.string);
        }
        return token;
    });
}

function throwUnexpected(token) {
    throw SyntaxError('Unexpected token: "' + token.string + '"');
}

function printRest(parser) {
    console.log(parser.rest.map(function (token) {
        return _defineProperty({}, token.type, token.string);
    }));
    return parser;
}

function parser(rest) {
    var node = arguments[1] === undefined ? {} : arguments[1];

    return {
        rest: rest,
        node: node,
        bind: function bind(key, parseFunc) {
            var _parseFunc2 = parseFunc(this.rest);

            var rest = _parseFunc2.rest;
            var node = _parseFunc2.node;

            return parser(rest, merge(this.node, _defineProperty({}, key, node)));
        },
        then: function then(parseFunc) {
            var _parseFunc3 = parseFunc(this.rest);

            var rest = _parseFunc3.rest;

            return parser(rest, this.node);
        },
        ifNextToken: function ifNextToken(predicate, ifFunc, elseFunc) {
            if (predicate(this.rest[0])) {
                return ifFunc(this);
            } else if (elseFunc) {
                return elseFunc(this);
            } else return this;
        },
        mapNode: function mapNode(func) {
            var mapped = func(this.node);

            return parser(this.rest, mapped === undefined ? this.node : mapped);
        },
        map: function map(func) {
            return func(this);
        } };
}

function merge(a, b) {
    var merged = {};
    for (var key in a) {
        if (a.hasOwnProperty(key)) {
            merged[key] = a[key];
        }
    }for (var key in b) {
        if (b.hasOwnProperty(key)) {
            merged[key] = b[key];
        }
    }return merged;
}