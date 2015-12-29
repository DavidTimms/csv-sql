
import {evaluateExpression, isNull} from './evaluate-expression';
import stream from 'stream';

const [LESS, SAME, GREATER] = [-1, 0, 1];
const LOCALE = 'en-GB';
const COMPARE_OPTIONS = {numeric: true};

export class OrderingStream extends stream.Transform {
    constructor({orderBy, limit}) {
        super({objectMode: true});

        this.terms = orderBy;
        // TODO use limit to optimise sorting
        this.limit = limit;
        this.rows = [];

        const directionModifiers = this.terms.map(term => {
            return term.direction === 'asc' ? 1 : -1;
        });

        this.compareRows = (row1, row2) => {
            for (let i = 0; i < row1._orderingValues.length; i++) {
                const comparisionResult = compare(
                    row1._orderingValues[i],
                    row2._orderingValues[i]
                );

                if (comparisionResult !== SAME) {
                    return comparisionResult * directionModifiers[i];
                }
            }
        }
    }

    _transform(row, encoding, done) {
        row._orderingValues = this.terms.map(term => {
            return evaluateExpression(term.expression, row);
        });
        this.rows.push(row);
        done();
    }

    _flush(done) {
        this.rows.sort(this.compareRows);
        for (let i = 0; i < this.rows.length; i++) {
            const row = this.rows[i];
            delete row._orderingValues;
            this.push(row);
        }
        done();
    }
}

function compare(a, b) {
    if (isNull(a)) {
        if (isNull(b)) return SAME;
        else return LESS;
    }

    if (isNull(b)) return GREATER;

    return String(a).localeCompare(b, LOCALE, COMPARE_OPTIONS);
}
