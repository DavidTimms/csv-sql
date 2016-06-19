'use strict';

var _chai = require('chai');

var _csvSql = require('../csv-sql');

var _evaluateExpression = require('../evaluate-expression');

var _utils = require('../utils');

function queryResults(queryString, options, callback) {
    // The `options` argument can be omitted, if only the default
    // options are required
    if (typeof options === 'function') {
        callback = options;
        options = {};
    }
    var stream = (0, _csvSql.toCSV)((0, _csvSql.performQuery)(queryString, options), options);
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

    it('should support COUNT aggregate function without GROUP BY', function () {
        var queryString = 'SELECT COUNT(name) FROM "test/test.csv"';
        return queryResultsEqual(queryString, ['COUNT(name)', '3']);
    });

    it('should support COUNT aggregate function with simple GROUP BY', function () {
        var queryString = 'SELECT gender, COUNT(1) FROM "test/test.csv" GROUP BY gender';
        return queryResultsEqual(queryString, ['gender,COUNT(1)', 'M,2', 'F,1']);
    });

    it('should support SUM aggregate function with simple GROUP BY', function () {
        var queryString = '\n            SELECT continent, SUM(population)\n            FROM "test/countries.csv"\n            GROUP BY continent\n        ';
        return queryResultsEqual(queryString, ['continent,SUM(population)', 'Asia,3820952123', 'North America,449352500', 'South America,205828000', 'Africa,454885505', 'Europe,293100710']);
    });

    it('should support SUM aggregate function with simple GROUP BY', function () {
        var queryString = '\n            SELECT continent, SUM(population)\n            FROM "test/countries.csv"\n            GROUP BY continent\n        ';
        return queryResultsEqual(queryString, ['continent,SUM(population)', 'Asia,3820952123', 'North America,449352500', 'South America,205828000', 'Africa,454885505', 'Europe,293100710']);
    });

    it('should support GROUP_CONCAT aggregate function with simple GROUP BY', function () {
        var queryString = '\n            SELECT gender, GROUP_CONCAT(name)\n            FROM "test/test.csv"\n            GROUP BY gender\n        ';
        return queryResultsEqual(queryString, ['gender,GROUP_CONCAT(name)', 'M,David TimmsBob Jones', 'F,Jenny Bloggs']);
    });

    it('should support wildcard columns with GROUP BY', function () {
        var queryString = 'SELECT * FROM "test/test.csv" GROUP BY gender';
        return queryResultsEqual(queryString, ['name,age,gender', 'David Timms,23,M', 'Jenny Bloggs,30,F']);
    });

    it('should support multiple aggregate function with GROUP BY', function () {
        var queryString = '\n            SELECT continent, MAX(population), MIN(population)\n            FROM "test/countries.csv"\n            GROUP BY continent\n        ';
        return queryResultsEqual(queryString, ['continent,MAX(population),MIN(population)', 'Asia,1375610000,68124378', 'North America,323124000,126228500', 'South America,205828000,205828000', 'Africa,186988000,85026000', 'Europe,146544710,65097000']);
    });

    it('should support multiple GROUP BY clauses', function () {
        var queryString = '\n            SELECT continent, population > 100000000, COUNT(1)\n            FROM "test/countries.csv"\n            GROUP BY continent, population > 100000000\n        ';
        return queryResultsEqual(queryString, ['continent,population > 100000000,COUNT(1)', 'Asia,1,7', 'Asia,0,4', 'North America,1,2', 'South America,1,1', 'Africa,1,1', 'Africa,0,3', 'Europe,1,1', 'Europe,0,2']);
    });

    it('should support basic HAVING clauses', function () {
        var queryString = '\n            SELECT continent, COUNT(*)\n            FROM "test/countries.csv"\n            GROUP BY continent\n            HAVING COUNT(1) > 3\n        ';
        return queryResultsEqual(queryString, ['continent,COUNT(*)', 'Asia,11', 'Africa,4']);
    });

    it('should support numerical ORDER BY', function () {
        var queryString = 'SELECT number FROM "test/numbers.csv" ORDER BY number';
        return queryResultsEqual(queryString, ['number', '', '1', '2.25', '2.5', '5', '10', '10', '55', '100']);
    });

    it('should support COUNT(*)', function () {
        var queryString = 'SELECT COUNT(*), COUNT(number) FROM "test/numbers.csv"';
        return queryResultsEqual(queryString, ['COUNT(*),COUNT(number)', '9,8']);
    });

    it('should support ORDER BY with a direction (ASC)', function () {

        var ascQueryString = 'SELECT name FROM "test/test.csv" ORDER BY name ASC';
        return queryResultsEqual(ascQueryString, ['name', 'Bob Jones', 'David Timms', 'Jenny Bloggs']);
    });

    it('should support ORDER BY with a direction (DESC)', function () {

        var descQueryString = 'SELECT name FROM "test/test.csv" ORDER BY name DESC';
        return queryResultsEqual(descQueryString, ['name', 'Jenny Bloggs', 'David Timms', 'Bob Jones']);
    });

    it('should support ORDER BY multiple columns', function () {
        var queryString = 'SELECT name FROM "test/test.csv" ORDER BY gender, age DESC';
        return queryResultsEqual(queryString, ['name', 'Jenny Bloggs', 'Bob Jones', 'David Timms']);
    });

    it('should support the LIKE operator for prefixes', function () {
        var prefixQuery = 'SELECT name FROM "test/test.csv" WHERE name LIKE "b%"';
        return queryResultsEqual(prefixQuery, ['name', 'Bob Jones']);
    });

    it('should support the LIKE operator for suffixes', function () {
        var suffixQuery = 'SELECT name FROM "test/test.csv" WHERE name LIKE "%ms"';
        return queryResultsEqual(suffixQuery, ['name', 'David Timms']);
    });

    it('should support the LIKE operator for substrings', function () {
        var containsQuery = 'SELECT name FROM "test/test.csv" WHERE name LIKE "%O%"';
        return queryResultsEqual(containsQuery, ['name', 'Bob Jones', 'Jenny Bloggs']);
    });

    it('should support the LIKE operator with wildcard underscore patterns', function () {
        var fixedLengthQuery = 'SELECT name FROM "test/test.csv" WHERE name LIKE "J_n_y B____s"';
        return queryResultsEqual(fixedLengthQuery, ['name', 'Jenny Bloggs']);
    });

    it('should support if-style CASE expressions, with an ELSE', function () {
        var caseQuery = '\n            SELECT\n                CASE WHEN age < 25 THEN "young" ELSE "old" END AS age_group\n            FROM "test/test.csv"\n        ';
        return queryResultsEqual(caseQuery, ['age_group', 'young', 'old', 'old']);
    });

    it('should support if-style CASE expressions with many cases', function () {
        var caseQuery = '\n            SELECT\n                CASE \n                    WHEN name = "David Timms" THEN "Dave"\n                    WHEN name = "Bob Jones" THEN "Bob"\n                    WHEN name = "Jenny Bloggs" THEN "Jen"\n                END AS nickname\n            FROM "test/test.csv"\n        ';
        return queryResultsEqual(caseQuery, ['nickname', 'Dave', 'Bob', 'Jen']);
    });

    it('should support switch-style CASE expressions, with an ELSE', function () {
        var caseQuery = '\n            SELECT\n                CASE gender WHEN "M" THEN "Male" ELSE "Female" END AS gender\n            FROM "test/test.csv"\n        ';
        return queryResultsEqual(caseQuery, ['gender', 'Male', 'Male', 'Female']);
    });

    it('should default to NULL for CASE expressions without an ELSE', function () {
        var caseQuery = '\n            SELECT\n                CASE name WHEN "Jenny Bloggs" THEN "Hello Jenny" END AS greeting\n            FROM "test/test.csv"\n        ';
        return queryResultsEqual(caseQuery, ['greeting', '', '', 'Hello Jenny']);
    });
});

describe('patternToRegExp', function () {
    it('should leave alphanumeric characters unchanged', function () {
        regExpEqual((0, _evaluateExpression.patternToRegExp)('This is a test 123'), /^This is a test 123$/gi);
    });

    it('should escape regex special characters', function () {
        regExpEqual((0, _evaluateExpression.patternToRegExp)('^(3*4) + [$!]?'), /^\^\(3\*4\) \+ \[\$\!\]\?$/gi);
    });

    it('should replace percentage and underscore with their regex equivalents', function () {
        regExpEqual((0, _evaluateExpression.patternToRegExp)('%C___ing%'), /^.*C...ing.*$/gi);
    });
});