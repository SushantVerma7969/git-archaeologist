"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.renderReport = renderReport;
const cli_table3_1 = __importDefault(require("cli-table3"));
const chalk_1 = __importDefault(require("chalk"));
const formatter_1 = require("./formatter");
function renderReport(result) {
    renderSummary(result);
    renderCursedFiles(result);
    renderBusFactor(result);
    renderOwnership(result);
    renderCoupling(result);
    renderFooter();
}
function renderSummary(r) {
    console.log('\n');
    const from = (0, formatter_1.formatDate)(Math.floor(r.dateRange.from.getTime() / 1000));
    const to = (0, formatter_1.formatDate)(Math.floor(r.dateRange.to.getTime() / 1000));
    console.log((0, formatter_1.summaryBox)([
        chalk_1.default.bold.white('⛏  Git Archaeologist — Repository Analysis'),
        '',
        `  ${chalk_1.default.hex('#A78BFA')('Repo')}          ${chalk_1.default.white(r.repoName)}`,
        `  ${chalk_1.default.hex('#A78BFA')('Path')}          ${chalk_1.default.white(r.repoPath)}`,
        `  ${chalk_1.default.hex('#A78BFA')('Analyzed at')}   ${chalk_1.default.white(r.analyzedAt.toLocaleString())}`,
        '',
        `  ${chalk_1.default.hex('#A78BFA')('Total commits')} ${chalk_1.default.yellow.bold(String(r.totalCommits))}`,
        `  ${chalk_1.default.hex('#A78BFA')('Total files')}   ${chalk_1.default.yellow.bold(String(r.totalFiles))}`,
        `  ${chalk_1.default.hex('#A78BFA')('Total authors')} ${chalk_1.default.yellow.bold(String(r.totalAuthors))}`,
        `  ${chalk_1.default.hex('#A78BFA')('Date range')}    ${chalk_1.default.white(from)} → ${chalk_1.default.white(to)}`,
    ]));
}
function renderCursedFiles(r) {
    console.log((0, formatter_1.sectionHeader)('💀  CURSED FILES  —  highest instability score'));
    const table = new cli_table3_1.default({
        head: [
            chalk_1.default.bold('Rank'),
            chalk_1.default.bold('File'),
            chalk_1.default.bold('Score'),
            chalk_1.default.bold('Changes'),
            chalk_1.default.bold('Authors'),
            chalk_1.default.bold('Last touched'),
            chalk_1.default.bold('Why'),
        ],
        colWidths: [6, 42, 10, 9, 9, 14, 38],
        style: { head: [], border: ['grey'] },
        wordWrap: true,
    });
    r.cursedFiles.slice(0, 15).forEach((f, i) => {
        const stats = r.fileStats.get(f.filepath);
        const lastTouched = stats ? (0, formatter_1.formatDate)(stats.lastChanged) : 'unknown';
        table.push([
            chalk_1.default.grey(String(i + 1)),
            (0, formatter_1.formatPath)(f.filepath, 40),
            (0, formatter_1.formatScore)(f.curseScore),
            chalk_1.default.white(String(f.totalChanges)),
            chalk_1.default.white(String(f.uniqueAuthors)),
            chalk_1.default.grey(lastTouched),
            chalk_1.default.grey(f.reasons.join(', ')),
        ]);
    });
    console.log(table.toString());
}
function renderBusFactor(r) {
    console.log((0, formatter_1.sectionHeader)('🚌  BUS FACTOR  —  who leaving would hurt the most'));
    const table = new cli_table3_1.default({
        head: [
            chalk_1.default.bold('Module'),
            chalk_1.default.bold('Bus Factor'),
            chalk_1.default.bold('Files'),
            chalk_1.default.bold('Key people'),
            chalk_1.default.bold('Risk'),
        ],
        colWidths: [22, 12, 8, 32, 44],
        style: { head: [], border: ['grey'] },
        wordWrap: true,
    });
    r.busFactor.forEach((b) => {
        table.push([
            chalk_1.default.cyan(b.scope),
            (0, formatter_1.formatBusFactor)(b.busFactor),
            chalk_1.default.white(String(b.filesAtRisk)),
            chalk_1.default.white(b.atRiskAuthors.slice(0, 3).join(', ')),
            b.warning,
        ]);
    });
    console.log(table.toString());
}
function renderOwnership(r) {
    console.log((0, formatter_1.sectionHeader)('👑  OWNERSHIP  —  who truly owns each file'));
    // Show only files with a dominant owner (>= 60%) — most interesting
    const dominated = r.ownership
        .filter((o) => o.ownershipPercent >= 60)
        .slice(0, 15);
    if (dominated.length === 0) {
        console.log(chalk_1.default.grey('  No files with dominant ownership found (all well-shared).'));
        return;
    }
    const table = new cli_table3_1.default({
        head: [
            chalk_1.default.bold('File'),
            chalk_1.default.bold('Owner'),
            chalk_1.default.bold('Ownership'),
            chalk_1.default.bold('Contributors'),
        ],
        colWidths: [42, 22, 12, 42],
        style: { head: [], border: ['grey'] },
        wordWrap: true,
    });
    dominated.forEach((o) => {
        const others = o.contributors
            .slice(1, 3)
            .map((c) => `${c.name} (${c.percent}%)`)
            .join(', ');
        table.push([
            (0, formatter_1.formatPath)(o.filepath, 40),
            chalk_1.default.white(o.owner),
            (0, formatter_1.formatOwnershipPercent)(o.ownershipPercent),
            chalk_1.default.grey(others || '—'),
        ]);
    });
    console.log(table.toString());
}
function renderCoupling(r) {
    console.log((0, formatter_1.sectionHeader)('🔗  IMPLICIT COUPLING  —  files that always change together'));
    if (r.coupling.length === 0) {
        console.log(chalk_1.default.grey('  No significant file coupling detected.'));
        return;
    }
    const table = new cli_table3_1.default({
        head: [
            chalk_1.default.bold('File A'),
            chalk_1.default.bold('File B'),
            chalk_1.default.bold('Co-changes'),
            chalk_1.default.bold('Coupling'),
        ],
        colWidths: [38, 38, 12, 12],
        style: { head: [], border: ['grey'] },
        wordWrap: true,
    });
    r.coupling.slice(0, 12).forEach((c) => {
        table.push([
            (0, formatter_1.formatPath)(c.fileA, 36),
            (0, formatter_1.formatPath)(c.fileB, 36),
            chalk_1.default.white(String(c.coChanges)),
            (0, formatter_1.formatCouplingScore)(c.couplingScore),
        ]);
    });
    console.log(table.toString());
}
function renderFooter() {
    console.log('\n' + chalk_1.default.hex('#A78BFA')('─'.repeat(70)));
    console.log(chalk_1.default.grey('  ⛏  Git Archaeologist  |  github.com/SushantVerma7969/git-archaeologist'));
    console.log(chalk_1.default.hex('#A78BFA')('─'.repeat(70)) + '\n');
}
//# sourceMappingURL=terminalRenderer.js.map