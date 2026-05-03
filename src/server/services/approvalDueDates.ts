/** Per-step SLA deadlines from request creation (staggered). */
export function buildApprovalStepDueDates(
  base: Date,
  approverCount: number,
  slaDaysPerStep: number,
): Date[] {
  const out: Date[] = [];
  for (let i = 0; i < approverCount; i++) {
    const d = new Date(base.getTime());
    d.setUTCDate(d.getUTCDate() + slaDaysPerStep * (i + 1));
    out.push(d);
  }
  return out;
}
