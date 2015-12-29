
export function performOffset({offset}) {
    if (offset === null || offset === undefined) {
        return row => row;
    }
    
    let rowCount = 0;
    return row => {
        rowCount += 1;
        return rowCount > offset ? row : null;
    };
}
