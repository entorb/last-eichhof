/** Indexed read that throws instead of yielding `undefined` (noUncheckedIndexedAccess). */
export function at<T>(list: ArrayLike<T>, i: number): T {
  const v = list[i];
  if (v === undefined) {
    throw new Error(`index ${i} out of range (length ${list.length})`);
  }
  return v;
}
