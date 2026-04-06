'use client';

import { useEffect } from 'react';

export default function RequestLayout({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    // Remove the ml-20 from the parent main element since sidebar is hidden
    const main = document.querySelector('main');
    if (main) {
      main.style.marginLeft = '0';
      main.style.padding = '0';
    }
    return () => {
      if (main) {
        main.style.marginLeft = '';
        main.style.padding = '';
      }
    };
  }, []);

  return <>{children}</>;
}
