"use strict";

Object.defineProperty(exports, "__esModule", {
    value: true
});
exports.performOffset = performOffset;

function performOffset(_ref) {
    var _ref$offset = _ref.offset;
    var offset = _ref$offset === undefined ? 0 : _ref$offset;

    var rowCount = 0;
    return function (row) {
        rowCount += 1;
        return rowCount > offset ? row : null;
    };
}