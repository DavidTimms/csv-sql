
import {assert} from 'chai';
import {
    identifyAggregatesInQuery,
    identifyAggregatesInExpression,
} from '../aggregates';
import * as ast from '../ast';


describe('identifyAggregatesInExpression', () => {

    it('should find no aggregates for basic expressions', () => {
        const basicExps = [
            ast.identifier('foo'),
            ast.number(2),
            ast.literal(true),
            ast.string('foo'),
        ];

        basicExps.forEach(exp => {
            assert.deepEqual(
                identifyAggregatesInExpression(exp),
                {aggregates: [], expression: exp}
            );
        });

    });

    it('should find aggregates for function calls', () => {
        const exp = ast.call('COUNT', [ast.number(1)]);
        const aggregateExp = ast.aggregate('COUNT', [ast.number(1)]);

        assert.deepEqual(
            identifyAggregatesInExpression(exp),
            {aggregates: [aggregateExp], expression: aggregateExp}
        );
    });

    it('should find single aggregates in the leaves of binary expressions', () => {
        const exp = ast.binaryExpression(
            '+',
            ast.number(1),
            ast.call('count', [ast.identifier('id')])
        );
        const aggregateExp = ast.aggregate('count', [ast.identifier('id')]);

        assert.deepEqual(
            identifyAggregatesInExpression(exp),
            {
                aggregates: [aggregateExp],
                expression: ast.binaryExpression('+', ast.number(1), aggregateExp),
            }
        );
    });

    it('should find multiple aggregates in the leaves of binary expressions', () => {
        const exp = ast.binaryExpression(
            '-',
            ast.call('max', [ast.identifier('age')]),
            ast.call('min', [ast.identifier('age')])
        );

        assert.deepEqual(
            identifyAggregatesInExpression(exp),
            {
                aggregates: [
                    ast.aggregate('max', [ast.identifier('age')]),
                    ast.aggregate('min', [ast.identifier('age')]),
                ],
                expression: ast.binaryExpression(
                    '-', 
                    ast.aggregate('max', [ast.identifier('age')]),
                    ast.aggregate('min', [ast.identifier('age')])
                ),
            }
        );
    });

    it('should find multiple aggregates in the arguments of function calls', () => {
        const exp = ast.call('CONCAT', [
            ast.call('CONCAT', [
                ast.call('max', [ast.identifier('name')]),
                ast.call('min', [ast.identifier('name')]),
            ]),
            ast.call('count', [ast.number(1)]),
            ast.call('count', [ast.identifier('male')]),
        ]);

        assert.deepEqual(
            identifyAggregatesInExpression(exp),
            {
                aggregates: [
                    ast.aggregate('max', [ast.identifier('name')]),
                    ast.aggregate('min', [ast.identifier('name')]),
                    ast.aggregate('count', [ast.number(1)]),
                    ast.aggregate('count', [ast.identifier('male')]),
                ],
                expression: ast.call('CONCAT', [
                    ast.call('CONCAT', [
                        ast.aggregate('max', [ast.identifier('name')]),
                        ast.aggregate('min', [ast.identifier('name')]),
                    ]),
                    ast.aggregate('count', [ast.number(1)]),
                    ast.aggregate('count', [ast.identifier('male')]),
                ])
            }
        );
    });

    it('should eliminate duplicate aggregate expressions', () => {
        const exp = ast.binaryExpression(
            '*',
            ast.call('count', [ast.identifier('id')]),
            ast.call('count', [ast.identifier('id')])
        );

        assert.deepEqual(
            identifyAggregatesInExpression(exp),
            {
                aggregates: [
                    ast.aggregate('count', [ast.identifier('id')]),
                ],
                expression: ast.binaryExpression(
                    '*', 
                    ast.aggregate('count', [ast.identifier('id')]),
                    ast.aggregate('count', [ast.identifier('id')])
                ),
            }
        );
    });
});

describe('identifyAggregatesInQuery', () => {

    it('should find aggregates in output columns, ordering, and having clauses', () => {
        const query = ast.query({
            select: [
                ast.namedExpression(ast.identifier('type')),
                ast.namedExpression(ast.call('count', [ast.number(1)])),
            ],
            having: ast.call('max', [ast.identifier('value')]),
            orderBy: ast.call('min', [ast.identifier('value')]),
        });

        assert.deepEqual(
            identifyAggregatesInQuery(query),
            ast.query({
                aggregates: [
                    ast.aggregate('count', [ast.number(1)]),
                    ast.aggregate('max', [ast.identifier('value')]),
                    ast.aggregate('min', [ast.identifier('value')]),
                ],
                select: [
                    ast.namedExpression(ast.identifier('type')),
                    ast.namedExpression(ast.aggregate('count', [ast.number(1)])),
                ],
                having: ast.aggregate('max', [ast.identifier('value')]),
                orderBy: ast.aggregate('min', [ast.identifier('value')]),
            })
        );
    });

});