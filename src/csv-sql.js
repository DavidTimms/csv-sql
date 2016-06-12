import fs from 'fs';

import csv from 'csv';

import {preStringify, logStream} from './utils';

import {parseQuery} from './parser';
import {identifyAggregatesInQuery} from './aggregates';
import {performSelect} from './select';
import {performFilter} from './where';
import {GroupingStream} from './group-by';
import {OrderingStream} from './order-by';
import {performOffset} from './offset';
import {performLimit} from './limit';

export function performQuery(queryString) {
    const query = identifyAggregatesInQuery(parseQuery(queryString));
    //console.log(JSON.stringify(query, null, 4));

    const filePath = query.from;

    if (!fs.existsSync(filePath)) {
        throw Error(`file not found: "${filePath}"`);
    }

    const tableFileDescriptor = fs.openSync(filePath, 'r');
    const tableReadStream = fs.createReadStream(
        null,
        {fd: tableFileDescriptor}
    );

    // performLimit will call this function once it has been satisifed,
    // to avoid processing the rest of the file
    function stopReading() {
        fs.closeSync(tableFileDescriptor);
        tableReadStream.destroy();
    }

    let resultStream = tableReadStream
        .pipe(csv.parse({columns: true}))
        .pipe(csv.transform(performFilter(query.where)));

    if (query.aggregates.length > 0 || query.groupBy) {
        resultStream = resultStream
            .pipe(new GroupingStream(query))
            .pipe(csv.transform(performFilter(query.having)));
    }

    if (query.orderBy) {
        resultStream = resultStream.pipe(new OrderingStream(query));
    }

    resultStream = resultStream
        .pipe(csv.transform(performOffset(query)))
        .pipe(csv.transform(performLimit(query, stopReading)))
        .pipe(csv.transform(performSelect(query)));

    return resultStream;
}

export function toCSV(rowStream) {
    return rowStream.pipe(preStringify()).pipe(csv.stringify({header: true}));
}

function startRepl() {
    const repl = require('repl');
    const replHistory = require('repl.history');

    const sqlRepl = repl.start({
        eval: function _eval(queryString, context, filename, callback) {
            const resultStream = performQuery(queryString);

            toCSV(resultStream)
                .pipe(process.stdout);

            resultStream.on('end', () => {
                callback(null, undefined);
            });
        },
        ignoreUndefined: true,
    });

    replHistory(sqlRepl, `${__dirname}/.repl_history`);
}


if (!module.parent) {
    if (process.argv.length > 2) {
        toCSV(performQuery(...process.argv.slice(2)))
            .pipe(process.stdout);
    }
    else {
        // Start a REPL if no arguments have been provided
        startRepl();
    }
}