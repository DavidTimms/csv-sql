import fs from 'fs';

import csv from 'csv';

import {parseQuery} from './parser.js';
import {performSelect} from './select.js';

const query = parseQuery(process.argv[2]);

fs.createReadStream(query.primaryTable)
	.pipe(csv.parse({columns: true}))
	.pipe(csv.transform((row, callback) => {
		callback(null, performSelect(query, row));
	}))
	.pipe(csv.stringify({header: true}))
	.pipe(process.stdout);
