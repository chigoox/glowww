'use client';

import { AuthProvider } from "../../contexts/AuthContext";
import { PagesProvider } from "./utils/context/PagesContext";

/**
 * Client-side wrapper for providers to prevent hydration mismatch
 * This component ensures all provider logic runs only on the client
 */
export function ClientProviders({ children }) {
  return (
    <AuthProvider>
      <PagesProvider>
        {children}
      </PagesProvider>
    </AuthProvider>
  );
}
