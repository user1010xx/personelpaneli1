import { z } from "zod";

const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;

export const timeStringSchema = z
  .string()
  .regex(TIME_RE, "Saat HH:mm formatında olmalı");

export const trainingTimesSchema = z
  .object({
    startTime: timeStringSchema,
    endTime: timeStringSchema,
  })
  .refine(
    ({ startTime, endTime }) => {
      const [sh, sm] = startTime.split(":").map(Number);
      const [eh, em] = endTime.split(":").map(Number);
      return eh * 60 + em > sh * 60 + sm;
    },
    { message: "Bitiş saati başlangıçtan sonra olmalı" },
  );

export const EXPORT_ROW_LIMIT = 10_000;
export const AGGREGATE_ROW_LIMIT = 25_000;
