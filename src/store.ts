import type { Payment } from "./types";

// Único source of truth em memória
export const payments = new Map<string, Payment>();
