'use strict';

var _chai = require('chai');

var _csvSql = require('../csv-sql');

function queryResults(queryString, callback) {
    var stream = (0, _csvSql.performQuery)(queryString);
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
});