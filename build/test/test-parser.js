'use strict';

var _chai = require('chai');

var _tokenizer = require('../tokenizer');

var _parser = require('../parser');

describe('tokenize', function () {
    it('should detect keywords', function () {
        var tokens = (0, _tokenizer.tokenize)('SELECT from    where group   by aS LIMit');

        _chai.assert.deepEqual(tokens, [{ type: 'keyword', string: 'SELECT' }, { type: 'keyword', string: 'FROM' }, { type: 'keyword', string: 'WHERE' }, { type: 'keyword', string: 'GROUP' }, { type: 'keyword', string: 'BY' }, { type: 'keyword', string: 'AS' }, { type: 'keyword', string: 'LIMIT' }]);
    });

    it('should detect identifiers', function () {
        var tokens = (0, _tokenizer.tokenize)('SELECTED hello Dog a _underscored\nmulti_word_thing');

        _chai.assert.deepEqual(tokens, [{ type: 'identifier', string: 'SELECTED', value: 'SELECTED' }, { type: 'identifier', string: 'hello', value: 'hello' }, { type: 'identifier', string: 'Dog', value: 'Dog' }, { type: 'identifier', string: 'a', value: 'a' }, { type: 'identifier', string: '_underscored', value: '_underscored' }, { type: 'identifier', string: 'multi_word_thing', value: 'multi_word_thing' }]);
    });

    it('should detect identifiers with spaces using backticks', function () {
        var tokens = (0, _tokenizer.tokenize)('`This is a literal identifier`` 1 2 \\` 3 `');

        _chai.assert.deepEqual(tokens, [{
            type: 'identifier',
            string: '`This is a literal identifier`',
            value: 'This is a literal identifier' }, {
            type: 'identifier',
            string: '` 1 2 \\` 3 `',
            value: ' 1 2 ` 3 ' }]);
    });

    it('should detect numbers', function () {
        var tokens = (0, _tokenizer.tokenize)('  3 56.3 3.141592 9832 293829047240 ');

        _chai.assert.deepEqual(tokens, [{ type: 'number', string: '3', value: 3 }, { type: 'number', string: '56.3', value: 56.3 }, { type: 'number', string: '3.141592', value: 3.141592 }, { type: 'number', string: '9832', value: 9832 }, { type: 'number', string: '293829047240', value: 293829047240 }]);
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

        _chai.assert.deepEqual(tokens, [{ type: 'operator', string: '=' }, { type: 'string', string: '"foo"', value: 'foo' }, { type: 'comma', string: ',' }, { type: 'string', string: '\'bar\'', value: 'bar' }]);
    });

    it('should detect parenthesis', function () {
        var tokens = (0, _tokenizer.tokenize)('() (((     ))');

        _chai.assert.deepEqual(tokens, [{ type: 'parOpen', string: '(' }, { type: 'parClose', string: ')' }, { type: 'parOpen', string: '(' }, { type: 'parOpen', string: '(' }, { type: 'parOpen', string: '(' }, { type: 'parClose', string: ')' }, { type: 'parClose', string: ')' }]);
    });

    it('should detect stars', function () {
        var tokens = (0, _tokenizer.tokenize)('* (*) **');

        _chai.assert.deepEqual(tokens, [{ type: 'star', string: '*' }, { type: 'parOpen', string: '(' }, { type: 'star', string: '*' }, { type: 'parClose', string: ')' }, { type: 'star', string: '*' }, { type: 'star', string: '*' }]);
    });

    it('should detect commas', function () {
        var tokens = (0, _tokenizer.tokenize)(', so, many,,, commas,');

        _chai.assert.deepEqual(tokens, [{ type: 'comma', string: ',' }, { type: 'identifier', string: 'so', value: 'so' }, { type: 'comma', string: ',' }, { type: 'identifier', string: 'many', value: 'many' }, { type: 'comma', string: ',' }, { type: 'comma', string: ',' }, { type: 'comma', string: ',' }, { type: 'identifier', string: 'commas', value: 'commas' }, { type: 'comma', string: ',' }]);
    });

    it('should detect commas', function () {
        var tokens = (0, _tokenizer.tokenize)(', so, many,,, commas,');

        _chai.assert.deepEqual(tokens, [{ type: 'comma', string: ',' }, { type: 'identifier', string: 'so', value: 'so' }, { type: 'comma', string: ',' }, { type: 'identifier', string: 'many', value: 'many' }, { type: 'comma', string: ',' }, { type: 'comma', string: ',' }, { type: 'comma', string: ',' }, { type: 'identifier', string: 'commas', value: 'commas' }, { type: 'comma', string: ',' }]);
    });

    it('should detect operators', function () {
        var tokens = (0, _tokenizer.tokenize)('== <= >=!=<> < >');

        _chai.assert.deepEqual(tokens, [{ type: 'operator', string: '=' }, { type: 'operator', string: '=' }, { type: 'operator', string: '<=' }, { type: 'operator', string: '>=' }, { type: 'operator', string: '!=' }, { type: 'operator', string: '<>' }, { type: 'operator', string: '<' }, { type: 'operator', string: '>' }]);
    });
});

describe('parseQuery', function () {
    it('should parse basic starred queries', function () {
        _chai.assert.deepEqual((0, _parser.parseQuery)('SELECT * FROM "example.csv"'), {
            select: '*',
            from: 'example.csv',
            where: null,
            orderBy: null,
            limit: null,
            offset: null });
    });

    it('should parse queries with an output column list', function () {
        _chai.assert.deepEqual((0, _parser.parseQuery)('SELECT name, age, gender FROM "people.csv"'), {
            select: [{
                type: 'namedExpression',
                expression: {
                    type: 'identifier',
                    string: 'name',
                    value: 'name' },
                name: 'name' }, {
                type: 'namedExpression',
                expression: {
                    type: 'identifier',
                    string: 'age',
                    value: 'age' },
                name: 'age' }, {
                type: 'namedExpression',
                expression: {
                    type: 'identifier',
                    string: 'gender',
                    value: 'gender' },
                name: 'gender' }],
            from: 'people.csv',
            where: null,
            orderBy: null,
            limit: null,
            offset: null });
    });

    it('should parse queries with renamed columns', function () {
        _chai.assert.deepEqual((0, _parser.parseQuery)('SELECT a AS b FROM "c.csv"').select, [{
            type: 'namedExpression',
            expression: {
                type: 'identifier',
                string: 'a',
                value: 'a' },
            name: 'b' }]);
    });

    it('should parse queries with binary expressions', function () {
        _chai.assert.deepEqual((0, _parser.parseQuery)('SELECT a > b FROM "c.csv"').select, [{
            type: 'namedExpression',
            expression: {
                type: 'binaryExpression',
                operator: '>',
                left: {
                    type: 'identifier',
                    string: 'a',
                    value: 'a' },
                right: {
                    type: 'identifier',
                    string: 'b',
                    value: 'b' },
                string: 'a > b' },
            name: 'a > b' }]);
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
        _chai.assert.deepEqual((0, _parser.parseQuery)(sql).select[0].expression, {
            type: 'binaryExpression',
            operator: 'AND',
            left: {
                type: 'identifier',
                string: 'a',
                value: 'a' },
            right: {
                type: 'identifier',
                string: 'b',
                value: 'b' },
            string: 'a AND b' });
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