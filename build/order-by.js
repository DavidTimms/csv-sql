'use strict';

Object.defineProperty(exports, "__esModule", {
    value: true
});
exports.OrderingStream = undefined;

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _evaluateExpression = require('./evaluate-expression');

var _stream = require('stream');

var _stream2 = _interopRequireDefault(_stream);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var LESS = -1;
var SAME = 0;
var GREATER = 1;

var OrderingStream = exports.OrderingStream = function (_stream$Transform) {
    _inherits(OrderingStream, _stream$Transform);

    function OrderingStream(_ref) {
        var orderBy = _ref.orderBy;
        var limit = _ref.limit;

        _classCallCheck(this, OrderingStream);

        var _this = _possibleConstructorReturn(this, Object.getPrototypeOf(OrderingStream).call(this, { objectMode: true }));

        _this.terms = orderBy;
        // TODO use limit to optimise sorting
        _this.limit = limit;
        _this.rows = [];

        var directionModifiers = _this.terms.map(function (term) {
            return term.direction === 'asc' ? 1 : -1;
        });

        _this.compareRows = function (row1, row2) {
            for (var i = 0; i < row1._orderingValues.length; i++) {
                var comparisionResult = compare(row1._orderingValues[i], row2._orderingValues[i]);

                if (comparisionResult !== SAME) {
                    return comparisionResult * directionModifiers[i];
                }
            }
            return SAME;
        };
        return _this;
    }

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
}(_stream2.default.Transform);

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