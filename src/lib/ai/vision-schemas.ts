import { z } from "zod";

export const ingredientSchema = z.object({
  item_name: z.string(),
  amount: z.number().nullable(),
  unit: z.string().nullable().optional().transform((unit) => unit ?? ""),
});

export const recipeVisionSchema = z.object({
  title: z.string(),
  category: z.string(),
  prep_time_minutes: z.number().nullable(),
  servings: z.number().nullable(),
  ingredients: z.array(ingredientSchema),
  instructions: z.array(z.string()),
});

export const productVisionSchema = z.object({
  productTitle: z.string(),
  brand: z.string().nullable().optional().transform((value) => value ?? ""),
  packageSize: z.string().nullable().optional().transform((value) => value ?? ""),
  category: z.string(),
  searchKeywords: z.string().optional().default(""),
  priceEstimates: z.object({ aliexpress: z.string(), amazon: z.string(), temu: z.string() }).optional().default({ aliexpress: "", amazon: "", temu: "" }),
});