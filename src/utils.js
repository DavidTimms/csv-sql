
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

export function randomString(n = 16) {
    const chars = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';
    let s = '';

    for (let i = 0; i < n; i++) {
        s += chars[Math.floor(Math.random() * chars.length)];
    }

    return s;
}
