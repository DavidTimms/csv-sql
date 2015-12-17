'use strict';

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

var _fs = require('fs');

var _fs2 = _interopRequireDefault(_fs);

var _csv = require('csv');

var _csv2 = _interopRequireDefault(_csv);

var _parserJs = require('./parser.js');

var _selectJs = require('./select.js');

var query = (0, _parserJs.parseQuery)(process.argv[2]);

_fs2['default'].createReadStream(query.primaryTable).pipe(_csv2['default'].parse({ columns: true })).pipe(_csv2['default'].transform(function (row, callback) {
	callback(null, (0, _selectJs.performSelect)(query, row));
})).pipe(_csv2['default'].stringify({ header: true })).pipe(process.stdout);