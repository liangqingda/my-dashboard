import { createContext } from 'react';

import type { UseServicesResult } from '@/features/services/hooks/useServices';

export const ServicesContext = createContext<UseServicesResult | null>(null);
