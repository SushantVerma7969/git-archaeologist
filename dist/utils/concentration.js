"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.calculateConcentration = calculateConcentration;
function calculateConcentration(authorTotals) {
    const total = Array.from(authorTotals.values()).reduce((a, b) => a + b, 0);
    if (total === 0) {
        return null;
    }
    const sorted = Array.from(authorTotals.entries()).sort((a, b) => b[1] - a[1]);
    const topShare = sorted[0][1] / total;
    return Math.round(topShare * 1000) / 10;
}
//# sourceMappingURL=concentration.js.map