'use strict';

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

var _fs = require('fs');

var _fs2 = _interopRequireDefault(_fs);

var _csv = require('csv');

var _csv2 = _interopRequireDefault(_csv);

var _parserJs = require('./parser.js');

var _selectJs = require('./select.js');

var _limitJs = require('./limit.js');

var query = (0, _parserJs.parseQuery)(process.argv[2]);
//console.log(JSON.stringify(query, null, 4));

var primaryTableFileDescriptor = _fs2['default'].openSync(query.primaryTable, 'r');
var primaryTableReadStream = _fs2['default'].createReadStream(null, { fd: primaryTableFileDescriptor });

function stopReading() {
	_fs2['default'].closeSync(primaryTableFileDescriptor);
	primaryTableReadStream.destroy();
}

primaryTableReadStream.pipe(_csv2['default'].parse({ columns: true })).pipe(_csv2['default'].transform((0, _selectJs.performSelect)(query))).pipe(_csv2['default'].transform((0, _limitJs.performLimit)(query, stopReading))).pipe(_csv2['default'].stringify({ header: true })).pipe(process.stdout);