import { createContext } from 'react';

import type { UseServicesResult } from '@/services/types';

export const ServicesContext = createContext<UseServicesResult | null>(null);
