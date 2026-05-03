/** Lightweight line-level diff stats + hunks (ContextSync-compatible summary). */

export type LineDiffStats = { addedLines: number; removedLines: number; unchangedLines: number };

export type LineDiffHunk =
  | { type: "add"; lineNum: number; text: string }
  | { type: "remove"; lineNum: number; text: string };

export type LineDiffResult = {
  stats: LineDiffStats;
  hunks: LineDiffHunk[];
};

/** Myers-style LCS-based line diff bounded for typical policy text sizes. */
export function computeLineDiff(fromText: string, toText: string, maxHunks = 500): LineDiffResult {
  const a = splitLines(fromText);
  const b = splitLines(toText);
  const lcs = lcsLengths(a, b);
  let i = 0;
  let j = 0;
  let added = 0;
  let removed = 0;
  let unchanged = 0;
  const hunks: LineDiffHunk[] = [];

  const pushRemove = (lineNum: number, text: string) => {
    removed++;
    if (hunks.length < maxHunks) {
      hunks.push({ type: "remove", lineNum, text });
    }
  };
  const pushAdd = (lineNum: number, text: string) => {
    added++;
    if (hunks.length < maxHunks) {
      hunks.push({ type: "add", lineNum, text });
    }
  };

  while (i < a.length || j < b.length) {
    if (i < a.length && j < b.length && a[i] === b[j]) {
      unchanged++;
      i++;
      j++;
    } else if (j < b.length && (i === a.length || lcs[i][j + 1] >= lcs[i + 1][j])) {
      pushAdd(j + 1, b[j]);
      j++;
    } else if (i < a.length) {
      pushRemove(i + 1, a[i]);
      i++;
    }
  }

  return {
    stats: {
      addedLines: added,
      removedLines: removed,
      unchangedLines: unchanged,
    },
    hunks,
  };
}

function splitLines(s: string): string[] {
  if (s === "") {
    return [];
  }
  return s.split(/\n/);
}

function lcsLengths(a: string[], b: string[]): number[][] {
  const n = a.length + 1;
  const m = b.length + 1;
  const dp: number[][] = Array.from({ length: n }, () => Array(m).fill(0));
  for (let i = n - 2; i >= 0; i--) {
    for (let j = m - 2; j >= 0; j--) {
      dp[i][j] =
        a[i] === b[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
    }
  }
  return dp;
}
