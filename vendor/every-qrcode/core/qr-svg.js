function validateQuietZone(quietZone) {
    if (!Number.isInteger(quietZone) || quietZone < 0 || quietZone > 16) {
        throw new RangeError("QR quiet zone");
    }
}
export function createQRSvgPath(matrix, quietZone = 4) {
    validateQuietZone(quietZone);
    const commands = [];
    for (let row = 0; row < matrix.size; row += 1) {
        let column = 0;
        while (column < matrix.size) {
            if (matrix.cells[row * matrix.size + column] !== 1) {
                column += 1;
                continue;
            }
            const start = column;
            while (column < matrix.size && matrix.cells[row * matrix.size + column] === 1) {
                column += 1;
            }
            const width = column - start;
            commands.push(`M${start + quietZone} ${row + quietZone}h${width}v1h-${width}z`);
        }
    }
    return { path: commands.join(""), size: matrix.size + quietZone * 2 };
}
