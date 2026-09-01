'use client';

import { useParams } from 'next/navigation';
import { TeamUserDetail } from '@/components/whatsapp/team/TeamUserDetail';

export default function TeamUserPage() {
  const params = useParams();
  const userId = params.userId as string;

  return <TeamUserDetail userId={userId} />;
}
