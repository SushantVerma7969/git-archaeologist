#!/usr/bin/env node
"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const commander_1 = require("commander");
const chalk_1 = __importDefault(require("chalk"));
const path = __importStar(require("path"));
const orchestrator_1 = require("./core/orchestrator");
const terminalRenderer_1 = require("./output/terminalRenderer");
const htmlReport_1 = require("./output/htmlReport");
const program = new commander_1.Command();
program
    .name('git-arch')
    .description(chalk_1.default.hex('#A78BFA')('⛏  Git Archaeologist') +
    ' — uncover history, ownership & tech debt in any git repo')
    .version('1.1.0');
program
    .command('analyze [repoPath]')
    .alias('a')
    .description('Analyze a git repository and print the full report')
    .option('-j, --json', 'Output raw JSON instead of the terminal report')
    .option('-H, --html [outputFile]', 'Generate an HTML report file')
    .action(async (repoPath, options) => {
    const resolvedPath = path.resolve(repoPath ?? '.');
    try {
        const result = await (0, orchestrator_1.analyze)(resolvedPath);
        if (options.json) {
            const serializable = {
                ...result,
                fileStats: Object.fromEntries(Array.from(result.fileStats.entries()).map(([k, v]) => [
                    k,
                    {
                        ...v,
                        uniqueAuthors: Array.from(v.uniqueAuthors),
                        authorChanges: Object.fromEntries(v.authorChanges),
                    },
                ])),
            };
            console.log(JSON.stringify(serializable, null, 2));
        }
        else if (options.html !== undefined) {
            const defaultName = `git-arch-report-${result.repoName}.html`;
            const outFile = typeof options.html === 'string' ? options.html : defaultName;
            const outPath = path.resolve(outFile);
            (0, htmlReport_1.generateHtmlReport)(result, outPath);
            (0, terminalRenderer_1.renderReport)(result);
            console.log(chalk_1.default.hex('#A78BFA')(`\n  📄 HTML report saved → ${outPath}\n`));
        }
        else {
            (0, terminalRenderer_1.renderReport)(result);
        }
    }
    catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        console.error(chalk_1.default.red('\n  ✖  Error: ') + message);
        process.exit(1);
    }
});
program
    .command('cursed [repoPath]')
    .alias('c')
    .description('Show only the cursed files ranking')
    .option('-n, --top <number>', 'How many files to show', '10')
    .action(async (repoPath, options) => {
    const resolvedPath = path.resolve(repoPath ?? '.');
    try {
        const result = await (0, orchestrator_1.analyze)(resolvedPath);
        const topN = parseInt(options.top, 10);
        result.cursedFiles = result.cursedFiles.slice(0, topN);
        (0, terminalRenderer_1.renderReport)({ ...result, busFactor: [], ownership: [], coupling: [] });
    }
    catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        console.error(chalk_1.default.red('\n  ✖  Error: ') + message);
        process.exit(1);
    }
});
program
    .action(async () => {
    const resolvedPath = path.resolve('.');
    try {
        const result = await (0, orchestrator_1.analyze)(resolvedPath);
        (0, terminalRenderer_1.renderReport)(result);
    }
    catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        console.error(chalk_1.default.red('\n  ✖  Error: ') + message);
        process.exit(1);
    }
});
program.parse(process.argv);
//# sourceMappingURL=index.js.map