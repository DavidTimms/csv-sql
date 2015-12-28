'use strict';

Object.defineProperty(exports, '__esModule', {
    value: true
});
exports.performQuery = performQuery;

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

function _toConsumableArray(arr) { if (Array.isArray(arr)) { for (var i = 0, arr2 = Array(arr.length); i < arr.length; i++) arr2[i] = arr[i]; return arr2; } else { return Array.from(arr); } }

var _fs = require('fs');

var _fs2 = _interopRequireDefault(_fs);

var _csv = require('csv');

var _csv2 = _interopRequireDefault(_csv);

var _parserJs = require('./parser.js');

var _selectJs = require('./select.js');

var _whereJs = require('./where.js');

var _offsetJs = require('./offset.js');

var _limitJs = require('./limit.js');

function performQuery(queryString) {
    var query = (0, _parserJs.parseQuery)(queryString);
    //console.log(JSON.stringify(query, null, 4));

    if (!_fs2['default'].existsSync(query.primaryTable)) {
        throw Error('file not found: "' + query.primaryTable + '"');
    }

    var primaryTableFileDescriptor = _fs2['default'].openSync(query.primaryTable, 'r');
    var primaryTableReadStream = _fs2['default'].createReadStream(null, { fd: primaryTableFileDescriptor });

    function stopReading() {
        _fs2['default'].closeSync(primaryTableFileDescriptor);
        primaryTableReadStream.destroy();
    }

    return primaryTableReadStream.pipe(_csv2['default'].parse({ columns: true })).pipe(_csv2['default'].transform((0, _whereJs.performWhere)(query))).pipe(_csv2['default'].transform((0, _selectJs.performSelect)(query))).pipe(_csv2['default'].transform((0, _offsetJs.performOffset)(query))).pipe(_csv2['default'].transform((0, _limitJs.performLimit)(query, stopReading))).pipe(_csv2['default'].stringify({ header: true }));
}

if (!module.parent) {
    performQuery.apply(undefined, _toConsumableArray(process.argv.slice(2))).pipe(process.stdout);
}