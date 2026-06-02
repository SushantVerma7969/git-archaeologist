"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.formatPath = formatPath;
exports.formatDate = formatDate;
exports.formatScore = formatScore;
exports.formatBusFactor = formatBusFactor;
exports.formatOwnershipPercent = formatOwnershipPercent;
exports.formatCouplingScore = formatCouplingScore;
exports.sectionHeader = sectionHeader;
exports.summaryBox = summaryBox;
const chalk_1 = __importDefault(require("chalk"));
function formatPath(filepath, maxLen = 55) {
    if (filepath.length <= maxLen)
        return filepath;
    const parts = filepath.split('/');
    if (parts.length <= 2)
        return '...' + filepath.slice(-(maxLen - 3));
    // Keep filename and one parent always visible
    const filename = parts[parts.length - 1];
    const parent = parts[parts.length - 2];
    const prefix = '.../';
    const short = `${prefix}${parent}/${filename}`;
    return short.length <= maxLen ? short : '...' + filename.slice(-(maxLen - 3));
}
function formatDate(timestamp) {
    return new Date(timestamp * 1000).toISOString().split('T')[0];
}
function formatScore(score) {
    if (score >= 800)
        return chalk_1.default.red.bold(score.toFixed(1));
    if (score >= 400)
        return chalk_1.default.yellow.bold(score.toFixed(1));
    if (score >= 100)
        return chalk_1.default.cyan(score.toFixed(1));
    return chalk_1.default.green(score.toFixed(1));
}
function formatBusFactor(n) {
    if (n === 1)
        return chalk_1.default.red.bold('1 ⚠');
    if (n === 2)
        return chalk_1.default.yellow.bold('2 ⚡');
    return chalk_1.default.green.bold(String(n));
}
function formatOwnershipPercent(pct) {
    if (pct >= 90)
        return chalk_1.default.magenta.bold(`${pct}%`);
    if (pct >= 70)
        return chalk_1.default.cyan(`${pct}%`);
    return chalk_1.default.white(`${pct}%`);
}
function formatCouplingScore(score) {
    if (score >= 80)
        return chalk_1.default.red.bold(`${score}%`);
    if (score >= 50)
        return chalk_1.default.yellow.bold(`${score}%`);
    return chalk_1.default.cyan(`${score}%`);
}
function sectionHeader(title) {
    const line = '─'.repeat(70);
    return `\n${chalk_1.default.bold.hex('#A78BFA')(line)}\n ${chalk_1.default.bold.white(title)}\n${chalk_1.default.bold.hex('#A78BFA')(line)}`;
}
function summaryBox(lines) {
    const width = 70;
    const top = chalk_1.default.hex('#A78BFA')('╭' + '─'.repeat(width - 2) + '╮');
    const bottom = chalk_1.default.hex('#A78BFA')('╰' + '─'.repeat(width - 2) + '╯');
    const mid = lines.map((l) => {
        const visible = l.replace(/\x1B\[[0-9;]*m/g, '');
        const pad = width - 2 - visible.length;
        return chalk_1.default.hex('#A78BFA')('│') + ' ' + l + ' '.repeat(Math.max(0, pad - 1)) + chalk_1.default.hex('#A78BFA')('│');
    });
    return [top, ...mid, bottom].join('\n');
}
//# sourceMappingURL=formatter.js.map