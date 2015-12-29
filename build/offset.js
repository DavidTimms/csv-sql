"use strict";

Object.defineProperty(exports, "__esModule", {
    value: true
});
exports.performOffset = performOffset;

function performOffset(_ref) {
    var offset = _ref.offset;

    if (offset === null || offset === undefined) {
        return function (row) {
            return row;
        };
    }

    var rowCount = 0;
    return function (row) {
        rowCount += 1;
        return rowCount > offset ? row : null;
    };
}