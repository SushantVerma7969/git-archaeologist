# Performance & Scaling

Git Archaeologist is built to run locally on massive enterprise architectures without choking. It relies on streamed parsing rather than loading full histories into memory.

## Parser Architecture
The core engine executes a highly optimized `git log` query:
`git log --name-status --format="%H|%aN|%aE|%at|%P" --no-merges`

Instead of loading the entire JSON or text output into memory, Git Archaeologist uses a Node.js `Transform` stream. It reads the raw Git stdout buffer chunk by chunk, parses the metadata into lightweight state objects, and instantly discards the text buffer. This stream architecture guarantees that memory consumption remains nearly flat, regardless of whether the repository has 1,000 commits or 100,000 commits.

## Big O Complexity
- **`analyze`:** $O(C)$ where $C$ is the number of commits in the repository. It processes history linearly in a single pass.
- **`risk` / `ownership`:** $O(C)$. It uses the exact same single-pass streaming parser as `analyze`.
- **`blast`:** $O(C)$. Identifying coupling requires scanning all commits to find the target file, then aggregating the co-occurring files within those specific commits.

## Benchmarks & Repository Sizes Tested
We have empirically validated the tool against massive open-source repositories (refer to `BENCHMARKS.md` for raw data).

| Repository | Scale | Commits | Execution Time |
|------------|-------|---------|----------------|
| Express    | Core Infrastructure | ~6,000 | `< 2 seconds` |
| ESLint     | Enterprise Tooling | ~30,000 | `< 90 seconds` |
| OpenSauced | Modern Web App | ~4,500 | `< 10 seconds` |

*Note: Execution time is dominated strictly by the native `git log` binary resolving file paths and renames (`-M`). The Node.js stream parsing takes less than 15% of the total execution time.*

## Memory Characteristics
Because of the streaming architecture, peak heap usage rarely exceeds 150MB, even on repositories with over 10 years of history. The only data kept in memory is a hash map of unique file paths and author identities.

## Known Scaling Limits
1. **Shallow Clones:** The tool requires full commit history to function. If executed in a CI environment with `fetch-depth: 1`, it will fail to accurately calculate age decay and coupling. Always ensure `fetch-depth: 0`.
2. **Monorepo Depth:** For massive monorepos (e.g., millions of files, >500k commits), the native `git log` traversal resolving rename detection (`-M`) can take several minutes. The tool will not crash, but the execution time will scale directly with the underlying Git binary's I/O performance on the disk.
3. **Huge Co-occurrence Matrices:** If you run `blast` on a core monolithic file (like an entrypoint `index.js` touched by every commit), the resulting coupling hash map will attempt to track every other file in the repository. The algorithm prevents crashing by sorting and truncating the output, but the coupling results for such files are effectively mathematical noise.
