import { z } from 'zod';

export const createOrderSchema = z.object({
  userId: z.string().min(1),
  sellerUserId: z.string().min(1),
  siteId: z.string().optional().nullable(),
  currency: z.string().default('USD'),
  items: z.array(z.object({
    productId: z.string().min(1),
    variantId: z.string().optional().nullable(),
    qty: z.number().int().positive().max(1000),
    price: z.number().int().nonnegative(), // cents
  })).min(1),
  discounts: z.array(z.object({
    code: z.string().optional(),
    type: z.enum(['Percent','Fixed']).optional(),
    amount: z.number().nonnegative().optional(),
  })).optional(),
});

export const refundSchema = z.object({
  userId: z.string().min(1),
  orderId: z.string().min(1),
  amount: z.number().int().positive(),
});

export const fulfillSchema = z.object({
  userId: z.string().min(1),
  orderId: z.string().min(1),
});

export const cancelSchema = fulfillSchema;

export const updateOrderStatusSchema = z.object({
  userId: z.string().min(1),
  orderId: z.string().min(1),
  lifecycleStatus: z.string().optional(),
  toStatus: z.string().optional(),
  refundAmount: z.number().int().positive().optional(),
  adjustments: z.array(z.object({
    type: z.string().min(1),
    amount: z.number().int().nonnegative(),
    note: z.string().optional()
  })).optional(),
  note: z.string().optional()
});

export const estimateSchema = z.object({
  subtotal: z.number().int().nonnegative().default(0),
  discountAmount: z.number().int().nonnegative().default(0),
  currency: z.string().default('USD'),
  totalWeight: z.number().int().nonnegative().optional(),
  taxCodes: z.array(z.string()).optional(),
  lineItems: z.array(z.object({
    amount: z.number().int().nonnegative(),
    quantity: z.number().int().positive().default(1),
    taxCode: z.string().optional(),
  })).optional(),
  shippingAddress: z.object({
    country: z.string().length(2).optional(),
    region: z.string().max(3).optional(),
    postalCode: z.string().optional(),
  }).optional()
});

export function validate(schema, data){
  const parsed = schema.safeParse(data);
  if(!parsed.success){
    return { error: { code:'INVALID_BODY', message:'Invalid request body', issues: parsed.error.issues.map(i => ({ path: i.path, message: i.message })) } };
  }
  return { data: parsed.data };
}
