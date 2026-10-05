import { z } from "zod";

export const calendarDateSchema = z.coerce.date().refine((value) => {
  const year = value.getFullYear();
  return Number.isFinite(value.getTime()) && year >= 1900 && year <= 9999;
}, "Use a date between 1900 and 9999");
