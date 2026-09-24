// Converts a number to Indian number words
// e.g. 318600 → "Three Lakh Eighteen Thousand Six Hundred Only"

const ones = [
  "", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine",
  "Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen",
  "Seventeen", "Eighteen", "Nineteen",
];
const tens = [
  "", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety",
];

function belowHundred(n: number): string {
  if (n < 20) return ones[n];
  return tens[Math.floor(n / 10)] + (n % 10 ? " " + ones[n % 10] : "");
}

function belowThousand(n: number): string {
  if (n < 100) return belowHundred(n);
  return ones[Math.floor(n / 100)] + " Hundred" + (n % 100 ? " " + belowHundred(n % 100) : "");
}

function convert(n: number): string {
  if (n === 0) return "Zero";
  let result = "";
  if (n >= 10000000) {
    result += convert(Math.floor(n / 10000000)) + " Crore ";
    n %= 10000000;
  }
  if (n >= 100000) {
    result += convert(Math.floor(n / 100000)) + " Lakh ";
    n %= 100000;
  }
  if (n >= 1000) {
    result += convert(Math.floor(n / 1000)) + " Thousand ";
    n %= 1000;
  }
  if (n > 0) {
    result += belowThousand(n);
  }
  return result.trim();
}

export function numberToWords(amount: number | string, includeRupees: boolean = false): string {
  const num = typeof amount === "string" ? parseFloat(amount) : amount;
  if (isNaN(num) || num <= 0) return "Zero Only";

  const rupees = Math.floor(num);
  const paise = Math.round((num - rupees) * 100);

  let result = convert(rupees) + (includeRupees ? " Rupees" : "");
  if (paise > 0) {
    result += " and " + convert(paise) + " Paise";
  }
  return result + " Only";
}

// Format number as Indian currency string: 318600 → "3,18,600.00"
export function formatINR(amount: number | string): string {
  const num = typeof amount === "string" ? parseFloat(amount) : amount;
  if (isNaN(num)) return "0.00";
  return new Intl.NumberFormat("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(num);
}
