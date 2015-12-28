"use strict";

Object.defineProperty(exports, "__esModule", {
    value: true
});
exports.performLimit = performLimit;

function performLimit(_ref, stopReading) {
    var _ref$limit = _ref.limit;
    var limit = _ref$limit === undefined ? Infinity : _ref$limit;

    var rowCount = 0;
    var stopped = false;
    return function (row) {
        if (rowCount >= limit) {
            if (!stopped) {
                stopReading();
                stopped = true;
            }
            return null;
        } else {
            rowCount += 1;
            return row;
        }
    };
}