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

var _parser = require('./parser');

var _select = require('./select');

var _where = require('./where');

var _orderBy = require('./order-by');

var _offset = require('./offset');

var _limit = require('./limit');

function performQuery(queryString) {
    var query = (0, _parser.parseQuery)(queryString);
    //console.log(JSON.stringify(query, null, 4));

    if (!_fs2['default'].existsSync(query.primaryTable)) {
        throw Error('file not found: "' + query.primaryTable + '"');
    }

    var primaryTableFileDescriptor = _fs2['default'].openSync(query.primaryTable, 'r');
    var primaryTableReadStream = _fs2['default'].createReadStream(null, { fd: primaryTableFileDescriptor });

    // performLimit will call this function once it has been satisifed,
    // to avoid processing the rest of the file
    function stopReading() {
        _fs2['default'].closeSync(primaryTableFileDescriptor);
        primaryTableReadStream.destroy();
    }

    var csvStream = primaryTableReadStream.pipe(_csv2['default'].parse({ columns: true })).pipe(_csv2['default'].transform((0, _where.performWhere)(query)));

    if (query.orderBy) {
        csvStream = csvStream.pipe(new _orderBy.OrderingStream(query));
    }

    csvStream = csvStream.pipe(_csv2['default'].transform((0, _offset.performOffset)(query))).pipe(_csv2['default'].transform((0, _limit.performLimit)(query, stopReading))).pipe(_csv2['default'].transform((0, _select.performSelect)(query))).pipe(_csv2['default'].stringify({ header: true }));

    return csvStream;
}

if (!module.parent) {
    performQuery.apply(undefined, _toConsumableArray(process.argv.slice(2))).pipe(process.stdout);
}