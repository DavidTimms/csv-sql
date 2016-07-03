'use strict';

Object.defineProperty(exports, "__esModule", {
    value: true
});

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

exports.merge = merge;
exports.mergeInto = mergeInto;
exports.md5 = md5;
exports.logStream = logStream;
exports.preStringify = preStringify;

var _crypto = require('crypto');

var _stream = require('stream');

var _stream2 = _interopRequireDefault(_stream);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

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

var MappingStream = function (_stream$Transform) {
    _inherits(MappingStream, _stream$Transform);

    function MappingStream(func) {
        _classCallCheck(this, MappingStream);

        var _this = _possibleConstructorReturn(this, Object.getPrototypeOf(MappingStream).call(this, { objectMode: true }));

        _this.func = func;
        _this.i = 0;
        return _this;
    }

    _createClass(MappingStream, [{
        key: '_transform',
        value: function _transform(row, encoding, done) {
            this.push(this.func.call(null, row, this.i++, this));
            done();
        }
    }]);

    return MappingStream;
}(_stream2.default.Transform);

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