/** Generate a unique, meaningful display filename from the raw browser filename + a descriptive prefix.
 *  Format: {slug-prefix}_{YYYYMMDD}_{HHmm}{ext}
 *  e.g.  "Basement-Drawing_20260626_1430.pdf"
 */
export function makeUniqueFileName(rawFileName: string, prefix: string): string {
  const ext = rawFileName.includes('.') ? rawFileName.slice(rawFileName.lastIndexOf('.')) : '';
  const now  = new Date();
  const date = now.toISOString().slice(0, 10).replace(/-/g, '');
  const time = `${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}`;
  const slug = prefix.replace(/[^a-zA-Z0-9]+/g, '-').replace(/^-|-$/g, '') || 'file';
  return `${slug}_${date}_${time}${ext}`;
}

export const validators = {
  isValidPhone:   (val: string) => /^[6-9]\d{9}$/.test(val.trim()),
  isValidEmail:   (val: string) => /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(val.trim()),
  isValidPincode: (val: string) => /^[1-9][0-9]{5}$/.test(val.trim()),
  isValidPAN:     (val: string) => /^[A-Z]{5}[0-9]{4}[A-Z]$/.test(val.trim().toUpperCase()),
  isValidGST:     (val: string) => /^\d{2}[A-Z]{5}\d{4}[A-Z]{1}[A-Z\d]{1}[Z]{1}[A-Z\d]{1}$/.test(val.trim().toUpperCase()),
  isValidAadhaar: (val: string) => /^[2-9]\d{11}$/.test(val.trim()),
};
