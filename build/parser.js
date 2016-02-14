'use strict';

Object.defineProperty(exports, '__esModule', {
    value: true
});
exports.parseQuery = parseQuery;

function _toArray(arr) { return Array.isArray(arr) ? arr : Array.from(arr); }

function _defineProperty(obj, key, value) { return Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); }

var _utils = require('./utils');

var _tokenizer = require('./tokenizer');

function parseQuery(query) {
    var _parseSubQuery$ifNextToken = parseSubQuery(query).ifNextToken(isType('semicolon'), function (curr) {
        return curr.then(semicolon);
    });

    var node = _parseSubQuery$ifNextToken.node;
    var rest = _parseSubQuery$ifNextToken.rest;

    if (rest.length > 0) {
        var restString = rest.map(function (token) {
            return token.string;
        }).join(' ');
        throw SyntaxError('Parser completed with input remaining: "' + restString + '"');
    }
    return node;
}

function parseSubQuery(query) {
    var tokens = (0, _tokenizer.tokenize)(query);

    return parser(tokens).then(keyword('SELECT')).bind('select', outputColumns).then(keyword('FROM')).bind('from', tableName).bind('where', createConditionClause('WHERE')).map(parseGroupByHaving).bind('orderBy', orderByClause).bind('limit', limitClause).bind('offset', offsetClause);
}

function parseGroupByHaving(parser) {
    return parser.ifNextToken(isKeyword('GROUP'), function (curr) {
        return curr.then(keyword('GROUP')).then(keyword('BY')).bind('groupBy', many(expression, { separator: comma })).bind('having', createConditionClause('HAVING'));
    }).mapNode(function (node) {
        return (0, _utils.merge)({ groupBy: null, having: null }, node);
    });
}

function createConditionClause(conditionType) {
    return function (tokens) {
        return parser(tokens).ifNextToken(isKeyword(conditionType), function (curr) {
            return curr.then(keyword(conditionType)).just(expression);
        });
    };
}

function orderByClause(tokens) {
    return parser(tokens).ifNextToken(isKeyword('ORDER'), function (curr) {
        return curr.then(keyword('ORDER')).then(keyword('BY')).just(many(orderingTerm, { separator: comma }));
    });
}

function orderingTerm(tokens) {
    return parser(tokens).bind('expression', expression).bind('direction', function (tokens) {
        var _tokens = _toArray(tokens);

        var first = _tokens[0];

        var rest = _tokens.slice(1);

        if (isKeyword('ASC', first) || isKeyword('DESC', first)) {
            return parser(rest, first.string.toLowerCase());
        }
        return parser(tokens, 'asc');
    });
}

function limitClause(tokens) {
    return parser(tokens).ifNextToken(isKeyword('LIMIT'), function (curr) {
        return curr.then(keyword('LIMIT')).just(number);
    });
}

function offsetClause(tokens) {
    return parser(tokens).ifNextToken(isKeyword('OFFSET'), function (curr) {
        return curr.then(keyword('OFFSET')).just(number);
    });
}

function atom(_ref2) {
    var _ref22 = _toArray(_ref2);

    var first = _ref22[0];

    var rest = _ref22.slice(1);

    // grouped expression
    if (isType('parOpen', first)) {
        return expression(rest).then(parClose);
    }
    // literal TRUE, FALSE, or NULL
    else if (isType('keyword', first)) {
        var s = first.string;
        if (s === 'TRUE' || s === 'FALSE' || s === 'NULL') {
            return parser(rest, {
                type: 'literal',
                value: JSON.parse(s.toLowerCase()),
                string: s });
        }
    }
    // function call
    else if (isType('identifier', first) && isType('parOpen', rest[0])) {
        return parser(rest.slice(1), { type: 'call', functionName: first.value.toUpperCase() }).bind('arguments', many(expression, { separator: comma, min: 0 })).then(parClose).mapNode(function (node) {
            var argsString = node.arguments.map(function (arg) {
                return arg.string;
            }).join(', ');
            node.string = '' + node.functionName + '(' + argsString + ')';
        });
    }
    // identifier, number, or string
    else if (isType(['identifier', 'number', 'string'], first)) {
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
            node.name = node.name.value;
        });
    } else return parser(rest, node);
}

function outputColumns(tokens) {
    if (isType('star', tokens[0])) {
        return parser(tokens.slice(1), '*');
    }
    return many(namedExpression, { separator: comma })(tokens);
}

function keyword(word) {
    return function (tokens) {
        var first = tokens[0];
        if (isKeyword(word, first)) {
            return parser(tokens.slice(1), word);
        } else {
            throw SyntaxError('Expected "' + word + '", found "' + (first.string || '(end of input)') + '"');
        }
    };
}

var tableName = parseTokenType('string', { expected: 'a table name' });
var identifier = parseTokenType('identifier', 'an identifier');
var operator = parseTokenType('operator', { expected: 'an operator' });
var comma = parseTokenType('comma');
var number = parseTokenType('number');
var semicolon = parseTokenType('semicolon');
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

        if (isType(typeName, first)) {
            return parser(rest, first.value || first.string);
        }
        var found = first && first.string || '(end of input)';
        throw SyntaxError('Expected ' + expected + ', found "' + found + '"');
    };
}

function isKeyword(keyword, token) {
    if (arguments.length < 2) {
        return function (token) {
            return isKeyword(keyword, token);
        };
    }
    return token && token.type === 'keyword' && token.string === keyword;
}

function isType(types, token) {
    if (arguments.length < 2) {
        return function (token) {
            return isType(types, token);
        };
    }
    if (!Array.isArray(types)) types = [types];
    return token && types.some(function (type) {
        return token.type === type;
    });
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
    var node = arguments[1] === undefined ? null : arguments[1];

    return {
        rest: rest,
        node: node,
        bind: function bind(key, parseFunc) {
            var _parseFunc2 = parseFunc(this.rest);

            var rest = _parseFunc2.rest;
            var node = _parseFunc2.node;

            return parser(rest, (0, _utils.merge)(this.node, _defineProperty({}, key, node)));
        },
        just: function just(parseFunc) {
            return parseFunc(this.rest);
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