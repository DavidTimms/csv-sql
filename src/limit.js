
export function performLimit({limit}, {onLimitReached}) {
    if (limit === null || limit === undefined) {
        return row => row;
    }
    
    let rowCount = 0;
    let stopped = false;
    return row => {
        if (rowCount >= limit) {
            if (!stopped) {
                onLimitReached();
                stopped = true;
            }
            return null;
        }
        else {
            rowCount += 1;
            return row;
        }
    }
}
