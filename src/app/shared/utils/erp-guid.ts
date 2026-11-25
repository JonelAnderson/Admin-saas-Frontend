/** UUID v7 for POS cart ids (must match backend ErpGuid.IsVersion7). */
export function newErpGuidV7(): string {
  const unixMs = BigInt(Date.now());
  const bytes = new Uint8Array(10);
  crypto.getRandomValues(bytes);
  const rnd = Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
  const timeHex = unixMs.toString(16).padStart(12, '0').slice(-12);
  const part1 = timeHex.slice(0, 8);
  const part2 = timeHex.slice(8, 12);
  const part3 = `7${rnd.slice(0, 3)}`;
  const part4 = `${(((parseInt(rnd.slice(3, 5), 16) & 0x3f) | 0x80).toString(16).padStart(2, '0'))}${rnd.slice(5, 7)}`;
  const part5 = rnd.slice(7, 19);
  return `${part1}-${part2}-${part3}-${part4}-${part5}`;
}
