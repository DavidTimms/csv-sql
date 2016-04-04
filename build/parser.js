'use strict';

Object.defineProperty(exports, '__esModule', {
    value: true
});
exports.parseQuery = parseQuery;

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj['default'] = obj; return newObj; } }

function _toArray(arr) { return Array.isArray(arr) ? arr : Array.from(arr); }

function _defineProperty(obj, key, value) { return Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); }

var _utils = require('./utils');

var _tokenizer = require('./tokenizer');

var _ast = require('./ast');

var ast = _interopRequireWildcard(_ast);

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

    return parser(tokens).then(keyword('SELECT')).bind('select', outputColumns).then(keyword('FROM')).bind('from', tableName).bind('where', createConditionClause('WHERE')).map(parseGroupByHaving).bind('orderBy', orderByClause).bind('limit', limitClause).bind('offset', offsetClause).mapNode(ast.query);
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
            return parser(rest, first.string);
        }
        return parser(tokens, 'ASC');
    }).mapNode(function (node) {
        return ast.orderingTerm(node.expression, node.direction);
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
            return parser(rest, ast.literal(JSON.parse(s.toLowerCase())));
        }
    }
    // function call
    else if (isType('identifier', first) && isType('parOpen', rest[0])) {
        var _ret = (function () {
            var functionName = first.value;

            if (functionName.toUpperCase() === 'COUNT' && isType('star', rest[1])) {
                return {
                    v: parser(rest.slice(2)).then(parClose).mapNode(function (node) {
                        return ast.call(functionName, [ast.star()]);
                    })
                };
            }

            return {
                v: parser(rest.slice(1)).bind('arguments', many(expression, { separator: comma, min: 0 })).then(parClose).mapNode(function (node) {
                    return ast.call(functionName, node.arguments);
                })
            };
        })();

        if (typeof _ret === 'object') return _ret.v;
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
            return { left: left };
        }).bind('operator', operator).bind('right', expression).mapNode(function (node) {
            return ast.binaryExpression(node.operator, node.left, node.right);
        });
    });
}

function namedExpression(tokens) {
    return expression(tokens).mapNode(function (expression) {
        return { expression: expression };
    }).ifNextToken(isKeyword('AS'), function (curr) {
        return curr.then(keyword('AS')).bind('name', atom);
    }).mapNode(function (_ref3) {
        var expression = _ref3.expression;
        var name = _ref3.name;

        return ast.namedExpression(expression, name ? name.value : null);
    });
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
    var _ref4 = arguments[1] === undefined ? { expected: 'a ' + typeName } : arguments[1];

    var expected = _ref4.expected;
    return (function () {
        return function (_ref5) {
            var _ref52 = _toArray(_ref5);

            var first = _ref52[0];

            var rest = _ref52.slice(1);

            if (isType(typeName, first)) {
                return parser(rest, first.value);
            }
            var found = first && first.string || '(end of input)';
            throw SyntaxError('Expected ' + expected + ', found "' + found + '"');
        };
    })();
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
    var _ref6 = arguments[1] === undefined ? {} : arguments[1];

    var separator = _ref6.separator;
    var min = _ref6.min;

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