'use strict';

Object.defineProperty(exports, '__esModule', {
    value: true
});
exports.literal = literal;
exports.identifier = identifier;
exports.number = number;
exports.call = call;
exports.binaryExpression = binaryExpression;
exports.namedExpression = namedExpression;

function literal(value) {
    var string = undefined;
    if (typeof value === 'string') {
        string = quoteString(value, '"');
    } else {
        string = String(value).toUpperCase();
    }
    return {
        type: 'literal',
        value: value,
        string: string };
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

function parenWrap(exp) {
    if (exp.type === 'binaryExpression') {
        return '(' + exp.string + ')';
    } else return exp.string;
}

function quoteString(s, delimiter) {
    // TODO properly escape delimiters in strings when quoting
    return delimiter + s.split(delimiter).join('\\' + delimiter) + delimiter;
}