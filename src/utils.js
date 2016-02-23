import {createHash} from 'crypto';

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
