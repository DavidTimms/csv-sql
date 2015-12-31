import fs from 'fs';

import csv from 'csv';

import {parseQuery} from './parser';
import {performSelect} from './select';
import {performWhere} from './where';
import {OrderingStream} from './order-by';
import {performOffset} from './offset';
import {performLimit} from './limit';

export function performQuery(queryString) {
    const query = parseQuery(queryString);
    //console.log(JSON.stringify(query, null, 4));

    if (!fs.existsSync(query.primaryTable)) {
        throw Error(`file not found: "${query.primaryTable}"`);
    }

    const primaryTableFileDescriptor = fs.openSync(query.primaryTable, 'r');
    const primaryTableReadStream = fs.createReadStream(
        null,
        {fd: primaryTableFileDescriptor}
    );

    // performLimit will call this function once it has been satisifed,
    // to avoid processing the rest of the file
    function stopReading() {
        fs.closeSync(primaryTableFileDescriptor);
        primaryTableReadStream.destroy();
    }

    let resultStream = primaryTableReadStream
        .pipe(csv.parse({columns: true}))
        .pipe(csv.transform(performWhere(query)))

    if (query.orderBy) {
        resultStream = resultStream.pipe(new OrderingStream(query))
    }

    resultStream = resultStream
        .pipe(csv.transform(performOffset(query)))
        .pipe(csv.transform(performLimit(query, stopReading)))
        .pipe(csv.transform(performSelect(query)))

    return resultStream;
}

export function toCSV() {
    return csv.stringify({header: true});
}

function startRepl() {
    const repl = require('repl');

    repl.start({
        eval: function _eval(queryString, context, filename, callback) {
            const resultStream = performQuery(queryString);

            resultStream
                .pipe(toCSV())
                .pipe(process.stdout);

            resultStream.on('end', () => {
                callback(null, undefined);
            });
        },
        ignoreUndefined: true,
    });
}


if (!module.parent) {
    if (process.argv.length > 2) {
        performQuery(...process.argv.slice(2))
            .pipe(toCSV())
            .pipe(process.stdout);
    }
    else {
        // Start a REPL if no arguments have been provided
        startRepl();
    }
}