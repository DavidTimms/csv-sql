'use strict';

Object.defineProperty(exports, '__esModule', {
    value: true
});
exports.merge = merge;
exports.mergeInto = mergeInto;
exports.randomString = randomString;

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

function randomString() {
    var n = arguments[0] === undefined ? 16 : arguments[0];

    var chars = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';
    var s = '';

    for (var i = 0; i < n; i++) {
        s += chars[Math.floor(Math.random() * chars.length)];
    }

    return s;
}