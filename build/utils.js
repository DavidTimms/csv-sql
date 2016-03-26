'use strict';

Object.defineProperty(exports, '__esModule', {
    value: true
});

var _createClass = (function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ('value' in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

var _get = function get(_x, _x2, _x3) { var _again = true; _function: while (_again) { var object = _x, property = _x2, receiver = _x3; desc = parent = getter = undefined; _again = false; var desc = Object.getOwnPropertyDescriptor(object, property); if (desc === undefined) { var parent = Object.getPrototypeOf(object); if (parent === null) { return undefined; } else { _x = parent; _x2 = property; _x3 = receiver; _again = true; continue _function; } } else if ('value' in desc) { return desc.value; } else { var getter = desc.get; if (getter === undefined) { return undefined; } return getter.call(receiver); } } };

exports.merge = merge;
exports.mergeInto = mergeInto;
exports.md5 = md5;
exports.logStream = logStream;
exports.preStringify = preStringify;

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError('Cannot call a class as a function'); } }

function _inherits(subClass, superClass) { if (typeof superClass !== 'function' && superClass !== null) { throw new TypeError('Super expression must either be null or a function, not ' + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) subClass.__proto__ = superClass; }

var _crypto = require('crypto');

var _stream = require('stream');

var _stream2 = _interopRequireDefault(_stream);

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

var MappingStream = (function (_stream$Transform) {
    function MappingStream(func) {
        _classCallCheck(this, MappingStream);

        _get(Object.getPrototypeOf(MappingStream.prototype), 'constructor', this).call(this, { objectMode: true });
        this.func = func;
        this.i = 0;
    }

    _inherits(MappingStream, _stream$Transform);

    _createClass(MappingStream, [{
        key: '_transform',
        value: function _transform(row, encoding, done) {
            this.push(this.func.call(null, row, this.i++, this));
            done();
        }
    }]);

    return MappingStream;
})(_stream2['default'].Transform);

function logStream() {
    return new MappingStream(function (row) {
        console.log(row);
        return row;
    });
}

function preStringify() {
    function preStringifyValue(value) {
        if (value === true) {
            return 1;
        } else if (value === false) {
            return 0;
        }
        return value;
    }

    return new MappingStream(function (row) {
        var mapped = {};
        Object.keys(row).forEach(function (key) {
            mapped[key] = preStringifyValue(row[key]);
        });
        return mapped;
    });
}