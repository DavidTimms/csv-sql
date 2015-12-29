import fs from 'fs';

import csv from 'csv';

import {parseQuery} from './parser';
import {performSelect} from './select';
import {performWhere} from './where';
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

    function stopReading() {
        fs.closeSync(primaryTableFileDescriptor);
        primaryTableReadStream.destroy();
    }

    return primaryTableReadStream
        .pipe(csv.parse({columns: true}))
        .pipe(csv.transform(performWhere(query)))
        .pipe(csv.transform(performSelect(query)))
        .pipe(csv.transform(performOffset(query)))
        .pipe(csv.transform(performLimit(query, stopReading)))
        .pipe(csv.stringify({header: true}));
}


if (!module.parent) {
    performQuery(...process.argv.slice(2)).pipe(process.stdout);
}