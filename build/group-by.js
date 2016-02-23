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

var EmptyObject = (function (_ref) {
    function EmptyObject() {
        _classCallCheck(this, EmptyObject);

        if (_ref != null) {
            _ref.apply(this, arguments);
        }
    }

    _inherits(EmptyObject, _ref);

    return EmptyObject;
})(null);

EmptyObject.prototype._hasOwnProperty = Object.prototype.hasOwnProperty;

var GroupingStream = (function (_stream$Transform) {
    function GroupingStream(_ref2) {
        var groupBy = _ref2.groupBy;
        var aggregations = _ref2.aggregations;

        _classCallCheck(this, GroupingStream);

        _get(Object.getPrototypeOf(GroupingStream.prototype), 'constructor', this).call(this, { objectMode: true });

        this.expressions = groupBy;
        if (groupBy.length > 0) {
            this.grouping = new EmptyObject();
        } else {
            this.grouping = null;
        }
    }

    _inherits(GroupingStream, _stream$Transform);

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
                    var child = undefined;
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
            return;
            row._aggregationValues = [];
            for (var i = 0; i < this.aggregations.length; i++) {}
        }
    }, {
        key: 'updateGroupAggregations',
        value: function updateGroupAggregations(baseRow, row) {}
    }]);

    return GroupingStream;
})(_stream2['default'].Transform);

exports.GroupingStream = GroupingStream;