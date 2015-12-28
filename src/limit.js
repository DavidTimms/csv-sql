
export function performLimit({limit = Infinity}, stopReading) {
    let rowCount = 0;
    let stopped = false;
    return row => {
        if (rowCount >= limit) {
            if (!stopped) {
                stopReading();
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
