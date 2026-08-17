// Types for agents-block-body.mjs, so TypeScript callers (the Electron main's
// Connect flow) can import the canonical body without `allowJs`. Hand-written
// because the source is a plain .mjs in `scripts/`, which is deliberately
// dependency-free and has no build step.

/** The managed block's opening marker. */
export declare const START: string;
/** The managed block's closing marker. */
export declare const END: string;
/** The managed block's body — everything between the two markers. */
export declare const BLOCK_BODY: string;
