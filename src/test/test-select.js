
import {assert} from 'chai';
import {performQuery, toCSV} from '../csv-sql';

function queryResults(queryString, callback) {
    const stream = performQuery(queryString).pipe(toCSV());
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

    it('should support alphabetical ORDER BY', () => {
        const queryString = 'SELECT name FROM "test/test.csv" ORDER BY name';
        return queryResultsEqual(queryString, [
            'name',
            'Bob Jones',
            'David Timms',
            'Jenny Bloggs',
        ]);
    });

    it('should support numerical ORDER BY', () => {
        const queryString = 'SELECT number FROM "test/numbers.csv" ORDER BY number';
        return queryResultsEqual(queryString, [
            'number',
            '',
            '1',
            '2.25',
            '2.5',
            '5',
            '10',
            '10',
            '55',
            '100',
        ]);
    });

    it('should support ORDER BY with a direction', () => {

        const ascQueryString = 'SELECT name FROM "test/test.csv" ORDER BY name ASC';
        return queryResultsEqual(ascQueryString, [
            'name',
            'Bob Jones',
            'David Timms',
            'Jenny Bloggs',
        ]);

        const descQueryString = 'SELECT name FROM "test/test.csv" ORDER BY name DESC';
        return queryResultsEqual(descQueryString, [
            'name',
            'Jenny Bloggs',
            'David Timms',
            'Bob Jones',
        ]);
    });

    it('should support ORDER BY multiple columns', () => {
        const queryString = 'SELECT name FROM "test/test.csv" ORDER BY gender, age DESC';
        return queryResultsEqual(queryString, [
            'name',
            'Jenny Bloggs',
            'Bob Jones',
            'David Timms',
        ]);
    });
});
