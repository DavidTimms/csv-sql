'use strict';

Object.defineProperty(exports, "__esModule", {
    value: true
});
exports.performQuery = performQuery;
exports.toCSV = toCSV;
exports.cli = cli;

var _fs = require('fs');

var _fs2 = _interopRequireDefault(_fs);

var _csv = require('csv');

var _csv2 = _interopRequireDefault(_csv);

var _commander = require('commander');

var _commander2 = _interopRequireDefault(_commander);

var _package = require('../package.json');

var _package2 = _interopRequireDefault(_package);

var _utils = require('./utils');

var _parser = require('./parser');

var _aggregates = require('./aggregates');

var _select = require('./select');

var _where = require('./where');

var _groupBy = require('./group-by');

var _orderBy = require('./order-by');

var _offset = require('./offset');

var _limit = require('./limit');

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function performQuery(queryString, options) {
    var query = (0, _aggregates.identifyAggregatesInQuery)((0, _parser.parseQuery)(queryString));
    //console.log(JSON.stringify(query, null, 4));

    var filePath = query.from;

    if (!_fs2.default.existsSync(filePath)) {
        throw Error('file not found: "' + filePath + '"');
    }

    var tableReadStream = createEndableReadStream(filePath);

    var resultStream = tableReadStream.pipe(_csv2.default.parse({
        columns: true,
        delimiter: options.inSeparator
    })).pipe(_csv2.default.transform((0, _where.performFilter)(query.where)));

    if (query.aggregates.length > 0 || query.groupBy) {
        resultStream = resultStream.pipe(new _groupBy.GroupingStream(query)).pipe(_csv2.default.transform((0, _where.performFilter)(query.having)));
    }

    if (query.orderBy) {
        resultStream = resultStream.pipe(new _orderBy.OrderingStream(query));
    }

    resultStream = resultStream.pipe(_csv2.default.transform((0, _offset.performOffset)(query))).pipe(_csv2.default.transform((0, _limit.performLimit)(query, { onLimitReached: tableReadStream.end }))).pipe(_csv2.default.transform((0, _select.performSelect)(query)));

    return resultStream;
}

function createEndableReadStream(filePath) {
    var fileDescriptor = _fs2.default.openSync(filePath, 'r');
    var readStream = _fs2.default.createReadStream(null, { fd: fileDescriptor });
    var isStreamActive = true;

    readStream.on('end', function () {
        isStreamActive = false;
    });

    // performLimit will call this function once it has been satisifed,
    // to avoid processing the rest of the file
    readStream.end = function () {
        if (isStreamActive) {
            _fs2.default.closeSync(fileDescriptor);
            readStream.destroy();
        }
    };

    return readStream;
}

function toCSV(rowStream, options) {
    return rowStream.pipe((0, _utils.preStringify)()).pipe(_csv2.default.stringify({
        header: true,
        delimiter: options.outSeparator
    }));
}

function startRepl(options) {
    var repl = require('repl');
    var replHistory = require('repl.history');

    var sqlRepl = repl.start({
        eval: function _eval(queryString, context, filename, callback) {
            if (queryString.toLowerCase().trim() === 'exit') {
                process.exit();
            }

            if (queryString.match(/^\s*$/)) {
                callback(null, undefined);
                return;
            }

            console.log(JSON.stringify(queryString));

            var resultStream = performQuery(queryString, options);

            toCSV(resultStream, options).pipe(process.stdout);

            resultStream.on('end', function () {
                callback(null, undefined);
            });
        },
        ignoreUndefined: true
    });

    replHistory(sqlRepl, __dirname + '/.repl_history');
}

function cli() {

    _commander2.default.version(_package2.default.version).description(_package2.default.description).arguments('<query>').option('-s, --separator [string]', 'The CSV column separator for input and output').option('--in-separator [string]', 'The CSV column separator for reading input').option('--out-separator [string]', 'The CSV column separator for generating output').parse(process.argv);

    var options = _commander2.default;
    var query = options.args[0];

    options.inSeparator = options.inSeparator || options.separator;
    options.outSeparator = options.outSeparator || options.separator;

    if (query) {
        toCSV(performQuery(query, options), options).pipe(process.stdout);
    } else {
        // Start a REPL if no arguments have been provided
        startRepl(options);
    }
}