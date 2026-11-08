import type { ReactNode } from 'react';

import { ServicesContext } from '@/services/context';
import { useServicesController } from '@/services/hooks/useServices';

const ServicesProvider = ({ children }: { children: ReactNode }) => {
  const value = useServicesController();

  return <ServicesContext value={value}>{children}</ServicesContext>;
};

export default ServicesProvider;
