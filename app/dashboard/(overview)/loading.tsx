import { Metadata } from 'next';
import DashboardSkeleton from '@/app/ui/skeletons';

export const metadata: Metadata = {
  title: 'Home',
};

export default function Loading() {
  return <DashboardSkeleton />;
}
