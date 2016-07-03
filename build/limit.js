"use strict";

Object.defineProperty(exports, "__esModule", {
    value: true
});
exports.performLimit = performLimit;
function performLimit(_ref, _ref2) {
    var limit = _ref.limit;
    var onLimitReached = _ref2.onLimitReached;

    if (limit === null || limit === undefined) {
        return function (row) {
            return row;
        };
    }

    var rowCount = 0;
    var stopped = false;
    return function (row) {
        if (rowCount >= limit) {
            if (!stopped) {
                onLimitReached();
                stopped = true;
            }
            return null;
        } else {
            rowCount += 1;
            return row;
        }
    };
}