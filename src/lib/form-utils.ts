// Native number inputs report an empty field as NaN via valueAsNumber, but
// zod's .optional() only accepts undefined as "no value" — passing this as
// react-hook-form's setValueAs converts empty/invalid input to undefined
// instead, so optional numeric fields validate correctly when left blank.
export function numeric(raw: unknown): number | undefined {
  if (raw === "" || raw === null || raw === undefined) return undefined;
  const n = Number(raw);
  return Number.isNaN(n) ? undefined : n;
}
