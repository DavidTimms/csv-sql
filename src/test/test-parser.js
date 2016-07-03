
import {assert} from 'chai';
import * as ast from '../ast';
import {tokenize} from '../tokenizer';
import {parseQuery, parseSubQuery} from '../parser';


describe('tokenize', () => {
    it('should detect keywords', () => {
        const tokens = tokenize('SELECT from    where group   by aS LIMit');

        assert.deepEqual(tokens, [
            ast.keyword('SELECT'),
            ast.keyword('FROM'),
            ast.keyword('WHERE'),
            ast.keyword('GROUP'),
            ast.keyword('BY'),
            ast.keyword('AS'),
            ast.keyword('LIMIT'),
        ]);
    });

    it('should detect identifiers', () => {
        const tokens = tokenize('SELECTED hello Dog a _underscored\nmulti_word_thing');

        assert.deepEqual(tokens, [
            ast.identifier('SELECTED'),
            ast.identifier('hello'),
            ast.identifier('Dog'),
            ast.identifier('a'),
            ast.identifier('_underscored'),
            ast.identifier('multi_word_thing'),
        ]);
    });

    it('should detect identifiers with spaces using backticks', () => {
        const tokens = tokenize('`This is a literal identifier`` 1 2 \\` 3 `');

        assert.deepEqual(tokens, [
            ast.identifier('This is a literal identifier'),
            ast.identifier(' 1 2 ` 3 '),
        ]);
    });

    it('should detect numbers', () => {
        const tokens = tokenize('  3 56.3 3.141592 9832 293829047240 ');

        assert.deepEqual(tokens, [
            ast.number(3),
            ast.number(56.3),
            ast.number(3.141592),
            ast.number(9832),
            ast.number(293829047240),
        ]);
    });

    it('should detect basic string literals', () => {
        const tokens = tokenize(`"hello there"`);

        assert.deepEqual(tokens, [
            {type: 'string', string: '"hello there"', value: 'hello there'},
        ]);
    });

    it('should detect escaped string literals', () => {
        const tokens = tokenize(`'how\\'s "it" going?'  "great!\\\\" `);

        assert.deepEqual(tokens, [
            {type: 'string', string: '\'how\\\'s "it" going?\'', value: 'how\'s "it" going?'},
            {type: 'string', string: '"great!\\\\"', value: 'great!\\'},
        ]);
    });

    it('should detect tokens around strings', () => {
        const tokens = tokenize(`="foo",'bar'`);

        assert.deepEqual(tokens, [
            ast.operator('='),
            {type: 'string', string: '"foo"', value: 'foo'},
            ast.comma(),
            {type: 'string', string: '\'bar\'', value: 'bar'},
        ]);
    });

    it('should detect parenthesis', () => {
        const tokens = tokenize('() (((     ))');

        assert.deepEqual(tokens, [
            ast.parOpen(),
            ast.parClose(),
            ast.parOpen(),
            ast.parOpen(),
            ast.parOpen(),
            ast.parClose(),
            ast.parClose(),
        ]);
    });

    it('should detect commas', () => {
        const tokens = tokenize(', so, many,,, commas,');

        assert.deepEqual(tokens, [
            ast.comma(),
            ast.identifier('so'),
            ast.comma(),
            ast.identifier('many'),
            ast.comma(),
            ast.comma(),
            ast.comma(),
            ast.identifier('commas'),
            ast.comma(),
        ]);
    });

    it('should detect operators', () => {
        const tokens = tokenize('== <= >=!=<> < >');

        assert.deepEqual(tokens, [
            ast.operator('='),
            ast.operator('='),
            ast.operator('<='),
            ast.operator('>='),
            ast.operator('!='),
            ast.operator('<>'),
            ast.operator('<'),
            ast.operator('>'),
        ]);
    });
});


describe('parseQuery', () => {
    it('should parse basic starred queries', () => {
        assert.deepEqual(parseQuery('SELECT * FROM "example.csv"'), ast.query({
            select: '*',
            from: 'example.csv',
        }));
    });
    
    it('should parse queries with an output column list', () => {
        assert.deepEqual(parseQuery('SELECT name, age, gender FROM "people.csv"'), ast.query({
            select: [
                ast.namedExpression(ast.identifier('name')),
                ast.namedExpression(ast.identifier('age')),
                ast.namedExpression(ast.identifier('gender')),
            ],
            from: 'people.csv',
        }));
    });
    
    it('should parse queries with renamed columns', () => {
        assert.deepEqual(parseQuery('SELECT a AS b FROM "c.csv"').select, [
            ast.namedExpression(ast.identifier('a'), 'b'),
        ]);
    });
    
    it('should parse queries with binary expressions', () => {
        assert.deepEqual(parseQuery('SELECT a > b FROM "c.csv"').select, [
            ast.namedExpression(
                ast.binaryExpression(
                    '>',
                    ast.identifier('a'),
                    ast.identifier('b')
                )
            ),
        ]);
    });
    
    it('should allow binary expressions mixed with functions and AS names', () => {
        const sql = (
            'SELECT UPPERCASE(left) = UPPERCASE(right) AS match FROM "c.csv"');
        assert.deepEqual(parseQuery(sql).select, [
            ast.namedExpression(
                ast.binaryExpression(
                    '=',
                    ast.call('UPPERCASE', [ast.identifier('left')]),
                    ast.call('UPPERCASE', [ast.identifier('right')])
                ),
                'match'
            )
        ]);
    });

    it('should support the AND operator', () => {
        const sql = ('SELECT a AND b FROM "c.csv"');
        assert.deepEqual(parseQuery(sql).select, [
            ast.namedExpression(
                ast.binaryExpression(
                    'AND',
                    ast.identifier('a'),
                    ast.identifier('b')
                )
            )
        ]);
    });

    it('should allow grouping expressions with parenthesis', () => {
        const sql = ('SELECT (a OR b) AND c FROM "d.csv"');
        assert.deepEqual(parseQuery(sql).select, [
            ast.namedExpression(
                ast.binaryExpression(
                    'AND',
                    ast.binaryExpression(
                        'OR',
                        ast.identifier('a'),
                        ast.identifier('b')
                    ),
                    ast.identifier('c')
                )
            )
        ]);
    });

    it('should support correct operator precedence', () => {
        const sql = 'SELECT 1 * 2 + 3 > 4 OR a = b = TRUE FROM "a.csv"';
        assert.deepEqual(parseQuery(sql).select, [
            ast.namedExpression(
                ast.binaryExpression(
                    'OR',
                    ast.binaryExpression(
                        '>',
                        ast.binaryExpression(
                            '+',
                            ast.binaryExpression(
                                '*',
                                ast.number(1),
                                ast.number(2)
                            ),
                            ast.number(3)
                        ),
                        ast.number(4)
                    ),
                    ast.binaryExpression(
                        '=',
                        ast.identifier('a'),
                        ast.binaryExpression(
                            '=',
                            ast.identifier('b'),
                            ast.literal(true)
                        )
                    )
                )
            )
        ]);
    });

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
        assert.deepEqual(
            parseQuery(sql).where,
            ast.binaryExpression('>', ast.identifier('a'), ast.number(50))
        );
    });

    it('should accept a basic GROUP BY clause', () => {
        const sql = ('SELECT * FROM "a.csv" GROUP BY b');
        assert.deepEqual(parseQuery(sql).groupBy, [ast.identifier('b')]);
    });

    it('should accept a GROUP BY clause with multiple terms', () => {
        const sql = ('SELECT * FROM "a.csv" GROUP BY LOWERCASE(b),c="xyz"');
        assert.deepEqual(parseQuery(sql).groupBy, [
            ast.call('LOWERCASE', [ast.identifier('b')]),
            ast.binaryExpression('=', ast.identifier('c'), ast.string('xyz')),
        ]);
    });

    it('should accept a HAVING clause', () => {
        const sql = ('SELECT * FROM "a.csv" GROUP BY b HAVING c = 2');
        assert.deepEqual(
            parseQuery(sql).having, 
            ast.binaryExpression('=', ast.identifier('c'), ast.number(2))
        );
    });

    it('should reject a HAVING clause without a GROUP BY', () => {
        const sql = ('SELECT * FROM "a.csv" HAVING b = 2');
        assert.throws(() => parseQuery(sql), SyntaxError);
    });

    it('should allow COUNT(*)', () => {
        const sql = 'SELECT COUNT(*) FROM "a.csv"';
        assert.deepEqual(parseQuery(sql).select, [
            ast.namedExpression(ast.call('COUNT', [ast.star()])),
        ]);
    });

    it('should accept a basic ORDER BY clause', () => {
        const sql = 'SELECT * FROM "a.csv" ORDER BY b';
        assert.deepEqual(parseQuery(sql).orderBy, [
            ast.orderingTerm(ast.identifier('b'), 'ASC'),
        ]);
    });

    it('should accept an ORDER BY clause with multiple terms', () => {
        const sql = 'SELECT * FROM "a.csv" ORDER BY UPPERCASE(b), c, d = "test"';
        assert.deepEqual(parseQuery(sql).orderBy, [
            ast.orderingTerm(ast.call('UPPERCASE', [ast.identifier('b')])),
            ast.orderingTerm(ast.identifier('c')),
            ast.orderingTerm(
                ast.binaryExpression('=', ast.identifier('d'), ast.string('test'))
            )
        ]);
    });

    it('should accept an ORDER BY clause with a direction', () => {
        const sql = 'SELECT * FROM "a.csv" ORDER BY b DESC';
        assert.deepEqual(parseQuery(sql).orderBy[0].direction, 'desc');
    });

    it('should accept an ORDER BY clause with mixed directions', () => {
        const sql = 'SELECT * FROM "a.csv" ORDER BY b DESC, c ASC';
        assert.deepEqual(parseQuery(sql).orderBy[0].direction, 'desc');
        assert.deepEqual(parseQuery(sql).orderBy[1].direction, 'asc');
    });


    it('should accept a if-style CASE expression, without an ELSE part', () => {
        const sql = 'SELECT CASE WHEN a THEN b END FROM "a.csv"';
        assert.deepEqual(parseQuery(sql).select[0].expression, 
            ast.caseIf([
                ast.whenThen(ast.identifier('a'), ast.identifier('b')),
            ])
        );
    });

    it('should accept a if-style CASE expression, with an ELSE part', () => {
        const sql = 'SELECT CASE WHEN a THEN b ELSE c END FROM "a.csv"';
        assert.deepEqual(parseQuery(sql).select[0].expression, 
            ast.caseIf([
                ast.whenThen(ast.identifier('a'), ast.identifier('b')),
            ], ast.identifier('c'))
        );
    });

    it('should accept a if-style CASE expression with multiple cases', () => {
        const sql = 'SELECT CASE WHEN a THEN b WHEN c THEN d END FROM "a.csv"';
        assert.deepEqual(parseQuery(sql).select[0].expression, 
            ast.caseIf([
                ast.whenThen(ast.identifier('a'), ast.identifier('b')),
                ast.whenThen(ast.identifier('c'), ast.identifier('d')),
            ])
        );
    });

    it('should accept a switch-style CASE expression', () => {
        const sql = 'SELECT CASE a WHEN b THEN c WHEN d THEN e END FROM "a.csv"';
        assert.deepEqual(parseQuery(sql).select[0].expression, 
            ast.caseSwitch(ast.identifier('a'), [
                ast.whenThen(ast.identifier('b'), ast.identifier('c')),
                ast.whenThen(ast.identifier('d'), ast.identifier('e')),
            ])
        );
    });
});
