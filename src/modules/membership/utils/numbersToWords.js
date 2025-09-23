// utils/numbersToWords.js

/**
 * Converts the integer part of a number into its word representation in Spanish.
 * e.g., 123 -> "ciento veintitrés pesos"
 * @param {number} number - The number to convert.
 * @param {string} currency - The currency name (e.g., "pesos").
 * @returns {string} The number in words.
 */
export function numberToWords(number, currency = 'pesos') {
  const integerPart = Math.floor(number);

  if (integerPart === 0) return `cero ${currency}`;
  if (integerPart === 1) return `un ${currency}`;

  let words = '';

  if (integerPart >= 1000) {
    const thousands = Math.floor(integerPart / 1000);
    const remainder = integerPart % 1000;

    if (thousands === 1) {
      words = 'mil';
    } else {
      words = `${convertHundreds(thousands)} mil`;
    }

    if (remainder > 0) {
      words += ` ${convertHundreds(remainder)}`;
    }
  } else {
    words = convertHundreds(integerPart);
  }

  return `${words} ${currency}`;
}

/**
 * Helper function to convert a number less than 1000 to words.
 * @param {number} number - The number to convert (must be < 1000).
 * @returns {string} The number in words.
 */
function convertHundreds(number) {
  const units = ['', 'uno', 'dos', 'tres', 'cuatro', 'cinco', 'seis', 'siete', 'ocho', 'nueve'];
  const teens = ['diez', 'once', 'doce', 'trece', 'catorce', 'quince', 'dieciséis', 'diecisiete', 'dieciocho', 'diecinueve'];
  const tens = ['', '', 'veinte', 'treinta', 'cuarenta', 'cincuenta', 'sesenta', 'setenta', 'ochenta', 'noventa'];
  const hundreds = ['', 'ciento', 'doscientos', 'trescientos', 'cuatrocientos', 'quinientos', 'seiscientos', 'setecientos', 'ochocientos', 'novecientos'];

  if (number === 0) return '';
  if (number === 100) return 'cien';

  let words = '';
  const hundred = Math.floor(number / 100);
  const ten = Math.floor((number % 100) / 10);
  const unit = number % 10;

  if (hundred > 0) {
    words += hundreds[hundred];
  }

  const remainder = number % 100;
  if (remainder > 0) {
    words += (hundred > 0 ? ' ' : '');
    if (remainder < 10) {
      words += units[remainder];
    } else if (remainder < 20) {
      words += teens[remainder - 10];
    } else {
      words += tens[ten];
      if (unit > 0) {
        words += ` y ${units[unit]}`;
      }
    }
  }

  return words;
}