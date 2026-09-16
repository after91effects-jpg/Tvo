import { redirect } from 'next/navigation';
import { headers } from 'next/headers';
import { getCurrentUser, isAdminRole } from '../../../lib/server/auth';
import SystemHealthLayout from './SystemHealthLayout';

export default async function AdminSystemHealthPage() {
  const headersList = await headers();
  const cookie = headersList.get('cookie') || '';
  const req = new Request('http://localhost/admin/system-health', { headers: { cookie } });
  const user = getCurrentUser(req);

  if (!user || !isAdminRole(user.role)) {
    redirect('/');
  }

  return <SystemHealthLayout />;
}
