
import {assert, AssertionError} from 'chai';
import {performQuery, toCSV} from '../csv-sql';
import {patternToRegExp} from '../evaluate-expression';
import {logStream} from '../utils';

function queryResults(queryString, callback) {
    const stream = toCSV(performQuery(queryString));
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

    it('should support COUNT aggregate function with simple GROUP BY', () => {
        const queryString = 'SELECT gender, COUNT(1) FROM "test/test.csv" GROUP BY gender';
        return queryResultsEqual(queryString, [
            'gender,COUNT(1)',
            'M,2',
            'F,1',
        ]);
    });

    it('should support SUM aggregate function with simple GROUP BY', () => {
        const queryString = `
            SELECT continent, SUM(population)
            FROM "test/countries.csv"
            GROUP BY continent
        `
        return queryResultsEqual(queryString, [
            'continent,SUM(population)',
            'Asia,3820952123',
            'North America,449352500',
            'South America,205828000',
            'Africa,454885505',
            'Europe,293100710',
        ]);
    });

    it('should support SUM aggregate function with simple GROUP BY', () => {
        const queryString = `
            SELECT continent, SUM(population)
            FROM "test/countries.csv"
            GROUP BY continent
        `
        return queryResultsEqual(queryString, [
            'continent,SUM(population)',
            'Asia,3820952123',
            'North America,449352500',
            'South America,205828000',
            'Africa,454885505',
            'Europe,293100710',
        ]);
    });

    it('should support GROUP_CONCAT aggregate function with simple GROUP BY', () => {
        const queryString = `
            SELECT gender, GROUP_CONCAT(name)
            FROM "test/test.csv"
            GROUP BY gender
        `
        return queryResultsEqual(queryString, [
            'gender,GROUP_CONCAT(name)',
            'M,David TimmsBob Jones',
            'F,Jenny Bloggs',
        ]);
    });

    it('should support wildcard columns with GROUP BY', () => {
        const queryString = 'SELECT * FROM "test/test.csv" GROUP BY gender';
        return queryResultsEqual(queryString, [
            'name,age,gender',
            'David Timms,23,M',
            'Jenny Bloggs,30,F',
        ]);
    });

    it('should support multiple aggregate function with GROUP BY', () => {
        const queryString = `
            SELECT continent, MAX(population), MIN(population)
            FROM "test/countries.csv"
            GROUP BY continent
        `
        return queryResultsEqual(queryString, [
            'continent,MAX(population),MIN(population)',
            'Asia,1375610000,68124378',
            'North America,323124000,126228500',
            'South America,205828000,205828000',
            'Africa,186988000,85026000',
            'Europe,146544710,65097000',
        ]);
    });

    it('should support multiple GROUP BY clauses', () => {
        const queryString = `
            SELECT continent, population > 100000000, COUNT(1)
            FROM "test/countries.csv"
            GROUP BY continent, population > 100000000
        `
        return queryResultsEqual(queryString, [
            'continent,population > 100000000,COUNT(1)',
            'Asia,1,7',
            'Asia,0,4',
            'North America,1,2',
            'South America,1,1',
            'Africa,1,1',
            'Africa,0,3',
            'Europe,1,1',
            'Europe,0,2',
        ]);
    });

    it('should support basic HAVING clauses', () => {
        const queryString = `
            SELECT continent, COUNT(*)
            FROM "test/countries.csv"
            GROUP BY continent
            HAVING COUNT(1) > 3
        `
        return queryResultsEqual(queryString, [
            'continent,COUNT(*)',
            'Asia,11',
            'Africa,4',
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

    it('should support COUNT(*)', () => {
        const queryString = 'SELECT COUNT(*), COUNT(number) FROM "test/numbers.csv"';
        return queryResultsEqual(queryString, [
            'COUNT(*),COUNT(number)',
            '9,8',
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

    it('should replace percentage and underscore with their regex equivalents', () => {
        regExpEqual(patternToRegExp('%C___ing%'), /^.*C...ing.*$/gi);
    });
});
