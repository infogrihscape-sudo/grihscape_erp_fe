export const validators = {
  isValidPhone:   (val: string) => /^[6-9]\d{9}$/.test(val.trim()),
  isValidEmail:   (val: string) => /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(val.trim()),
  isValidPincode: (val: string) => /^[1-9][0-9]{5}$/.test(val.trim()),
  isValidPAN:     (val: string) => /^[A-Z]{5}[0-9]{4}[A-Z]$/.test(val.trim().toUpperCase()),
  isValidGST:     (val: string) => /^\d{2}[A-Z]{5}\d{4}[A-Z]{1}[A-Z\d]{1}[Z]{1}[A-Z\d]{1}$/.test(val.trim().toUpperCase()),
  isValidAadhaar: (val: string) => /^[2-9]\d{11}$/.test(val.trim()),
};
