export interface IdentityInput {
    email: string;
    name: string;
}
export interface IdentityMerge {
    canonical: string;
    name: string;
    members: string[];
}
export interface IdentityResult {
    emailToCanonical: Map<string, string>;
    merges: IdentityMerge[];
}
export interface BuildIdentityOptions {
    mergeGroups?: string[][];
    splitEmails?: string[];
}
export declare function buildIdentityMap(identities: IdentityInput[], options?: BuildIdentityOptions): IdentityResult;
export declare function loadIdentityOverrides(repoPath: string): BuildIdentityOptions;
//# sourceMappingURL=identity.d.ts.map