
import {assert} from 'chai';
import {
    parseQuery,
    parseSubQuery,
    tokenize,
} from '../parser';

describe('tokenize', () => {
    it('should detect keywords', () => {
        const tokens = tokenize('SELECT from    where group   by aS LIMit');

        assert.deepEqual(tokens, [
            {type: 'keyword', string: 'SELECT'},
            {type: 'keyword', string: 'FROM'},
            {type: 'keyword', string: 'WHERE'},
            {type: 'keyword', string: 'GROUP'},
            {type: 'keyword', string: 'BY'},
            {type: 'keyword', string: 'AS'},
            {type: 'keyword', string: 'LIMIT'},
        ]);
    });

    it('should detect identifiers', () => {
        const tokens = tokenize('SELECTED hello Dog a _underscored\nmulti_word_thing');

        assert.deepEqual(tokens, [
            {type: 'word', string: 'SELECTED'},
            {type: 'word', string: 'hello'},
            {type: 'word', string: 'Dog'},
            {type: 'word', string: 'a'},
            {type: 'word', string: '_underscored'},
            {type: 'word', string: 'multi_word_thing'},
        ]);
    });

    it('should detect numbers', () => {
        const tokens = tokenize('  3 56.3 3.141592 9832 293829047240 ');

        assert.deepEqual(tokens, [
            {type: 'number', string: '3', value: 3},
            {type: 'number', string: '56.3', value: 56.3},
            {type: 'number', string: '3.141592', value: 3.141592},
            {type: 'number', string: '9832', value: 9832},
            {type: 'number', string: '293829047240', value: 293829047240},
        ]);
    });

    it('should detect basic string literals', () => {
        const tokens = tokenize(`"hello there"`);

        assert.deepEqual(tokens, [
            {type: 'string', string: '"hello there"', value: 'hello there'},
        ]);
    });

    it('should detect escaped string literals'); (() => {
        const tokens = tokenize(`'how\'s "it" going?'  "great!\\\\" `);

        assert.deepEqual(tokens, [
            {type: 'string', string: '\'how\\\'s "it" going?\'', value: 'how\'s it going?'},
            {type: 'string', string: '"great!\\\\"', value: 'great!\\'},
        ]);
    });

    it('should detect parenthesis', () => {
        const tokens = tokenize('() (((     ))');

        assert.deepEqual(tokens, [
            {type: 'parOpen', string: '('},
            {type: 'parClose', string: ')'},
            {type: 'parOpen', string: '('},
            {type: 'parOpen', string: '('},
            {type: 'parOpen', string: '('},
            {type: 'parClose', string: ')'},
            {type: 'parClose', string: ')'},
        ]);
    });

    it('should detect stars', () => {
        const tokens = tokenize('* (*) **');

        assert.deepEqual(tokens, [
            {type: 'star', string: '*'},
            {type: 'parOpen', string: '('},
            {type: 'star', string: '*'},
            {type: 'parClose', string: ')'},
            {type: 'star', string: '*'},
            {type: 'star', string: '*'},
        ]);
    });

    it('should detect commas', () => {
        const tokens = tokenize(', so, many,,, commas,');

        assert.deepEqual(tokens, [
            {type: 'comma', string: ','},
            {type: 'word', string: 'so'},
            {type: 'comma', string: ','},
            {type: 'word', string: 'many'},
            {type: 'comma', string: ','},
            {type: 'comma', string: ','},
            {type: 'comma', string: ','},
            {type: 'word', string: 'commas'},
            {type: 'comma', string: ','},
        ]);
    });

    it('should detect commas', () => {
        const tokens = tokenize(', so, many,,, commas,');

        assert.deepEqual(tokens, [
            {type: 'comma', string: ','},
            {type: 'word', string: 'so'},
            {type: 'comma', string: ','},
            {type: 'word', string: 'many'},
            {type: 'comma', string: ','},
            {type: 'comma', string: ','},
            {type: 'comma', string: ','},
            {type: 'word', string: 'commas'},
            {type: 'comma', string: ','},
        ]);
    });

    it('should detect operators', () => {
        const tokens = tokenize('== <= >=!=<> < >');

        assert.deepEqual(tokens, [
            {type: 'operator', string: '='},
            {type: 'operator', string: '='},
            {type: 'operator', string: '<='},
            {type: 'operator', string: '>='},
            {type: 'operator', string: '!='},
            {type: 'operator', string: '<>'},
            {type: 'operator', string: '<'},
            {type: 'operator', string: '>'},
        ]);
    });
});


describe('parseQuery', () => {
    it('should parse basic starred queries', () => {
        assert.deepEqual(parseQuery('SELECT * FROM "example.csv"'), {
            outputColumns: '*',
            primaryTable: 'example.csv',
            condition: null,
        });
    });
    
    it('should parse queries with an output column list', () => {
        assert.deepEqual(parseQuery('SELECT name, age, gender FROM "people.csv"'), {
            outputColumns: [
                {
                    type: 'namedExpression',
                    expression: {
                        type: 'word',
                        string: 'name',
                    },
                    name: 'name',
                },
                {
                    type: 'namedExpression',
                    expression: {
                        type: 'word',
                        string: 'age',
                    },
                    name: 'age',
                },
                {
                    type: 'namedExpression',
                    expression: {
                        type: 'word',
                        string: 'gender',
                    },
                    name: 'gender',
                },
            ],
            primaryTable: 'people.csv',
            condition: null,
        });
    });
    
    it('should parse queries with renamed columns', () => {
        assert.deepEqual(parseQuery('SELECT a AS b FROM "c.csv"').outputColumns, [
            {
                type: 'namedExpression',
                expression: {
                    type: 'word',
                    string: 'a',
                },
                name: 'b',
            },
        ]);
    });
    
    it('should parse queries with binary expressions', () => {
        assert.deepEqual(parseQuery('SELECT a > b FROM "c.csv"').outputColumns, [
            {
                type: 'namedExpression',
                expression: {
                    type: 'binaryExpression',
                    operator: '>',
                    left: {
                        type: 'word',
                        string: 'a',
                    },
                    right: {
                        type: 'word',
                        string: 'b',
                    },
                    string: 'a > b',
                },
                name: 'a > b',
            },
        ]);
    });
    
    it('should allow binary expressions mixed with functions and AS names', () => {
        const sql = (
            'SELECT UPPERCASE(left) = UPPERCASE(right) AS match FROM "c.csv"');
        assert.deepEqual(parseQuery(sql).outputColumns, [
            {
                type: 'namedExpression',
                expression: {
                    type: 'binaryExpression',
                    operator: '=',
                    left: {
                        type: 'call',
                        functionName: 'UPPERCASE',
                        arguments: [{
                            type: 'word',
                            string: 'left',
                        }],
                        string: 'UPPERCASE(left)',
                    },
                    right: {
                        type: 'call',
                        functionName: 'UPPERCASE',
                        arguments: [{
                            type: 'word',
                            string: 'right',
                        }],
                        string: 'UPPERCASE(right)',
                    },
                    string: 'UPPERCASE(left) = UPPERCASE(right)',
                },
                name: 'match',
            },
        ]);
    });

    it('should support the AND operator', () => {
        const sql = ('SELECT a AND b FROM "c.csv"');
        assert.deepEqual(parseQuery(sql).outputColumns[0].expression, {
            type: 'binaryExpression',
            operator: 'AND',
            left: {
                type: 'word',
                string: 'a',
            },
            right: {
                type: 'word',
                string: 'b',
            },
            string: 'a AND b',
        });
    });

    it('should allow grouping expressions with parenthesis', () => {
        const sql = ('SELECT (a OR b) AND c FROM "d.csv"');
        assert.deepEqual(parseQuery(sql).outputColumns, [
            {
                type: 'namedExpression',
                expression: {
                    type: 'binaryExpression',
                    operator: 'AND',
                    left: {
                        type: 'binaryExpression',
                        operator: 'OR',
                        left: {
                            type: 'word',
                            string: 'a',
                        },
                        right: {
                            type: 'word',
                            string: 'b',
                        },
                        string: 'a OR b',
                    },
                    right: {
                        type: 'word',
                        string: 'c',
                    },
                    string: '(a OR b) AND c',
                },
                name: '(a OR b) AND c',
            },
        ]);
    });

    it('should support correct operator precedence');

    it('should accept a LIMIT clause', () => {
        const sql = ('SELECT a FROM "b.csv" LIMIT 2');
        assert.deepEqual(parseQuery(sql).limit, 2);
    });

    it('should accept an OFFSET clause', () => {
        const sql = ('SELECT a FROM "b.csv" LIMIT 2 OFFSET 3');
        assert.deepEqual(parseQuery(sql).offset, 3);
    });

    it('should accept a WHERE clause', () => {
        const sql = ('SELECT a FROM "b.csv" WHERE a > 50');
        assert.deepEqual(parseQuery(sql).condition, {
            type: 'binaryExpression',
            operator: '>',
            left: {
                type: 'word',
                string: 'a',
            },
            right: {
                type: 'number',
                value: 50,
                string: '50',
            },
            string: 'a > 50',
        });
    });
});