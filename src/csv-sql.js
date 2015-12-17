import fs from 'fs';

import csv from 'csv';

import {parseQuery} from './parser.js';
import {performSelect} from './select.js';
import {performLimit} from './limit.js';

const query = parseQuery(process.argv[2]);
//console.log(query);

const readStream = fs.createReadStream(query.primaryTable);

readStream
	.pipe(csv.parse({columns: true}))
	.pipe(csv.transform(performSelect(query)))
	.pipe(csv.transform(performLimit(query)))
	.pipe(csv.stringify({header: true}))
	.pipe(process.stdout);
