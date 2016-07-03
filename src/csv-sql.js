import fs from 'fs';

import csv from 'csv';
import commander from 'commander';

import project from '../package.json';

import {preStringify, logStream} from './utils';

import {parseQuery} from './parser';
import {identifyAggregatesInQuery} from './aggregates';
import {performSelect} from './select';
import {performFilter} from './where';
import {GroupingStream} from './group-by';
import {OrderingStream} from './order-by';
import {performOffset} from './offset';
import {performLimit} from './limit';

export function performQuery(queryString, options) {
    const query = identifyAggregatesInQuery(parseQuery(queryString));
    //console.log(JSON.stringify(query, null, 4));

    const filePath = query.from;

    if (!fs.existsSync(filePath)) {
        throw Error(`file not found: "${filePath}"`);
    }

    const tableReadStream = createEndableReadStream(filePath);

    let resultStream = tableReadStream
        .pipe(csv.parse({
            columns: true,
            delimiter: options.inSeparator,
        }))
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
        .pipe(csv.transform(performLimit(query, {onLimitReached: tableReadStream.end})))
        .pipe(csv.transform(performSelect(query)));

    return resultStream;
}

function createEndableReadStream(filePath) {
    const fileDescriptor = fs.openSync(filePath, 'r');
    const readStream = fs.createReadStream(null, {fd: fileDescriptor});
    let isStreamActive = true;

    readStream.on('end', () => {
        isStreamActive = false;
    });

    // performLimit will call this function once it has been satisifed,
    // to avoid processing the rest of the file
    readStream.end = () => {
        if (isStreamActive) {
            fs.closeSync(fileDescriptor);
            readStream.destroy();
        }
    }

    return readStream;
}

export function toCSV(rowStream, options) {
    return rowStream.pipe(preStringify()).pipe(csv.stringify({
        header: true,
        delimiter: options.outSeparator,
    }));
}

function startRepl(options) {
    const repl = require('repl');
    const replHistory = require('repl.history');

    const sqlRepl = repl.start({
        eval: function _eval(queryString, context, filename, callback) {
            if (queryString.toLowerCase().trim() === 'exit') {
                process.exit();
            }

            const resultStream = performQuery(queryString, options);

            toCSV(resultStream, options)
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

    commander
        .version(project.version)
        .description(project.description)
        .arguments('<query>')
        .option(
            '-s, --separator [string]', 
            'The CSV column separator for input and output'
        )
        .option(
            '--in-separator [string]', 
            'The CSV column separator for reading input'
        )
        .option(
            '--out-separator [string]', 
            'The CSV column separator for generating output'
        )
        .parse(process.argv);

    const options = commander;
    const query = options.args[0];

    options.inSeparator = options.inSeparator || options.separator;
    options.outSeparator = options.outSeparator || options.separator;

    if (query) {
        toCSV(performQuery(query, options), options)
            .pipe(process.stdout);
    }
    else {
        // Start a REPL if no arguments have been provided
        startRepl(options);
    }
}
