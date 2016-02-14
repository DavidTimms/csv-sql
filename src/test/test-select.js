
import {assert, AssertionError} from 'chai';
import {performQuery, toCSV} from '../csv-sql';
import {patternToRegExp} from '../evaluate-expression';

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

function regExpEqual(re1, re2) {
    if (re1.source !== re2.source) {
        throw new AssertionError(`expected ${re1} to equal ${re2}`);
    }
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

    it('should support GROUP BY with no aggregate functions', () => {
        const queryString = 'SELECT gender FROM "test/test.csv" GROUP BY gender';
        return queryResultsEqual(queryString, [
            'gender',
            'M',
            'F',
        ]);
    });

    it('should support COUNT aggregate function without GROUP BY', () => {
        const queryString = 'SELECT COUNT(name) FROM "test/test.csv"';
        return queryResultsEqual(queryString, [
            'COUNT(name)',
            '3',
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

    it('should support ORDER BY with a direction (ASC)', () => {

        const ascQueryString = 'SELECT name FROM "test/test.csv" ORDER BY name ASC';
        return queryResultsEqual(ascQueryString, [
            'name',
            'Bob Jones',
            'David Timms',
            'Jenny Bloggs',
        ]);
    });

    it('should support ORDER BY with a direction (DESC)', () => {

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

    it('should support the LIKE operator for prefixes', () => {
        const prefixQuery = 'SELECT name FROM "test/test.csv" WHERE name LIKE "b%"';
        return queryResultsEqual(prefixQuery, [
            'name',
            'Bob Jones',
        ]);
    });

    it('should support the LIKE operator for suffixes', () => {
        const suffixQuery = 'SELECT name FROM "test/test.csv" WHERE name LIKE "%ms"';
        return queryResultsEqual(suffixQuery, [
            'name',
            'David Timms',
        ]);
    });

    it('should support the LIKE operator for substrings', () => {
        const containsQuery = 'SELECT name FROM "test/test.csv" WHERE name LIKE "%O%"';
        return queryResultsEqual(containsQuery, [
            'name',
            'Bob Jones',
            'Jenny Bloggs',
        ]);
    });

    it('should support the LIKE operator with wildcard underscore patterns', () => {
        const fixedLengthQuery = 
            'SELECT name FROM "test/test.csv" WHERE name LIKE "J_n_y B____s"';
        return queryResultsEqual(fixedLengthQuery, [
            'name',
            'Jenny Bloggs',
        ]);
    });
});

describe('patternToRegExp', () => {
    it('should leave alphanumeric characters unchanged', () => {
        regExpEqual(patternToRegExp('This is a test 123'), /^This is a test 123$/gi);
    });

    it('should escape regex special characters', () => {
        regExpEqual(patternToRegExp('^(3*4) + [$!]?'), /^\^\(3\*4\) \+ \[\$\!\]\?$/gi);
    });

    it('should replace percentage and undscore with their regex equivalents', () => {
        regExpEqual(patternToRegExp('%C___ing%'), /^.*C...ing.*$/gi);
    });
});
