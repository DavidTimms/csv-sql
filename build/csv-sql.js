'use strict';

Object.defineProperty(exports, '__esModule', {
    value: true
});
exports.performQuery = performQuery;
exports.toCSV = toCSV;

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

    var resultStream = primaryTableReadStream.pipe(_csv2['default'].parse({ columns: true })).pipe(_csv2['default'].transform((0, _where.performWhere)(query)));

    if (query.orderBy) {
        resultStream = resultStream.pipe(new _orderBy.OrderingStream(query));
    }

    resultStream = resultStream.pipe(_csv2['default'].transform((0, _offset.performOffset)(query))).pipe(_csv2['default'].transform((0, _limit.performLimit)(query, stopReading))).pipe(_csv2['default'].transform((0, _select.performSelect)(query)));

    return resultStream;
}

function toCSV() {
    return _csv2['default'].stringify({ header: true });
}

function startRepl() {
    var repl = require('repl');

    repl.start({
        eval: function _eval(queryString, context, filename, callback) {
            var resultStream = performQuery(queryString);

            resultStream.pipe(toCSV()).pipe(process.stdout);

            resultStream.on('end', function () {
                callback(null, undefined);
            });
        },
        ignoreUndefined: true });
}

if (!module.parent) {
    if (process.argv.length > 2) {
        performQuery.apply(undefined, _toConsumableArray(process.argv.slice(2))).pipe(toCSV()).pipe(process.stdout);
    } else {
        // Start a REPL if no arguments have been provided
        startRepl();
    }
}