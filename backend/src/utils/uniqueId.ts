import { customAlphabet } from "nanoid";

// No ambiguous chars (I, O, 0, 1)
const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const generate = customAlphabet(ALPHABET, 6);

export const categoryId = (): string => `CAT-${generate()}`;
export const productId = (): string => `PRD-${generate()}`;
