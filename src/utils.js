import {createHash} from 'crypto';
import stream from 'stream';

export function merge(a, b) {
    return mergeInto(mergeInto({}, a), b);
}

export function mergeInto(a, b) {
    if (b) {
        for (let key in b) {
            if (b.hasOwnProperty(key)) {
                a[key] = b[key];
            }
        }
    }
    return a;
}

export function md5(string) {
    const hash = createHash('md5');
    hash.update(string);
    return hash.digest('hex');
}

class MappingStream extends stream.Transform {
    constructor(func) {
        super({objectMode: true});
        this.func = func;
        this.i = 0;
    }

    _transform(row, encoding, done) {
        this.push(this.func.call(null, row, this.i++, this));
        done();
    }
}

export function logStream() {
    return new MappingStream(row => {
        console.log(row);
        return row;
    });
}

export function preStringify() {
    function preStringifyValue(value) {
        if (value === true) {
            return 1;
        }
        else if (value === false) {
            return 0;
        }
        return value;
    }

    return new MappingStream(row => {
        const mapped = {};
        Object.keys(row).forEach(key => {
            mapped[key] = preStringifyValue(row[key]);
        });
        return mapped;
    });
}