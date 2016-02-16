'use strict';

Object.defineProperty(exports, '__esModule', {
    value: true
});
exports.tokenize = tokenize;

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj['default'] = obj; return newObj; } }

function _slicedToArray(arr, i) { if (Array.isArray(arr)) { return arr; } else if (Symbol.iterator in Object(arr)) { var _arr = []; var _n = true; var _d = false; var _e = undefined; try { for (var _i = arr[Symbol.iterator](), _s; !(_n = (_s = _i.next()).done); _n = true) { _arr.push(_s.value); if (i && _arr.length === i) break; } } catch (err) { _d = true; _e = err; } finally { try { if (!_n && _i['return']) _i['return'](); } finally { if (_d) throw _e; } } return _arr; } else { throw new TypeError('Invalid attempt to destructure non-iterable instance'); } }

var _ast = require('./ast');

var ast = _interopRequireWildcard(_ast);

var tokenTypes = {
    identifier: /^[a-z_]\w*/i,
    parOpen: /^\(/,
    parClose: /^\)/,
    star: /^\*/,
    number: /^\d+(\.\d+)?/,
    operator: /^(=|<=|>=|!=|<>|<|>)/,
    string: /^("|'|`)/,
    comma: /^,/,
    semicolon: /^;/ };

function tokenize(query) {
    var tokens = [];
    var rest = query;

    if (!query) {
        throw Error('No input to tokenize');
    }

    nextToken: while (true) {
        rest = rest.match(/^\s*([\s\S]*)$/)[1];
        if (rest.length === 0) break;

        for (var tokenType in tokenTypes) {
            var match = rest.match(tokenTypes[tokenType]);
            if (match) {
                var _token = { type: tokenType, string: match[0], value: match[0] };

                var _processRawToken = processRawToken(rest.slice(match[0].length), _token);

                var _processRawToken2 = _slicedToArray(_processRawToken, 2);

                rest = _processRawToken2[0];
                _token = _processRawToken2[1];

                tokens.push(_token);
                continue nextToken;
            }
        }
        throw Error('unable to tokenize: ' + JSON.stringify(rest));
    }

    return tokens;
}

var BACKTICK = '`';

var KEYWORDS = ['SELECT', 'FROM', 'WHERE', 'GROUP', 'BY', 'HAVING', 'AS', 'ORDER', 'ASC', 'DESC', 'LIMIT', 'OFFSET', 'CASE', 'WHEN', 'THEN', 'ELSE', 'END', 'NOT', 'NULL', 'TRUE', 'FALSE'];

var WORD_OPERATORS = ['AND', 'OR', 'IS', 'LIKE'];

var keywordRegex = new RegExp('^(' + KEYWORDS.join('|') + ')$', 'i');
var operatorRegex = new RegExp('^(' + WORD_OPERATORS.join('|') + ')$', 'i');

function processRawToken(rest, token) {

    switch (token.type) {
        case 'identifier':
            if (keywordRegex.test(token.string)) {
                token = ast.keyword(token.string);
            } else if (operatorRegex.test(token.string)) {
                token = ast.operator(token.string);
            } else {
                token = ast.identifier(token.string);
            }
            break;

        case 'number':
            token = ast.number(token.string);
            break;

        case 'string':
            var _takeStringLiteral = takeStringLiteral(token.string)(rest);

            var _takeStringLiteral2 = _slicedToArray(_takeStringLiteral, 2);

            rest = _takeStringLiteral2[0];
            token = _takeStringLiteral2[1];

            break;

        default:
        // do nothing
    }

    return [rest, token];
}

function takeStringLiteral(delimiter) {
    return function recur(_x4) {
        var _arguments = arguments;
        var _again = true;

        _function: while (_again) {
            var input = _x4;
            index = value = state = char = rest = token = undefined;
            var index = _arguments[1] === undefined ? 0 : _arguments[1];
            var value = _arguments[2] === undefined ? '' : _arguments[2];
            _again = false;
            var state = _arguments[3] === undefined ? 'normal' : _arguments[3];

            var char = input[index];

            if (char === undefined) {
                throw SyntaxError('Input ended in the middle of a string literal');
            }

            switch (state) {

                case 'normal':
                    switch (char) {

                        case delimiter:
                            // TODO convert to using ast token constructor
                            var rest = input.slice(index + 1);
                            var token = {
                                type: delimiter === BACKTICK ? 'identifier' : 'string',
                                string: delimiter + input.slice(0, index + 1),
                                value: value };
                            return [rest, token];

                        case '\\':
                            _arguments = [_x4 = input, index + 1, value, 'escaped'];
                            _again = true;
                            continue _function;

                        default:
                            _arguments = [_x4 = input, index + 1, value + char, 'normal'];
                            _again = true;
                            continue _function;

                    }

                case 'escaped':
                    _arguments = [_x4 = input, index + 1, value + char, 'normal'];
                    _again = true;
                    continue _function;

                default:
                    throw TypeError('Invalid state: ' + state);
            }
        }
    };
}