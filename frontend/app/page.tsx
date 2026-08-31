import { Suspense } from 'react';
import { HomePageClient } from '@/components/auth/HomePageClient';

function HomeLoading() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-whatsapp-light/30 via-background to-background">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-whatsapp border-t-transparent" />
    </div>
  );
}

export default function HomePage() {
  return (
    <Suspense fallback={<HomeLoading />}>
      <HomePageClient />
    </Suspense>
  );
}
