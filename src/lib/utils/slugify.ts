// Slugify: convierte texto en slug url-safe. Reusable across modulos
// (storage paths, forum threads futuros, etc.).
//
// Pasos:
//   1. NFD normalize + strip diacriticos (acentos).
//   2. lowercase.
//   3. Cualquier secuencia de chars no alfanumericos -> "-".
//   4. Trim de "-" inicial/final.
//
// Sin dependencias externas (sin slugify lib) para no agregar deps.

// Rango Unicode 0x0300-0x036F = Combining Diacritical Marks (acentos
// separados de la letra base tras NFD normalize). Construimos la
// regex via new RegExp para que el escape \u quede en el source y no
// se renderice como combining mark literal (algunos editores
// corrompen caracteres combining sueltos).
const DIACRITICS = new RegExp("[\\u0300-\\u036f]", "g");

export function slugify(text: string): string {
  return text
    .normalize("NFD")
    .replace(DIACRITICS, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}
