import { ServicesContext } from '@/services/context';
import { useServicesController } from '@/services/hooks/useServices';
import type { ServicesProviderProps } from '@/services/types';

const ServicesProvider = ({ children }: ServicesProviderProps) => {
  const value = useServicesController();

  return <ServicesContext value={value}>{children}</ServicesContext>;
};

export default ServicesProvider;
