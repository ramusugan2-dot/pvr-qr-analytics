import { randomInt } from "node:crypto";

// No 0/O, 1/l/I, so a code read aloud or typed by hand is not mistaken.
const ALPHABET = "23456789abcdefghijkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ";

export function generateShortCode(length = 7): string {
  let code = "";
  for (let i = 0; i < length; i++) code += ALPHABET[randomInt(ALPHABET.length)];
  return code;
}
