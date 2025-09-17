'use client';

import { QueryClient } from '@tanstack/react-query';

// singleton query client used across the app
export const queryClient = new QueryClient();
