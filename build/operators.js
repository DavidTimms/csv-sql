'use strict';

Object.defineProperty(exports, "__esModule", {
    value: true
});
var LEFT = exports.LEFT = 'left',
    RIGHT = exports.RIGHT = 'right';

var OPERATORS = exports.OPERATORS = {
    '^': { precedence: 80, associativity: LEFT },
    '/': { precedence: 70, associativity: LEFT },
    '*': { precedence: 70, associativity: LEFT },
    '%': { precedence: 70, associativity: LEFT },
    '+': { precedence: 60, associativity: LEFT },
    '-': { precedence: 60, associativity: LEFT },
    'IS': { precedence: 50, associativity: LEFT },
    'LIKE': { precedence: 50, associativity: LEFT },
    '<=': { precedence: 50, associativity: LEFT },
    '>=': { precedence: 50, associativity: LEFT },
    '<': { precedence: 50, associativity: LEFT },
    '>': { precedence: 50, associativity: LEFT },
    '!=': { precedence: 50, associativity: LEFT },
    '<>': { precedence: 50, associativity: LEFT },
    '=': { precedence: 50, associativity: RIGHT },
    'AND': { precedence: 40, associativity: LEFT },
    'OR': { precedence: 30, associativity: LEFT }
};