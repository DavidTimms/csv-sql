"use strict";

Object.defineProperty(exports, "__esModule", {
	value: true
});
exports.performLimit = performLimit;

function performLimit(_ref) {
	var limit = _ref.limit;

	var rowCount = 0;
	return function (row) {
		if (rowCount >= limit) {
			return null;
		} else {
			rowCount += 1;
			return row;
		}
	};
}