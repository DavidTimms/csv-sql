'use strict';

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj['default'] = obj; return newObj; } }

var _chai = require('chai');

var _ast = require('../ast');

var ast = _interopRequireWildcard(_ast);

var _tokenizer = require('../tokenizer');

var _parser = require('../parser');

describe('tokenize', function () {
    it('should detect keywords', function () {
        var tokens = (0, _tokenizer.tokenize)('SELECT from    where group   by aS LIMit');

        _chai.assert.deepEqual(tokens, [ast.keyword('SELECT'), ast.keyword('FROM'), ast.keyword('WHERE'), ast.keyword('GROUP'), ast.keyword('BY'), ast.keyword('AS'), ast.keyword('LIMIT')]);
    });

    it('should detect identifiers', function () {
        var tokens = (0, _tokenizer.tokenize)('SELECTED hello Dog a _underscored\nmulti_word_thing');

        _chai.assert.deepEqual(tokens, [ast.identifier('SELECTED'), ast.identifier('hello'), ast.identifier('Dog'), ast.identifier('a'), ast.identifier('_underscored'), ast.identifier('multi_word_thing')]);
    });

    it('should detect identifiers with spaces using backticks', function () {
        var tokens = (0, _tokenizer.tokenize)('`This is a literal identifier`` 1 2 \\` 3 `');

        _chai.assert.deepEqual(tokens, [ast.identifier('This is a literal identifier'), ast.identifier(' 1 2 ` 3 ')]);
    });

    it('should detect numbers', function () {
        var tokens = (0, _tokenizer.tokenize)('  3 56.3 3.141592 9832 293829047240 ');

        _chai.assert.deepEqual(tokens, [ast.number(3), ast.number(56.3), ast.number(3.141592), ast.number(9832), ast.number(293829047240)]);
    });

    it('should detect basic string literals', function () {
        var tokens = (0, _tokenizer.tokenize)('"hello there"');

        _chai.assert.deepEqual(tokens, [{ type: 'string', string: '"hello there"', value: 'hello there' }]);
    });

    it('should detect escaped string literals', function () {
        var tokens = (0, _tokenizer.tokenize)('\'how\\\'s "it" going?\'  "great!\\\\" ');

        _chai.assert.deepEqual(tokens, [{ type: 'string', string: '\'how\\\'s "it" going?\'', value: 'how\'s "it" going?' }, { type: 'string', string: '"great!\\\\"', value: 'great!\\' }]);
    });

    it('should detect tokens around strings', function () {
        var tokens = (0, _tokenizer.tokenize)('="foo",\'bar\'');

        _chai.assert.deepEqual(tokens, [ast.operator('='), { type: 'string', string: '"foo"', value: 'foo' }, ast.comma(), { type: 'string', string: '\'bar\'', value: 'bar' }]);
    });

    it('should detect parenthesis', function () {
        var tokens = (0, _tokenizer.tokenize)('() (((     ))');

        _chai.assert.deepEqual(tokens, [ast.parOpen(), ast.parClose(), ast.parOpen(), ast.parOpen(), ast.parOpen(), ast.parClose(), ast.parClose()]);
    });

    it('should detect stars', function () {
        var tokens = (0, _tokenizer.tokenize)('* (*) **');

        _chai.assert.deepEqual(tokens, [ast.star(), ast.parOpen(), ast.star(), ast.parClose(), ast.star(), ast.star()]);
    });

    it('should detect commas', function () {
        var tokens = (0, _tokenizer.tokenize)(', so, many,,, commas,');

        _chai.assert.deepEqual(tokens, [ast.comma(), ast.identifier('so'), ast.comma(), ast.identifier('many'), ast.comma(), ast.comma(), ast.comma(), ast.identifier('commas'), ast.comma()]);
    });

    it('should detect operators', function () {
        var tokens = (0, _tokenizer.tokenize)('== <= >=!=<> < >');

        _chai.assert.deepEqual(tokens, [ast.operator('='), ast.operator('='), ast.operator('<='), ast.operator('>='), ast.operator('!='), ast.operator('<>'), ast.operator('<'), ast.operator('>')]);
    });
});

describe('parseQuery', function () {
    it('should parse basic starred queries', function () {
        _chai.assert.deepEqual((0, _parser.parseQuery)('SELECT * FROM "example.csv"'), {
            select: '*',
            from: 'example.csv',
            where: null,
            groupBy: null,
            orderBy: null,
            having: null,
            limit: null,
            offset: null });
    });

    it('should parse queries with an output column list', function () {
        _chai.assert.deepEqual((0, _parser.parseQuery)('SELECT name, age, gender FROM "people.csv"'), {
            select: [ast.namedExpression(ast.identifier('name')), ast.namedExpression(ast.identifier('age')), ast.namedExpression(ast.identifier('gender'))],
            from: 'people.csv',
            where: null,
            groupBy: null,
            having: null,
            orderBy: null,
            limit: null,
            offset: null });
    });

    it('should parse queries with renamed columns', function () {
        _chai.assert.deepEqual((0, _parser.parseQuery)('SELECT a AS b FROM "c.csv"').select, [ast.namedExpression(ast.identifier('a'), 'b')]);
    });

    it('should parse queries with binary expressions', function () {
        _chai.assert.deepEqual((0, _parser.parseQuery)('SELECT a > b FROM "c.csv"').select, [ast.namedExpression(ast.binaryExpression('>', ast.identifier('a'), ast.identifier('b')))]);
    });

    it('should allow binary expressions mixed with functions and AS names', function () {
        var sql = 'SELECT UPPERCASE(left) = UPPERCASE(right) AS match FROM "c.csv"';
        _chai.assert.deepEqual((0, _parser.parseQuery)(sql).select, [{
            type: 'namedExpression',
            expression: {
                type: 'binaryExpression',
                operator: '=',
                left: {
                    type: 'call',
                    functionName: 'UPPERCASE',
                    arguments: [{
                        type: 'identifier',
                        string: 'left',
                        value: 'left' }],
                    string: 'UPPERCASE(left)' },
                right: {
                    type: 'call',
                    functionName: 'UPPERCASE',
                    arguments: [{
                        type: 'identifier',
                        string: 'right',
                        value: 'right' }],
                    string: 'UPPERCASE(right)' },
                string: 'UPPERCASE(left) = UPPERCASE(right)' },
            name: 'match' }]);
    });

    it('should support the AND operator', function () {
        var sql = 'SELECT a AND b FROM "c.csv"';
        _chai.assert.deepEqual((0, _parser.parseQuery)(sql).select, [ast.namedExpression(ast.binaryExpression('AND', ast.identifier('a'), ast.identifier('b')))]);
    });

    it('should allow grouping expressions with parenthesis', function () {
        var sql = 'SELECT (a OR b) AND c FROM "d.csv"';
        _chai.assert.deepEqual((0, _parser.parseQuery)(sql).select, [{
            type: 'namedExpression',
            expression: {
                type: 'binaryExpression',
                operator: 'AND',
                left: {
                    type: 'binaryExpression',
                    operator: 'OR',
                    left: {
                        type: 'identifier',
                        string: 'a',
                        value: 'a' },
                    right: {
                        type: 'identifier',
                        string: 'b',
                        value: 'b' },
                    string: 'a OR b' },
                right: {
                    type: 'identifier',
                    string: 'c',
                    value: 'c' },
                string: '(a OR b) AND c' },
            name: '(a OR b) AND c' }]);
    });

    it('should support correct operator precedence');

    it('should accept a LIMIT clause', function () {
        var sql = 'SELECT a FROM "b.csv" LIMIT 2';
        _chai.assert.deepEqual((0, _parser.parseQuery)(sql).limit, 2);
    });

    it('should accept an OFFSET clause', function () {
        var sql = 'SELECT a FROM "b.csv" LIMIT 2 OFFSET 3';
        _chai.assert.deepEqual((0, _parser.parseQuery)(sql).offset, 3);
    });

    it('should accept a WHERE clause', function () {
        var sql = 'SELECT a FROM "b.csv" WHERE a > 50';
        _chai.assert.deepEqual((0, _parser.parseQuery)(sql).where, {
            type: 'binaryExpression',
            operator: '>',
            left: {
                type: 'identifier',
                string: 'a',
                value: 'a' },
            right: {
                type: 'number',
                value: 50,
                string: '50' },
            string: 'a > 50' });
    });

    it('should accept a basic GROUP BY clause', function () {
        var sql = 'SELECT * FROM "a.csv" GROUP BY b';
        _chai.assert.deepEqual((0, _parser.parseQuery)(sql).groupBy, [{
            type: 'identifier',
            string: 'b',
            value: 'b' }]);
    });

    it('should accept a GROUP BY clause with multiple terms', function () {
        var sql = 'SELECT * FROM "a.csv" GROUP BY LOWERCASE(b),c="xyz"';
        _chai.assert.deepEqual((0, _parser.parseQuery)(sql).groupBy, [{
            type: 'call',
            functionName: 'LOWERCASE',
            arguments: [{
                type: 'identifier',
                string: 'b',
                value: 'b' }],
            string: 'LOWERCASE(b)' }, {
            type: 'binaryExpression',
            operator: '=',
            left: {
                type: 'identifier',
                string: 'c',
                value: 'c' },
            right: {
                type: 'string',
                string: '"xyz"',
                value: 'xyz' },
            string: 'c = "xyz"' }]);
    });

    it('should accept a HAVING clause', function () {
        var sql = 'SELECT * FROM "a.csv" GROUP BY b HAVING c = 2';
        _chai.assert.deepEqual((0, _parser.parseQuery)(sql).having, {
            type: 'binaryExpression',
            operator: '=',
            left: {
                type: 'identifier',
                string: 'c',
                value: 'c' },
            right: {
                type: 'number',
                string: '2',
                value: 2 },
            string: 'c = 2' });
    });

    it('should reject a HAVING clause without a GROUP BY', function () {
        var sql = 'SELECT * FROM "a.csv" HAVING b = 2';
        _chai.assert.throws(function () {
            return (0, _parser.parseQuery)(sql);
        }, SyntaxError);
    });

    it('should accept a basic ORDER BY clause', function () {
        var sql = 'SELECT * FROM "a.csv" ORDER BY b';
        _chai.assert.deepEqual((0, _parser.parseQuery)(sql).orderBy, [{
            direction: 'asc',
            expression: {
                type: 'identifier',
                string: 'b',
                value: 'b' } }]);
    });

    it('should accept an ORDER BY clause with multiple terms', function () {
        var sql = 'SELECT * FROM "a.csv" ORDER BY UPPERCASE(b), c, d = "test"';
        _chai.assert.deepEqual((0, _parser.parseQuery)(sql).orderBy, [{
            direction: 'asc',
            expression: {
                type: 'call',
                functionName: 'UPPERCASE',
                arguments: [{
                    type: 'identifier',
                    string: 'b',
                    value: 'b' }],
                string: 'UPPERCASE(b)' } }, {
            direction: 'asc',
            expression: {
                type: 'identifier',
                string: 'c',
                value: 'c' } }, {
            direction: 'asc',
            expression: {
                type: 'binaryExpression',
                operator: '=',
                left: {
                    type: 'identifier',
                    string: 'd',
                    value: 'd' },
                right: {
                    type: 'string',
                    string: '"test"',
                    value: 'test' },
                string: 'd = "test"' } }]);
    });

    it('should accept an ORDER BY clause with a direction', function () {
        var sql = 'SELECT * FROM "a.csv" ORDER BY b DESC';
        _chai.assert.deepEqual((0, _parser.parseQuery)(sql).orderBy[0].direction, 'desc');
    });

    it('should accept an ORDER BY clause with mixed directions', function () {
        var sql = 'SELECT * FROM "a.csv" ORDER BY b DESC, c ASC';
        _chai.assert.deepEqual((0, _parser.parseQuery)(sql).orderBy[0].direction, 'desc');
        _chai.assert.deepEqual((0, _parser.parseQuery)(sql).orderBy[1].direction, 'asc');
    });
});