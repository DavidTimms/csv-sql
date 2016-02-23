'use strict';

Object.defineProperty(exports, '__esModule', {
    value: true
});
exports.literal = literal;
exports.string = string;
exports.identifier = identifier;
exports.number = number;
exports.call = call;
exports.aggregate = aggregate;
exports.binaryExpression = binaryExpression;
exports.namedExpression = namedExpression;
exports.orderingTerm = orderingTerm;
exports.query = query;

var _utils = require('./utils');

function literal(value) {
    return {
        type: 'literal',
        value: value,
        string: String(value).toUpperCase() };
}

function string(s) {
    return {
        type: 'string',
        value: s,
        string: quoteString(s, '"') };
}

function tokenMaker(type) {
    var defaultString = arguments[1] === undefined ? null : arguments[1];

    return function () {
        var s = arguments[0] === undefined ? defaultString : arguments[0];

        var upper = s.toUpperCase();
        return {
            type: type,
            string: upper,
            value: upper };
    };
}

var keyword = tokenMaker('keyword');
exports.keyword = keyword;
var operator = tokenMaker('operator');
exports.operator = operator;
var parOpen = tokenMaker('parOpen', '(');
exports.parOpen = parOpen;
var parClose = tokenMaker('parClose', ')');
exports.parClose = parClose;
var star = tokenMaker('star', '*');
exports.star = star;
var comma = tokenMaker('comma', ',');
exports.comma = comma;
var semicolon = tokenMaker('semicolon', ';');

exports.semicolon = semicolon;

function identifier(value) {
    var string = value;

    var basicIdentifierRegex = /^[a-z_]\w*$/i;
    if (!basicIdentifierRegex.test(value)) {
        string = quoteString(value, '`');
    }

    return {
        type: 'identifier',
        string: string,
        value: value };
}

function number(num) {
    return {
        type: 'number',
        string: String(num),
        value: Number(num) };
}

function call(functionName) {
    var args = arguments[1] === undefined ? [] : arguments[1];

    functionName = functionName.toUpperCase();
    return {
        type: 'call',
        functionName: functionName,
        arguments: args,
        string: '' + functionName + '(' + args.map(function (arg) {
            return arg.string;
        }).join(', ') + ')' };
}

function aggregate() {
    for (var _len = arguments.length, callArgs = Array(_len), _key = 0; _key < _len; _key++) {
        callArgs[_key] = arguments[_key];
    }

    var callNode = call.apply(undefined, callArgs);
    return (0, _utils.merge)(callNode, { type: 'aggregate', id: (0, _utils.md5)(callNode.string) });
}

function binaryExpression(operator, left, right) {
    return {
        type: 'binaryExpression',
        operator: operator,
        left: left,
        right: right,
        string: '' + parenWrap(left) + ' ' + operator + ' ' + parenWrap(right) };
}

function namedExpression(expression) {
    var name = arguments[1] === undefined ? null : arguments[1];

    if (!name) {
        name = expression.type === 'identifier' ? expression.value : expression.string;
    }
    return {
        type: 'namedExpression',
        expression: expression,
        name: name };
}

function orderingTerm(expression) {
    var direction = arguments[1] === undefined ? 'asc' : arguments[1];

    return {
        type: 'orderingTerm',
        expression: expression,
        direction: direction.toLowerCase() };
}

function query(_ref) {
    var select = _ref.select;
    var from = _ref.from;
    var _ref$where = _ref.where;
    var where = _ref$where === undefined ? null : _ref$where;
    var _ref$groupBy = _ref.groupBy;
    var groupBy = _ref$groupBy === undefined ? null : _ref$groupBy;
    var _ref$having = _ref.having;
    var having = _ref$having === undefined ? null : _ref$having;
    var _ref$orderBy = _ref.orderBy;
    var orderBy = _ref$orderBy === undefined ? null : _ref$orderBy;
    var _ref$limit = _ref.limit;
    var limit = _ref$limit === undefined ? null : _ref$limit;
    var _ref$offset = _ref.offset;
    var offset = _ref$offset === undefined ? null : _ref$offset;
    var _ref$aggregates = _ref.aggregates;
    var aggregates = _ref$aggregates === undefined ? null : _ref$aggregates;

    return {
        select: select,
        from: from,
        where: where,
        groupBy: groupBy,
        having: having,
        orderBy: orderBy,
        limit: limit,
        offset: offset,
        aggregates: aggregates };
}

function parenWrap(exp) {
    if (exp.type === 'binaryExpression') {
        return '(' + exp.string + ')';
    } else return exp.string;
}

function quoteString(s, delimiter) {
    // TODO properly escape delimiters in strings when quoting
    return delimiter + s.split(delimiter).join('\\' + delimiter) + delimiter;
}