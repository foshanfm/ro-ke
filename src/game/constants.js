export const CELL_SIZE = 10;
export const HALF_CELL = CELL_SIZE / 2;

/**
 * Converts logic pixel coordinates to grid (cell) coordinates
 * @param {number} px 
 * @returns {number}
 */
export function toGrid(px) {
    return Math.floor(px / CELL_SIZE);
}

/**
 * Converts grid (cell) coordinates to logic pixel coordinates
 * @param {number} cell 
 * @returns {number}
 */
export function toPixel(cell) {
    return cell * CELL_SIZE;
}

/**
 * Formats coordinates for display: (x, y) in grid units
 * @param {number} x 
 * @param {number} y 
 * @returns {string}
 */
export function formatPos(x, y) {
    return `(${toGrid(x)}, ${toGrid(y)})`;
}
