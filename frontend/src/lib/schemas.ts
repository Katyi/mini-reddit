import { z } from 'zod';

const emailSchema = z
  .string()
  .nonempty('Email is required')
  .email('Invalid email format');

const passwordSchema = z
  .string()
  .nonempty('Password is required')
  .min(4, 'Password must be at least 4 characters');

export const loginSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
});

export const registerSchema = z
  .object({
    username: z
      .string()
      .nonempty('Name is required')
      .min(2, 'Username must be at least 2 characters')
      .max(20, 'Username must be less than 20 characters')
      .regex(
        /^[a-zA-Z0-0_]+$/,
        'Only letters, numbers and underscores allowed',
      ),
    email: emailSchema,
    password: passwordSchema,
    confirmPassword: z
      .string()
      .nonempty('Please confirm your password')
      .min(4, 'Password must be at least 4 characters long'),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ['confirmPassword'],
  });

export const communitySchema = z.object({
  name: z
    .string()
    .nonempty('Name is required')
    .min(3, 'Name must be at least 3 characters')
    .max(21, 'Name must be 21 characters or less')
    .regex(/^[a-zA-Z0-9_]+$/, 'Only letters, numbers and underscores'),
  description: z.string().max(500, 'Description is too long').optional(),
});

export const postSchema = z.object({
  title: z.string().min(3, 'Title must be at least 3 characters').max(100),
  content: z
    .string()
    // .min(3, 'Content must be at least 3 characters')
    .optional(),
  communityId: z.string().min(1, 'Please select a community'),
});

// Типизация (чтобы не писать интерфейсы вручную)
export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
export type CommunityInput = z.infer<typeof communitySchema>;
export type PostInput = z.infer<typeof postSchema>;
