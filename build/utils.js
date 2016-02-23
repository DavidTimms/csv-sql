'use strict';

Object.defineProperty(exports, '__esModule', {
    value: true
});
exports.merge = merge;
exports.mergeInto = mergeInto;
exports.md5 = md5;

var _crypto = require('crypto');

function merge(a, b) {
    return mergeInto(mergeInto({}, a), b);
}

function mergeInto(a, b) {
    if (b) {
        for (var key in b) {
            if (b.hasOwnProperty(key)) {
                a[key] = b[key];
            }
        }
    }
    return a;
}

function md5(string) {
    var hash = (0, _crypto.createHash)('md5');
    hash.update(string);
    return hash.digest('hex');
}