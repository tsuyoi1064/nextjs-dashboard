'use server';

import { z } from 'zod';
import { createInvoice, updateInvoice, deleteInvoice } from '@/app/store/data';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { signIn } from '@/auth';
import { AuthError } from 'next-auth';

const FormSchema = z.object({
    id: z.string(),
    customerId: z.string({
      invalid_type_error: 'Please select a customer.',
    }),
    amount: z.coerce
    .number()
    .gt(0, { message: 'Please enter an amount greater than $0.' }),    // Validation after convert to numbers
    status: z.enum(['pending', 'paid'], {
      invalid_type_error: 'Please select an invoice status.',
    }),   // Enumeration validation
    date: z.string(),
  });

// Remove property from Object schema
const CreateInvoiceData = FormSchema.omit({ id: true, date: true });
const UpdateInvoiceData = FormSchema.omit({ id: true, date: true });

export type State = {
  errors?: {
    customerId?: string[];
    amount?: string[];
    status?: string[];
  };
  message?: string | null;
};

export async function createInvoiceData(prevState: State, formData: FormData) {
  // Validate form using Zod
  const validatedFields = CreateInvoiceData.safeParse({
    customerId: formData.get('customerId'),
    amount: formData.get('amount'),
    status: formData.get('status'),
  });

  // If form validation fails, return errors early. Otherwise, continue.
  if (!validatedFields.success) {
    return {
      errors: validatedFields.error.flatten().fieldErrors,
      message: 'Missing Fields. Failed to Create Invoice.',
    };
  }

    // Prepare data for insertion into the database
    const { customerId, amount, status } = validatedFields.data;
    const amountInCents = amount * 100;    // Convert $ to ￠ because avoid JavaScript floating-point errors
    const date = new Date().toISOString().split('T')[0];    // "YYYY-MM-DD"

    try {
      await createInvoice(customerId, amountInCents, status, date);
    } catch (error) {
      return {
        message: 'Database Error: Failed to Create Invoice.',
      };
    }
    revalidatePath('/dashboard/invoices');
    redirect('/dashboard/invoices');
}

export async function updateInvoiceData(
  id: string,
  prevState: State,
  formData: FormData,
) {
  const validatedFields = UpdateInvoiceData.safeParse({
    customerId: formData.get('customerId'),
    amount: formData.get('amount'),
    status: formData.get('status'),
  });
 
  if (!validatedFields.success) {
    return {
      errors: validatedFields.error.flatten().fieldErrors,
      message: 'Missing Fields. Failed to Update Invoice.',
    };
  }
 
  const { customerId, amount, status } = validatedFields.data;
  const amountInCents = amount * 100;
 
  try {
    await updateInvoice(id, customerId, amountInCents, status);
  } catch (error) {
    return { message: 'Database Error: Failed to Update Invoice.' };
  }
  revalidatePath('/dashboard/invoices');
  redirect('/dashboard/invoices');
}

export async function deleteInvoiceData(id: string) {
  // error test
  //throw new Error('Failed to Delete Invoice');

  try {
    await deleteInvoice(id);
  } catch (error) {
    return { message: 'Database Error: Failed to Delete Invoice.' };
  }
  revalidatePath('/dashboard/invoices');
}

export async function authenticate(
  prevState: string | undefined,
  formData: FormData,
) {
  try {
    await signIn('credentials', formData);
  } catch (error) {
    if (error instanceof AuthError) {
      switch (error.type) {
        case 'CredentialsSignin':
          return 'Invalid credentials.';
        default:
          return 'Something went wrong.';
      }
    }
    throw error;
  }
}