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

var _aggregates = require('./aggregates');

var _select = require('./select');

var _where = require('./where');

var _groupBy = require('./group-by');

var _orderBy = require('./order-by');

var _offset = require('./offset');

var _limit = require('./limit');

function performQuery(queryString) {
    var query = (0, _aggregates.identifyAggregatesInQuery)((0, _parser.parseQuery)(queryString));
    //console.log(JSON.stringify(query, null, 4));

    var filePath = query.from;

    if (!_fs2['default'].existsSync(filePath)) {
        throw Error('file not found: "' + filePath + '"');
    }

    var tableFileDescriptor = _fs2['default'].openSync(filePath, 'r');
    var tableReadStream = _fs2['default'].createReadStream(null, { fd: tableFileDescriptor });

    // performLimit will call this function once it has been satisifed,
    // to avoid processing the rest of the file
    function stopReading() {
        _fs2['default'].closeSync(tableFileDescriptor);
        tableReadStream.destroy();
    }

    var resultStream = tableReadStream.pipe(_csv2['default'].parse({ columns: true })).pipe(_csv2['default'].transform((0, _where.performWhere)(query)));

    if (query.aggregates.length > 0 || query.groupBy) {
        resultStream = resultStream.pipe(new _groupBy.GroupingStream(query));
    }

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
    var replHistory = require('repl.history');

    var sqlRepl = repl.start({
        eval: function _eval(queryString, context, filename, callback) {
            var resultStream = performQuery(queryString);

            resultStream.pipe(toCSV()).pipe(process.stdout);

            resultStream.on('end', function () {
                callback(null, undefined);
            });
        },
        ignoreUndefined: true });

    replHistory(sqlRepl, '' + __dirname + '/.repl_history');
}

if (!module.parent) {
    if (process.argv.length > 2) {
        performQuery.apply(undefined, _toConsumableArray(process.argv.slice(2))).pipe(toCSV()).pipe(process.stdout);
    } else {
        // Start a REPL if no arguments have been provided
        startRepl();
    }
}