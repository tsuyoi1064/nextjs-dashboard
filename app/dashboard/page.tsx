import { Card } from '@/app/ui/dashboard/cards';
import RevenueChart from '@/app/ui/dashboard/revenue-chart';
import LatestInvoices from '@/app/ui/dashboard/latest-invoices';
import { lusitana } from '@/app/ui/fonts';
import { headers } from 'next/headers'

export default async function Page() {
  const protocol = headers().get('x-forwarded-proto') ? 'http' : 'https'
  const host = headers().get("host");
  const res = await fetch(`${protocol}://${host}/api`);
  const movies = await res.json()
  return (
    <main>
      <h1 className={`${lusitana.className} mb-4 text-xl md:text-2xl`}>
        Dashboard
      </h1>
      <div>
        <h2 className={`${lusitana.className} mb-1 text-lg md:text-xl`}>Movies</h2>
        <p>{JSON.stringify(movies.data[0].name)}</p>
        <p>{JSON.stringify(movies.data[1].name)}</p>
        <p>{JSON.stringify(movies.data[2].name)}</p>
      </div>
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {/* <Card title="Collected" value={totalPaidInvoices} type="collected" /> */}
        {/* <Card title="Pending" value={totalPendingInvoices} type="pending" /> */}
        {/* <Card title="Total Invoices" value={numberOfInvoices} type="invoices" /> */}
        {/* <Card
          title="Total Customers"
          value={numberOfCustomers}
          type="customers"
        /> */}
      </div>
      <div className="mt-6 grid grid-cols-1 gap-6 md:grid-cols-4 lg:grid-cols-8">
        {/* <RevenueChart revenue={revenue}  /> */}
        {/* <LatestInvoices latestInvoices={latestInvoices} /> */}
      </div>
    </main>
  );
}
