
export function performOffset({offset = 0}) {
    let rowCount = 0;
    return row => {
        rowCount += 1;
        return rowCount > offset ? row : null;
    };
}
