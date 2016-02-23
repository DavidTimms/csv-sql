'use strict';

Object.defineProperty(exports, '__esModule', {
    value: true
});
exports.evaluateExpression = evaluateExpression;
exports.patternToRegExp = patternToRegExp;
exports.isNull = isNull;
exports.str = str;

function _toConsumableArray(arr) { if (Array.isArray(arr)) { for (var i = 0, arr2 = Array(arr.length); i < arr.length; i++) arr2[i] = arr[i]; return arr2; } else { return Array.from(arr); } }

require('./aggregates');

function evaluateExpression(exp, context) {
    switch (exp.type) {
        case 'number':
        case 'string':
        case 'literal':
            return exp.value;
        case 'identifier':
            if (context.hasOwnProperty(exp.value)) {
                return context[exp.value];
            }
            throw ReferenceError('Column not found: ' + exp.string);
        case 'call':
            if (functions.hasOwnProperty(exp.functionName)) {
                var argValues = exp.arguments.map(function (arg) {
                    return evaluateExpression(arg, context);
                });
                return functions[exp.functionName].apply(functions, _toConsumableArray(argValues));
            }
            throw ReferenceError('SQL function not found: ' + exp.functionName);
        case 'binaryExpression':
            return performBinaryOperation(exp.operator, evaluateExpression(exp.left, context), evaluateExpression(exp.right, context));
        default:
            throw Error('Unexpected expression type: ' + exp.type);
    }
}

function performBinaryOperation(operator, left, right) {
    switch (operator) {
        case '=':
            return str(left) === str(right);
        case '!=':
        case '<>':
            return str(left) !== str(right);
        case '>':
            return Number(left) > Number(right);
        case '<':
            return Number(left) < Number(right);
        case '>=':
            return Number(left) >= Number(right);
        case '<=':
            return Number(left) <= Number(right);
        // TODO make logical operators short-circuit
        case 'OR':
            return Boolean(left) || Boolean(right);
        case 'AND':
            return Boolean(left) && Boolean(right);
        case 'LIKE':
            return str(left).search(patternToRegExp(right)) !== -1;
        default:
            throw Error('Unknown operator: ' + operator);
    }
}

var escapeChars = '.[]\\^|$()?:*+{}!';

var escapeCharsRegExp = new RegExp('(' + escapeChars.split('').map(function (c) {
    return '\\' + c;
}).join('|') + ')', 'g');

var patternRegExpCache = {};

function patternToRegExp(pattern) {
    if (!patternRegExpCache.hasOwnProperty(pattern)) {
        var regExpString = pattern.replace(escapeCharsRegExp, '\\$1').replace(/_|%/g, function (c) {
            return c === '_' ? '.' : '.*';
        });
        patternRegExpCache[pattern] = new RegExp('^' + regExpString + '$', 'gi');
    }
    return patternRegExpCache[pattern];
}

function isNull(value) {
    return value === null || value === undefined || value === '';
}

function str(value) {
    if (value === null || value === undefined) return '';else return String(value);
}

var functions = {
    UPPERCASE: function UPPERCASE(s) {
        return s === null && s === undefined ? null : String(s).toUpperCase();
    },
    LOWERCASE: function LOWERCASE(s) {
        return s === null && s === undefined ? null : String(s).toLowerCase();
    },
    LEN: function LEN(s) {
        return isNull(s) ? null : str(s).length;
    },
    COALESCE: function COALESCE() {
        for (var _len = arguments.length, args = Array(_len), _key = 0; _key < _len; _key++) {
            args[_key] = arguments[_key];
        }

        for (var i = 0; i < args.length; i++) {
            if (!isNull(args[i])) return args[i];
        }
        return null;
    },
    TRIM: function TRIM(s, chars) {
        if (isNull(s)) return null;

        s = str(s);

        if (arguments.length < 2) {
            return s.trim();
        } else {
            var startIndex = 0;
            var endIndex = s.length - 1;

            while (chars.indexOf(s[startIndex]) >= 0) startIndex++;
            if (startIndex === s.length) return '';
            while (chars.indexOf(s[endIndex]) >= 0) endIndex--;
            return s.substring(startIndex, endIndex + 1);
        }
    },
    LTRIM: function LTRIM(s) {
        var chars = arguments[1] === undefined ? ' \t\n\r' : arguments[1];
        var min = arguments[2] === undefined ? 0 : arguments[2];

        if (isNull(s)) return null;

        s = str(s);
        var startIndex = 0;

        while (chars.indexOf(s[startIndex]) >= 0 && s.length - startIndex > min) {
            startIndex++;
        }
        return s.substring(startIndex);
    } };

functions.IFNULL = functions.COALESCE;