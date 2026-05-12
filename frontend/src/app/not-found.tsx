'use client';
import Link from 'next/link';

export default function NotFound() {
  return (
    <div className='min-h-screen bg-navy-900 flex items-center justify-center p-4'>
      <div className='glass p-8 max-w-sm w-full text-center'>
        <p className='text-6xl font-bold gradient-text mb-3'>404</p>
        <h1 className='text-xl font-bold text-white mb-2'>Page not found</h1>
        <p className='text-white/50 text-sm mb-6'>This page does not exist.</p>
        <Link href='/dashboard' className='btn-primary px-6 py-3 inline-flex items-center justify-center text-sm rounded-xl'>Go to Dashboard</Link>
      </div>
    </div>
  );
}
