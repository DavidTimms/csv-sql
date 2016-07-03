'use strict';

var _chai = require('chai');

var _aggregates = require('../aggregates');

var _ast = require('../ast');

var ast = _interopRequireWildcard(_ast);

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj.default = obj; return newObj; } }

describe('identifyAggregatesInExpression', function () {

    it('should find no aggregates for basic expressions', function () {
        var basicExps = [ast.identifier('foo'), ast.number(2), ast.literal(true), ast.string('foo')];

        basicExps.forEach(function (exp) {
            _chai.assert.deepEqual((0, _aggregates.identifyAggregatesInExpression)(exp), { aggregates: [], expression: exp });
        });
    });

    it('should find aggregates for function calls', function () {
        var exp = ast.call('COUNT', [ast.number(1)]);
        var aggregateExp = ast.aggregate('COUNT', [ast.number(1)]);

        _chai.assert.deepEqual((0, _aggregates.identifyAggregatesInExpression)(exp), { aggregates: [aggregateExp], expression: aggregateExp });
    });

    it('should find single aggregates in the leaves of binary expressions', function () {
        var exp = ast.binaryExpression('+', ast.number(1), ast.call('count', [ast.identifier('id')]));
        var aggregateExp = ast.aggregate('count', [ast.identifier('id')]);

        _chai.assert.deepEqual((0, _aggregates.identifyAggregatesInExpression)(exp), {
            aggregates: [aggregateExp],
            expression: ast.binaryExpression('+', ast.number(1), aggregateExp)
        });
    });

    it('should find multiple aggregates in the leaves of binary expressions', function () {
        var exp = ast.binaryExpression('-', ast.call('max', [ast.identifier('age')]), ast.call('min', [ast.identifier('age')]));

        _chai.assert.deepEqual((0, _aggregates.identifyAggregatesInExpression)(exp), {
            aggregates: [ast.aggregate('max', [ast.identifier('age')]), ast.aggregate('min', [ast.identifier('age')])],
            expression: ast.binaryExpression('-', ast.aggregate('max', [ast.identifier('age')]), ast.aggregate('min', [ast.identifier('age')]))
        });
    });

    it('should find multiple aggregates in the arguments of function calls', function () {
        var exp = ast.call('CONCAT', [ast.call('CONCAT', [ast.call('max', [ast.identifier('name')]), ast.call('min', [ast.identifier('name')])]), ast.call('count', [ast.number(1)]), ast.call('count', [ast.identifier('male')])]);

        _chai.assert.deepEqual((0, _aggregates.identifyAggregatesInExpression)(exp), {
            aggregates: [ast.aggregate('max', [ast.identifier('name')]), ast.aggregate('min', [ast.identifier('name')]), ast.aggregate('count', [ast.number(1)]), ast.aggregate('count', [ast.identifier('male')])],
            expression: ast.call('CONCAT', [ast.call('CONCAT', [ast.aggregate('max', [ast.identifier('name')]), ast.aggregate('min', [ast.identifier('name')])]), ast.aggregate('count', [ast.number(1)]), ast.aggregate('count', [ast.identifier('male')])])
        });
    });

    it('should eliminate duplicate aggregate expressions', function () {
        var exp = ast.binaryExpression('*', ast.call('count', [ast.identifier('id')]), ast.call('count', [ast.identifier('id')]));

        _chai.assert.deepEqual((0, _aggregates.identifyAggregatesInExpression)(exp), {
            aggregates: [ast.aggregate('count', [ast.identifier('id')])],
            expression: ast.binaryExpression('*', ast.aggregate('count', [ast.identifier('id')]), ast.aggregate('count', [ast.identifier('id')]))
        });
    });
});

describe('identifyAggregatesInQuery', function () {

    it('should find aggregates in output columns, ordering, and having clauses', function () {
        var query = ast.query({
            select: [ast.namedExpression(ast.identifier('type')), ast.namedExpression(ast.call('count', [ast.number(1)]))],
            having: ast.call('max', [ast.identifier('value')]),
            orderBy: ast.call('min', [ast.identifier('value')])
        });

        _chai.assert.deepEqual((0, _aggregates.identifyAggregatesInQuery)(query), ast.query({
            aggregates: [ast.aggregate('count', [ast.number(1)]), ast.aggregate('max', [ast.identifier('value')]), ast.aggregate('min', [ast.identifier('value')])],
            select: [ast.namedExpression(ast.identifier('type')), ast.namedExpression(ast.aggregate('count', [ast.number(1)]))],
            having: ast.aggregate('max', [ast.identifier('value')]),
            orderBy: ast.aggregate('min', [ast.identifier('value')])
        }));
    });
});