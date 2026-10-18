import type { ReactNode } from 'react';

import { ServicesContext } from '@/features/services/context';
import { useServicesController } from '@/features/services/hooks/useServices';

const ServicesProvider = ({ children }: { children: ReactNode }) => {
  const value = useServicesController();

  return <ServicesContext value={value}>{children}</ServicesContext>;
};

export default ServicesProvider;
