
const tokenTypes = {
    identifier: /^[a-z_]\w*/i,
    parOpen: /^\(/,
    parClose: /^\)/,
    star: /^\*/,
    number: /^\d+(\.\d+)?/,
    operator: /^(=|<=|>=|!=|<>|<|>)/,
    string: /^("|'|`)/,
    comma: /^,/,
    semicolon: /^;/,
};

export function tokenize(query) {
    const tokens = [];
    let rest = query;

    if (!query) {
        throw Error('No input to tokenize');
    }

    nextToken:
    while (true) {
        rest = rest.match(/^\s*([\s\S]*)$/)[1];
        if (rest.length === 0) break;

        for (let tokenType in tokenTypes) {
            const match = rest.match(tokenTypes[tokenType]);
            if (match) {
                let token = {type: tokenType, string: match[0]};

                [rest, token] = processRawToken(rest.slice(match[0].length), token);

                tokens.push(token);
                continue nextToken;
            }
        }
        throw Error("unable to tokenize: " + JSON.stringify(rest));
    }

    return tokens;
}

const BACKTICK = '`';

const KEYWORDS = [
    'SELECT',
    'FROM',
    'WHERE',
    'GROUP',
    'BY',
    'AS',
    'ORDER',
    'ASC',
    'DESC',
    'LIMIT',
    'OFFSET',
    'CASE',
    'WHEN',
    'THEN',
    'ELSE',
    'END',
    'NOT',
    'NULL',
    'TRUE',
    'FALSE',
];

const WORD_OPERATORS = [
    'AND',
    'OR',
    'IS',
    'LIKE',
];

const keywordRegex = new RegExp(`^(${ KEYWORDS.join('|') })$`, 'i');
const operatorRegex = new RegExp(`^(${ WORD_OPERATORS.join('|') })$`, 'i');

function processRawToken(rest, token) {

    switch (token.type) {
        case 'identifier':
            if (keywordRegex.test(token.string)) {
                token.type = 'keyword';
                token.string = token.string.toUpperCase();
            }
            else if (operatorRegex.test(token.string)) {
                token.type = 'operator';
                token.string = token.string.toUpperCase();
            }
            else {
                token.value = token.string;
            }
            break;

        case 'number':
            token.value = Number(token.string);
            break;

        case 'string':
            [rest, token] = takeStringLiteral(token.string)(rest);
            break;
    }

    return [rest, token];
}

function takeStringLiteral(delimiter) {
    return function recur(input, index=0, value='', state='normal') {
        const char = input[index];

        if (char === undefined) {
            throw SyntaxError("Input ended in the middle of a string literal");
        }

        switch (state) {

            case 'normal':
                switch (char) {

                    case delimiter:
                    const rest = input.slice(index + 1);
                        const token = {
                            type: delimiter === BACKTICK ? 'identifier' : 'string',
                            string: delimiter + input.slice(0, index + 1),
                            value,
                        }
                        return [rest, token];

                    case '\\':
                        return recur(input, index + 1, value, 'escaped');

                    default:
                        return recur(input, index + 1, value + char, 'normal');
                }

            case 'escaped':
                return recur(input, index + 1, value + char, 'normal');

            default:
                throw TypeError(`Invalid state: ${state}`);
        }
    };
}