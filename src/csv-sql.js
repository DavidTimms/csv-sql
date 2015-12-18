import fs from 'fs';

import csv from 'csv';

import {parseQuery} from './parser.js';
import {performSelect} from './select.js';
import {performLimit} from './limit.js';

const query = parseQuery(process.argv[2]);
//console.log(JSON.stringify(query, null, 4));

const primaryTableFileDescriptor = fs.openSync(query.primaryTable, 'r');
const primaryTableReadStream = fs.createReadStream(
	null,
	{fd: primaryTableFileDescriptor}
);

function stopReading() {
	fs.closeSync(primaryTableFileDescriptor);
	primaryTableReadStream.destroy();
}

primaryTableReadStream
	.pipe(csv.parse({columns: true}))
	.pipe(csv.transform(performSelect(query)))
	.pipe(csv.transform(performLimit(query, stopReading)))
	.pipe(csv.stringify({header: true}))
	.pipe(process.stdout);
