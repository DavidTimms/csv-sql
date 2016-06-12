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
exports.caseIf = caseIf;
exports.caseSwitch = caseSwitch;
exports.whenThen = whenThen;
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

function caseIf(cases) {
    var elseExpression = arguments[1] === undefined ? null : arguments[1];

    var node = {
        type: 'caseIf',
        cases: cases,
        elseExpression: elseExpression };

    node.string = caseString(node);
    return node;
}

function caseSwitch(switchExpression, cases) {
    var elseExpression = arguments[2] === undefined ? null : arguments[2];

    var node = {
        type: 'caseSwitch',
        switchExpression: switchExpression,
        cases: cases,
        elseExpression: elseExpression };

    node.string = caseString(node);
    return node;
}

function caseString(_ref) {
    var switchExpression = _ref.switchExpression;
    var cases = _ref.cases;
    var elseExpression = _ref.elseExpression;

    var switchString = switchExpression ? ' ' + switchExpression.string : '';
    var elseString = elseExpression ? ' ELSE ' + elseExpression.string : '';

    return 'CASE' + switchString + ' ' + cases.map(function (c) {
        return c.string;
    }).join(' ') + '' + elseString + ' END';
}

function whenThen(when, then) {
    return {
        type: 'whenThen',
        when: when,
        then: then,
        string: 'WHEN ' + when.string + ' THEN ' + then.string };
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

function query(_ref2) {
    var select = _ref2.select;
    var from = _ref2.from;
    var _ref2$where = _ref2.where;
    var where = _ref2$where === undefined ? null : _ref2$where;
    var _ref2$groupBy = _ref2.groupBy;
    var groupBy = _ref2$groupBy === undefined ? null : _ref2$groupBy;
    var _ref2$having = _ref2.having;
    var having = _ref2$having === undefined ? null : _ref2$having;
    var _ref2$orderBy = _ref2.orderBy;
    var orderBy = _ref2$orderBy === undefined ? null : _ref2$orderBy;
    var _ref2$limit = _ref2.limit;
    var limit = _ref2$limit === undefined ? null : _ref2$limit;
    var _ref2$offset = _ref2.offset;
    var offset = _ref2$offset === undefined ? null : _ref2$offset;
    var _ref2$aggregates = _ref2.aggregates;
    var aggregates = _ref2$aggregates === undefined ? null : _ref2$aggregates;

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