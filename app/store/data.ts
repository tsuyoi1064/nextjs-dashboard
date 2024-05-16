//import { sql } from '@vercel/postgres';
import { Pool } from 'pg';
import {
  CustomerField,
  CustomersTableType,
  InvoiceForm,
  InvoicesTable,
  LatestInvoiceRaw,
  User,
  Revenue,
} from './typeDefinitions';
import { formatCurrency } from './utils';
import { unstable_noStore as noStore } from 'next/cache';

const getObjProps = <T extends Record<string, unknown>>(obj: T): void => {
  for (const key in obj) {
    const value = obj[key];
    console.log(`${key} = ${value}`);
  }
};

export async function fetchRevenue() {
  console.log(`fetchRevenue()`);
  // Add noStore() here to prevent the response from being cached.
  // This is equivalent to in fetch(..., {cache: 'no-store'}).
  noStore();
  const pool = new Pool();
  const connect = await pool.connect();
  try {
    // Artificially delay a response for demo purposes.
    // Don't do this in production :)

    console.log('Fetching revenue data...');
    await new Promise((resolve) => setTimeout(resolve, 1000));

    //const data = await sql<Revenue>`SELECT * FROM revenue`;
    const data = await connect.query<Revenue>(`
      SELECT * FROM revenue;
    `);
  
    console.log('Data fetch completed after 3 seconds.');
    console.log(data.rows);

    await connect.release();
    await pool.end();
    return data.rows;
  } catch (error) {
    await connect.release();
    await pool.end();
    console.error('Database Error:', error);
    throw new Error('Failed to fetch revenue data.');
  }
}

export async function fetchLatestInvoices() {
  console.log(`fetchLatestInvoices()`);
  noStore();
  const pool = new Pool();
  const connect = await pool.connect();
  try {
    /*
    const data = await sql<LatestInvoiceRaw>`
      SELECT invoices.amount, customers.name, customers.image_url, customers.email, invoices.id
      FROM invoices
      JOIN customers ON invoices.customer_id = customers.id
      ORDER BY invoices.date DESC
      LIMIT 5`;
    */
    const data = await connect.query<LatestInvoiceRaw>(`
      SELECT invoices.amount, customers.name, customers.image_url, customers.email, invoices.id
        FROM invoices
        JOIN customers ON invoices.customer_id = customers.id
        ORDER BY invoices.date DESC
        LIMIT 5;
    `);

    const latestInvoices = data.rows.map((invoice: any) => ({
      ...invoice,
      amount: formatCurrency(invoice.amount),
    }));

    console.log(latestInvoices);

    await connect.release();
    await pool.end();
    return latestInvoices;
  } catch (error) {
    await connect.release();
    await pool.end();
    console.error('Database Error:', error);
    throw new Error('Failed to fetch the latest invoices.');
  }
}

export async function fetchCardData() {
  console.log(`fetchCardData()`);
  noStore();
  const pool = new Pool();
  const connect = await pool.connect();
  try {
    // You can probably combine these into a single SQL query
    // However, we are intentionally splitting them to demonstrate
    // how to initialize multiple queries in parallel with JS.

    //const invoiceCountPromise = sql`SELECT COUNT(*) FROM invoices`;
    const invoiceCountPromise = await connect.query(`
      SELECT COUNT(*) FROM invoices;
    `);

    //const customerCountPromise = sql`SELECT COUNT(*) FROM customers`;
    const customerCountPromise = await connect.query(`
      SELECT COUNT(*) FROM customers;
    `);

    /*
    const invoiceStatusPromise = sql`SELECT
         SUM(CASE WHEN status = 'paid' THEN amount ELSE 0 END) AS "paid",
         SUM(CASE WHEN status = 'pending' THEN amount ELSE 0 END) AS "pending"
         FROM invoices`;
    */
    const invoiceStatusPromise = await connect.query(`
      SELECT
        SUM(CASE WHEN status = 'paid' THEN amount ELSE 0 END) AS "paid",
        SUM(CASE WHEN status = 'pending' THEN amount ELSE 0 END) AS "pending"
        FROM invoices;
    `);

    const data = await Promise.all([
      invoiceCountPromise,
      customerCountPromise,
      invoiceStatusPromise,
    ]);

    const numberOfInvoices = Number(data[0].rows[0].count ?? '0');
    const numberOfCustomers = Number(data[1].rows[0].count ?? '0');
    const totalPaidInvoices = formatCurrency(data[2].rows[0].paid ?? '0');
    const totalPendingInvoices = formatCurrency(data[2].rows[0].pending ?? '0');

    console.log(`numberOfInvoices = ${numberOfInvoices}`);
    console.log(`numberOfCustomers = ${numberOfCustomers}`);
    console.log(`totalPaidInvoices = ${totalPaidInvoices}`);
    console.log(`totalPendingInvoices = ${totalPendingInvoices}`);

    await connect.release();
    await pool.end();
    return {
      numberOfCustomers,
      numberOfInvoices,
      totalPaidInvoices,
      totalPendingInvoices,
    };
  } catch (error) {
    await connect.release();
    await pool.end();
    console.error('Database Error:', error);
    throw new Error('Failed to fetch card data.');
  }
}

const ITEMS_PER_PAGE = 6;
export async function fetchFilteredInvoices(
  query: string,
  currentPage: number,
) {
  console.log(`fetchFilteredInvoices()`);
  noStore();
  const pool = new Pool();
  const connect = await pool.connect();
  const offset = (currentPage - 1) * ITEMS_PER_PAGE;

  try {
    /*
    const invoices = await sql<InvoicesTable>`
      SELECT
        invoices.id,
        invoices.amount,
        invoices.date,
        invoices.status,
        customers.name,
        customers.email,
        customers.image_url
      FROM invoices
      JOIN customers ON invoices.customer_id = customers.id
      WHERE
        customers.name ILIKE ${`%${query}%`} OR
        customers.email ILIKE ${`%${query}%`} OR
        invoices.amount::text ILIKE ${`%${query}%`} OR
        invoices.date::text ILIKE ${`%${query}%`} OR
        invoices.status ILIKE ${`%${query}%`}
      ORDER BY invoices.date DESC
      LIMIT ${ITEMS_PER_PAGE} OFFSET ${offset}
    `;
    */
    const invoices = await connect.query<InvoicesTable>(`
    SELECT
      invoices.id,
      invoices.amount,
      invoices.date,
      invoices.status,
      customers.name,
      customers.email,
      customers.image_url
      FROM invoices
      JOIN customers ON invoices.customer_id = customers.id
      WHERE
        customers.name ILIKE '${`%${query}%`}' OR
        customers.email ILIKE '${`%${query}%`}' OR
        invoices.amount::text ILIKE '${`%${query}%`}' OR
        invoices.date::text ILIKE '${`%${query}%`}' OR
        invoices.status ILIKE '${`%${query}%`}'
      ORDER BY invoices.date DESC
      LIMIT ${ITEMS_PER_PAGE} OFFSET ${offset};
    `);

    console.log(invoices.rows);

    await connect.release();
    await pool.end();
    return invoices.rows;
  } catch (error) {
    await connect.release();
    await pool.end();
    console.error('Database Error:', error);
    throw new Error('Failed to fetch invoices.');
  }
}

export async function fetchInvoicesPages(query: string) {
  console.log(`fetchInvoicesPages()`);
  noStore();
  const pool = new Pool();
  const connect = await pool.connect();
  try {
    /*
    const count = await sql`SELECT COUNT(*)
    FROM invoices
    JOIN customers ON invoices.customer_id = customers.id
    WHERE
      customers.name ILIKE ${`%${query}%`} OR
      customers.email ILIKE ${`%${query}%`} OR
      invoices.amount::text ILIKE ${`%${query}%`} OR
      invoices.date::text ILIKE ${`%${query}%`} OR
      invoices.status ILIKE ${`%${query}%`}
    `;
    */
    const count = await connect.query(`
      SELECT COUNT(*)
      FROM invoices
      JOIN customers ON invoices.customer_id = customers.id
      WHERE
        customers.name ILIKE '${`%${query}%`}' OR
        customers.email ILIKE '${`%${query}%`}' OR
        invoices.amount::text ILIKE '${`%${query}%`}' OR
        invoices.date::text ILIKE '${`%${query}%`}' OR
        invoices.status ILIKE '${`%${query}%`}';
    `);

    const totalPages = Math.ceil(Number(count.rows[0].count) / ITEMS_PER_PAGE);
    console.log(`totalPages = ${totalPages}`);

    await connect.release();
    await pool.end();
    return totalPages;
  } catch (error) {
    await connect.release();
    await pool.end();
    console.error('Database Error:', error);
    throw new Error('Failed to fetch total number of invoices.');
  }
}

export async function fetchInvoiceById(id: string) {
  console.log(`fetchInvoiceById()`);
  noStore();
  const pool = new Pool();
  const connect = await pool.connect();
  try {
    /*
    const data = await sql<InvoiceForm>`
      SELECT
        invoices.id,
        invoices.customer_id,
        invoices.amount,
        invoices.status
      FROM invoices
      WHERE invoices.id = ${id};
    `;
    */
    const data = await connect.query<InvoiceForm>(`
      SELECT
        invoices.id,
        invoices.customer_id,
        invoices.amount,
        invoices.status
      FROM invoices
      WHERE invoices.id = '${id}';
    `);

    const invoice = data.rows.map((invoice: any) => ({
      ...invoice,
      // Convert amount from cents to dollars
      amount: invoice.amount / 100,
    }));

    // for debug
    getObjProps(invoice[0]);
    
    await connect.release();
    await pool.end();
    return invoice[0];
  } catch (error) {
    await connect.release();
    await pool.end();
    console.error('Database Error:', error);
    throw new Error('Failed to fetch invoice.');
  }
}

export async function createInvoice(
  customerId: string, 
  amountInCents: number, 
  status: string, 
  date: string
)
{
  console.log(`createInvoice()`);
  noStore();
  const pool = new Pool();
  const connect = await pool.connect();
  try {
    const user = await connect.query(`
      INSERT INTO invoices (customer_id, amount, status, date)
        VALUES ('${customerId}', ${amountInCents}, '${status}', '${date}');
    `);

    await connect.release();
    await pool.end();
  } catch (error) {
    await connect.release();
    await pool.end();
    console.error('Failed to createInvoice:', error);
    throw new Error('Failed to createInvoice.');
  }
}

export async function updateInvoice(
  id: string,
  customerId: string, 
  amountInCents: number, 
  status: string
)
{
  console.log(`updateInvoice()`);
  noStore();
  const pool = new Pool();
  const connect = await pool.connect();
  try {
    const user = await connect.query(`
      UPDATE invoices
        SET customer_id = '${customerId}', amount = ${amountInCents}, status = '${status}'
        WHERE id = '${id}';
    `);

    await connect.release();
    await pool.end();
  } catch (error) {
    await connect.release();
    await pool.end();
    console.error('Failed to updateInvoice:', error);
    throw new Error('Failed to updateInvoice.');
  }
}

export async function deleteInvoice(
  id: string
)
{
  console.log(`deleteInvoice()`);
  noStore();
  const pool = new Pool();
  const connect = await pool.connect();
  try {
    const user = await connect.query(`
      DELETE FROM invoices WHERE id = '${id}';
    `);

    await connect.release();
    await pool.end();
  } catch (error) {
    await connect.release();
    await pool.end();
    console.error('Failed to deleteInvoice:', error);
    throw new Error('Failed to deleteInvoice.');
  }
}

export async function fetchCustomers() {
  console.log(`fetchCustomers()`);
  noStore();
  const pool = new Pool();
  const connect = await pool.connect();
  try {
    /*
    const data = await sql<CustomerField>`
      SELECT
        id,
        name
      FROM customers
      ORDER BY name ASC
    `;
    */
    const data = await connect.query<CustomerField>(`
      SELECT
        id,
        name
      FROM customers
      ORDER BY name ASC;
    `);

    const customers = data.rows;
    console.log(customers);

    await connect.release();
    await pool.end();
    return customers;
  } catch (err) {
    await connect.release();
    await pool.end();
    console.error('Database Error:', err);
    throw new Error('Failed to fetch all customers.');
  }
}

export async function fetchFilteredCustomers(query: string) {
  console.log(`fetchFilteredCustomers()`);
  noStore();
  const pool = new Pool();
  const connect = await pool.connect();
  try {
    /*
    const data = await sql<CustomersTableType>`
		SELECT
		  customers.id,
		  customers.name,
		  customers.email,
		  customers.image_url,
		  COUNT(invoices.id) AS total_invoices,
		  SUM(CASE WHEN invoices.status = 'pending' THEN invoices.amount ELSE 0 END) AS total_pending,
		  SUM(CASE WHEN invoices.status = 'paid' THEN invoices.amount ELSE 0 END) AS total_paid
		FROM customers
		LEFT JOIN invoices ON customers.id = invoices.customer_id
		WHERE
		  customers.name ILIKE ${`%${query}%`} OR
        customers.email ILIKE ${`%${query}%`}
		GROUP BY customers.id, customers.name, customers.email, customers.image_url
		ORDER BY customers.name ASC
	  `;
    */
    const data = await connect.query<CustomersTableType>(`
      SELECT
        customers.id,
        customers.name,
        customers.email,
        customers.image_url,
        COUNT(invoices.id) AS total_invoices,
        SUM(CASE WHEN invoices.status = 'pending' THEN invoices.amount ELSE 0 END) AS total_pending,
        SUM(CASE WHEN invoices.status = 'paid' THEN invoices.amount ELSE 0 END) AS total_paid
      FROM customers
      LEFT JOIN invoices ON customers.id = invoices.customer_id
      WHERE
        customers.name ILIKE '${`%${query}%`}' OR
        customers.email ILIKE '${`%${query}%`}'
      GROUP BY customers.id, customers.name, customers.email, customers.image_url
      ORDER BY customers.name ASC;
    `);

    const customers = data.rows.map((customer: any) => ({
      ...customer,
      total_pending: formatCurrency(customer.total_pending),
      total_paid: formatCurrency(customer.total_paid),
    }));
    console.log(customers);

    await connect.release();
    await pool.end();
    return customers;
  } catch (err) {
    await connect.release();
    await pool.end();
    console.error('Database Error:', err);
    throw new Error('Failed to fetch customer table.');
  }
}

export async function getUser(email: string) {
  console.log(`getUser()`);
  noStore();
  const pool = new Pool();
  const connect = await pool.connect();
  try {
    //const user = await sql`SELECT * FROM users WHERE email=${email}`;
    const user = await connect.query(`
      SELECT * FROM users WHERE email='${email}';
    `);

    console.log(user.rows[0]);

    await connect.release();
    await pool.end();
    return user.rows[0] as User;
  } catch (error) {
    await connect.release();
    await pool.end();
    console.error('Failed to fetch user:', error);
    throw new Error('Failed to fetch user.');
  }
}
