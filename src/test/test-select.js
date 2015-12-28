
import {assert} from 'chai';
import {performQuery} from '../csv-sql';

function queryResults(queryString, callback) {
    const stream = performQuery(queryString);
    const results = [];

    stream.on('data', data => {
        results.push(data.toString().trim());
    });

    stream.on('end', () => {
        callback(results);
    });
}

function queryResultsEqual(queryString, expected) {
    return new Promise((resolve, reject) => {
        queryResults(queryString, results => {
            resolve(assert.deepEqual(results, expected));
        });
    });
}


describe('performQuery', () => {

    it('should support LIMIT', () => {
        const queryString = 'SELECT * FROM "test/test.csv" LIMIT 2';
        return queryResultsEqual(queryString, [
            'name,age,gender',
            'David Timms,23,M',
            'Bob Jones,29,M',
        ]);
    });

    it('should support OFFSET', () => {
        const queryString = 'SELECT * FROM "test/test.csv" OFFSET 1';
        return queryResultsEqual(queryString, [
            'name,age,gender',
            'Bob Jones,29,M',
            'Jenny Bloggs,30,F',
        ]);
    });

    it('should support basic WHERE', () => {
        const queryString = 'SELECT * FROM "test/test.csv" WHERE age > 25';
        return queryResultsEqual(queryString, [
            'name,age,gender',
            'Bob Jones,29,M',
            'Jenny Bloggs,30,F',
        ]);
    });

    it('should support WHERE using columns not in the output', () => {
        const queryString = 'SELECT age FROM "test/test.csv" WHERE gender = "M"';
        return queryResultsEqual(queryString, [
            'age',
            '23',
            '29',
        ]);
    });

    it('should support WHERE with multiple conditions', () => {
        const queryString = 'SELECT name FROM "test/test.csv" WHERE (LOWERCASE(gender) = "m") AND age < 27';
        return queryResultsEqual(queryString, [
            'name',
            'David Timms',
        ]);
    });
});
