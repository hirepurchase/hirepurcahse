/**
 * IMEI helpers.
 *
 * An IMEI is 15 digits, the last a Luhn check digit over the first 14, so a
 * single mistyped or misread digit (and most swapped pairs) fails the check.
 * Phone boxes carry several barcodes (IMEI 1, IMEI 2, serial number, EAN), and
 * some QR codes hold both IMEIs in one string; only numbers that pass the
 * check are treated as IMEIs.
 */

export function isValidImei(value: string): boolean {
  if (!/^\d{15}$/.test(value)) return false;
  let sum = 0;
  for (let i = 0; i < 15; i++) {
    let d = Number(value[i]);
    if (i % 2 === 1) {
      d *= 2;
      if (d > 9) d -= 9;
    }
    sum += d;
  }
  return sum % 10 === 0;
}

/** Every valid IMEI in a scanned string, in the order they appear, without repeats. */
export function extractImeis(text: string): string[] {
  const found: string[] = [];
  // Runs of exactly 15 digits, not part of a longer number.
  const runs = text.match(/(?<!\d)\d{15}(?!\d)/g) || [];
  for (const run of runs) {
    if (isValidImei(run) && !found.includes(run)) found.push(run);
  }
  return found;
}

/** For the input: a short note when what was typed looks like an IMEI but is not one. */
export function imeiWarning(value: string): string | null {
  const v = value.trim();
  if (!v || !/^\d+$/.test(v)) return null; // serial numbers with letters are left alone
  if (v.length < 15) return `${v.length} of 15 digits`;
  if (v.length > 15) return 'An IMEI has 15 digits — this has ' + v.length;
  return isValidImei(v) ? null : 'This is not a valid IMEI — check for a mistyped digit';
}
