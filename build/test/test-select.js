'use strict';

var _chai = require('chai');

var _csvSql = require('../csv-sql');

var _evaluateExpression = require('../evaluate-expression');

function queryResults(queryString, callback) {
    var stream = (0, _csvSql.performQuery)(queryString).pipe((0, _csvSql.toCSV)());
    var results = [];

    stream.on('data', function (data) {
        results.push(data.toString().trim());
    });

    stream.on('end', function () {
        callback(results);
    });
}

function queryResultsEqual(queryString, expected) {
    return new Promise(function (resolve, reject) {
        queryResults(queryString, function (results) {
            resolve(_chai.assert.deepEqual(results, expected));
        });
    });
}

function regExpEqual(re1, re2) {
    if (re1.source !== re2.source) {
        throw new _chai.AssertionError('expected ' + re1 + ' to equal ' + re2);
    }
}

describe('performQuery', function () {

    it('should support LIMIT', function () {
        var queryString = 'SELECT * FROM "test/test.csv" LIMIT 2';
        return queryResultsEqual(queryString, ['name,age,gender', 'David Timms,23,M', 'Bob Jones,29,M']);
    });

    it('should support OFFSET', function () {
        var queryString = 'SELECT * FROM "test/test.csv" OFFSET 1';
        return queryResultsEqual(queryString, ['name,age,gender', 'Bob Jones,29,M', 'Jenny Bloggs,30,F']);
    });

    it('should support basic WHERE', function () {
        var queryString = 'SELECT * FROM "test/test.csv" WHERE age > 25';
        return queryResultsEqual(queryString, ['name,age,gender', 'Bob Jones,29,M', 'Jenny Bloggs,30,F']);
    });

    it('should support WHERE using columns not in the output', function () {
        var queryString = 'SELECT age FROM "test/test.csv" WHERE gender = "M"';
        return queryResultsEqual(queryString, ['age', '23', '29']);
    });

    it('should support WHERE with multiple conditions', function () {
        var queryString = 'SELECT name FROM "test/test.csv" WHERE (LOWERCASE(gender) = "m") AND age < 27';
        return queryResultsEqual(queryString, ['name', 'David Timms']);
    });

    it('should support alphabetical ORDER BY', function () {
        var queryString = 'SELECT name FROM "test/test.csv" ORDER BY name';
        return queryResultsEqual(queryString, ['name', 'Bob Jones', 'David Timms', 'Jenny Bloggs']);
    });

    it('should support GROUP BY with no aggregate functions', function () {
        var queryString = 'SELECT gender FROM "test/test.csv" GROUP BY gender';
        return queryResultsEqual(queryString, ['gender', 'M', 'F']);
    });

    it('should support numerical ORDER BY', function () {
        var queryString = 'SELECT number FROM "test/numbers.csv" ORDER BY number';
        return queryResultsEqual(queryString, ['number', '', '1', '2.25', '2.5', '5', '10', '10', '55', '100']);
    });

    it('should support ORDER BY with a direction', function () {

        var ascQueryString = 'SELECT name FROM "test/test.csv" ORDER BY name ASC';
        return queryResultsEqual(ascQueryString, ['name', 'Bob Jones', 'David Timms', 'Jenny Bloggs']);

        var descQueryString = 'SELECT name FROM "test/test.csv" ORDER BY name DESC';
        return queryResultsEqual(descQueryString, ['name', 'Jenny Bloggs', 'David Timms', 'Bob Jones']);
    });

    it('should support ORDER BY multiple columns', function () {
        var queryString = 'SELECT name FROM "test/test.csv" ORDER BY gender, age DESC';
        return queryResultsEqual(queryString, ['name', 'Jenny Bloggs', 'Bob Jones', 'David Timms']);
    });

    it('should support the LIKE operator', function () {
        var prefixQuery = 'SELECT name FROM "test/test.csv" WHERE name LIKE "b%"';
        return queryResultsEqual(prefixQuery, ['name', 'Bob Jones']);

        var suffixQuery = 'SELECT name FROM "test/test.csv" WHERE name LIKE "%ms"';
        return queryResultsEqual(suffixQuery, ['name', 'David Timms']);

        var containsQuery = 'SELECT name FROM "test/test.csv" WHERE name LIKE "%O%"';
        return queryResultsEqual(suffixQuery, ['name', 'Jenny Bloggs', 'Bob Jones']);

        var fixedLengthQuery = 'SELECT name FROM "test/test.csv" WHERE name LIKE "J_n_y B____s"';
        return queryResultsEqual(suffixQuery, ['name', 'Jenny Bloggs']);
    });
});

describe('patternToRegExp', function () {
    it('should leave alphanumeric characters unchanged', function () {
        regExpEqual((0, _evaluateExpression.patternToRegExp)('This is a test 123'), /^This is a test 123$/gi);
    });

    it('should escape regex special characters', function () {
        regExpEqual((0, _evaluateExpression.patternToRegExp)('^(3*4) + [$!]?'), /^\^\(3\*4\) \+ \[\$\!\]\?$/gi);
    });

    it('should replace percentage and undscore with their regex equivalents', function () {
        regExpEqual((0, _evaluateExpression.patternToRegExp)('%C___ing%'), /^.*C...ing.*$/gi);
    });
});