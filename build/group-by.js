'use strict';

Object.defineProperty(exports, "__esModule", {
    value: true
});
exports.GroupingStream = undefined;

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _evaluateExpression = require('./evaluate-expression');

var _aggregates = require('./aggregates');

var _stream = require('stream');

var _stream2 = _interopRequireDefault(_stream);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var EmptyObject = function (_ref) {
    _inherits(EmptyObject, _ref);

    function EmptyObject() {
        _classCallCheck(this, EmptyObject);

        return _possibleConstructorReturn(this, Object.getPrototypeOf(EmptyObject).apply(this, arguments));
    }

    return EmptyObject;
}(null);

EmptyObject.prototype._hasOwnProperty = Object.prototype.hasOwnProperty;

var GroupingStream = exports.GroupingStream = function (_stream$Transform) {
    _inherits(GroupingStream, _stream$Transform);

    function GroupingStream(_ref2) {
        var groupBy = _ref2.groupBy;
        var aggregates = _ref2.aggregates;

        _classCallCheck(this, GroupingStream);

        var _this2 = _possibleConstructorReturn(this, Object.getPrototypeOf(GroupingStream).call(this, { objectMode: true }));

        _this2.aggregates = aggregates;
        _this2.expressions = groupBy || [];

        if (_this2.expressions.length > 0) {
            _this2.grouping = new EmptyObject();
        } else {
            _this2.grouping = null;
        }
        return _this2;
    }

    _createClass(GroupingStream, [{
        key: '_transform',
        value: function _transform(row, encoding, done) {
            var grouping = this.grouping;
            var expressionCount = this.expressions.length;

            for (var i = 0; i < expressionCount; i++) {
                var value = (0, _evaluateExpression.str)((0, _evaluateExpression.evaluateExpression)(this.expressions[i], row));
                if (grouping._hasOwnProperty(value)) {
                    grouping = grouping[value];
                } else {
                    var child = void 0;
                    if (i === expressionCount - 1) {
                        child = row;
                        this.createGroupAggregations(row);
                    } else {
                        child = new EmptyObject();
                    }
                    grouping[value] = child;
                    grouping = child;
                }
            }

            // set the root grouping to be the first row for aggregations
            // with no GROUP BY expressions
            if (grouping === null) {
                grouping = this.grouping = row;
                this.createGroupAggregations(row);
            }
            this.updateGroupAggregations(grouping, row);

            done();
        }
    }, {
        key: '_flush',
        value: function _flush(done) {
            this.flushGroups(this.grouping, this.expressions.length);
            done();
        }
    }, {
        key: 'flushGroups',
        value: function flushGroups(grouping, depth) {
            if (depth > 0) {
                var groupKeys = Object.keys(grouping);
                for (var i = 0; i < groupKeys.length; i++) {
                    this.flushGroups(grouping[groupKeys[i]], depth - 1);
                }
            } else {
                this.push(grouping);
            }
        }
    }, {
        key: 'createGroupAggregations',
        value: function createGroupAggregations(baseRow) {
            baseRow._aggregateValues = {};
            for (var i = 0; i < this.aggregates.length; i++) {
                var aggregate = this.aggregates[i];
                var initial = _aggregates.aggregateFunctions[aggregate.functionName].initial;
                baseRow._aggregateValues[aggregate.id] = initial;
            }
        }
    }, {
        key: 'updateGroupAggregations',
        value: function updateGroupAggregations(baseRow, row) {
            for (var i = 0; i < this.aggregates.length; i++) {
                var aggregate = this.aggregates[i];
                var reducer = _aggregates.aggregateFunctions[aggregate.functionName].reducer;
                var current = baseRow._aggregateValues[aggregate.id];
                var rowValue = (0, _evaluateExpression.evaluateExpression)(aggregate.arguments[0], row);
                baseRow._aggregateValues[aggregate.id] = reducer(current, rowValue);
            }
        }
    }]);

    return GroupingStream;
}(_stream2.default.Transform);