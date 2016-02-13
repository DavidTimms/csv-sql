'use strict';

Object.defineProperty(exports, '__esModule', {
    value: true
});

var _createClass = (function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ('value' in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

var _get = function get(_x, _x2, _x3) { var _again = true; _function: while (_again) { var object = _x, property = _x2, receiver = _x3; desc = parent = getter = undefined; _again = false; var desc = Object.getOwnPropertyDescriptor(object, property); if (desc === undefined) { var parent = Object.getPrototypeOf(object); if (parent === null) { return undefined; } else { _x = parent; _x2 = property; _x3 = receiver; _again = true; continue _function; } } else if ('value' in desc) { return desc.value; } else { var getter = desc.get; if (getter === undefined) { return undefined; } return getter.call(receiver); } } };

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError('Cannot call a class as a function'); } }

function _inherits(subClass, superClass) { if (typeof superClass !== 'function' && superClass !== null) { throw new TypeError('Super expression must either be null or a function, not ' + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) subClass.__proto__ = superClass; }

var _evaluateExpression = require('./evaluate-expression');

var _stream = require('stream');

var _stream2 = _interopRequireDefault(_stream);

var LESS = -1;
var SAME = 0;
var GREATER = 1;

var OrderingStream = (function (_stream$Transform) {
    function OrderingStream(_ref) {
        var orderBy = _ref.orderBy;
        var limit = _ref.limit;

        _classCallCheck(this, OrderingStream);

        _get(Object.getPrototypeOf(OrderingStream.prototype), 'constructor', this).call(this, { objectMode: true });

        this.terms = orderBy;
        // TODO use limit to optimise sorting
        this.limit = limit;
        this.rows = [];

        var directionModifiers = this.terms.map(function (term) {
            return term.direction === 'asc' ? 1 : -1;
        });

        this.compareRows = function (row1, row2) {
            for (var i = 0; i < row1._orderingValues.length; i++) {
                var comparisionResult = compare(row1._orderingValues[i], row2._orderingValues[i]);

                if (comparisionResult !== SAME) {
                    return comparisionResult * directionModifiers[i];
                }
            }
            return SAME;
        };
    }

    _inherits(OrderingStream, _stream$Transform);

    _createClass(OrderingStream, [{
        key: '_transform',
        value: function _transform(row, encoding, done) {
            row._orderingValues = this.terms.map(function (term) {
                return (0, _evaluateExpression.evaluateExpression)(term.expression, row);
            });
            this.rows.push(row);
            done();
        }
    }, {
        key: '_flush',
        value: function _flush(done) {
            this.rows.sort(this.compareRows);
            for (var i = 0; i < this.rows.length; i++) {
                var row = this.rows[i];
                delete row._orderingValues;
                this.push(row);
            }
            done();
        }
    }]);

    return OrderingStream;
})(_stream2['default'].Transform);

exports.OrderingStream = OrderingStream;

function compare(a, b) {
    if ((0, _evaluateExpression.isNull)(a)) {
        if ((0, _evaluateExpression.isNull)(b)) return SAME;else return LESS;
    }

    if ((0, _evaluateExpression.isNull)(b)) return GREATER;

    // if both values can be coerced to numbers, do so
    var numA = Number(a);
    if (!Number.isNaN(numA)) {
        var numB = Number(b);
        if (!Number.isNaN(numB)) {
            a = numA;
            b = numB;
        }
    }

    return a > b ? GREATER : a < b ? LESS : SAME;
}