import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, Location } from '../types';
import { API_BASE } from '../config';

interface AuthContextType {
  user: User | null;
  activeLocation: Location | null;
  setActiveLocation: (location: Location) => void;
  loginAs: (role: 'ADMIN' | 'MANAGER' | 'STAFF') => Promise<void>;
  logout: () => void;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [activeLocation, setActiveLocation] = useState<Location | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Auto-login with default admin on mount
  useEffect(() => {
    loginAs('ADMIN');
  }, []);

  const loginAs = async (role: 'ADMIN' | 'MANAGER' | 'STAFF') => {
    setIsLoading(true);
    try {
      const emailMap = {
        ADMIN: 'admin@astrava.io',
        MANAGER: 'manager@astrava.io',
        STAFF: 'staff@astrava.io',
      };

      const res = await fetch(`${API_BASE}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: emailMap[role],
          password: 'password123',
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setUser(data.user);
        if (data.user.locations?.length > 0) {
          // Keep current active location if still accessible, else pick first
          setActiveLocation((prev) => {
            const hasAccess = data.user.locations.some((l: Location) => l.id === prev?.id);
            return hasAccess ? prev : data.user.locations[0];
          });
        }
      } else {
        // Fallback for development before backend boots
        const mockOrg = { id: 'org-1', name: 'ASTRAVA Global Logistics' };
        const mockLocations: Location[] = [
          { id: 'loc-dc', name: 'Main Distribution Center', code: 'DC-01', isActive: true },
          { id: 'loc-store', name: 'Downtown Retail Flagship', code: 'STORE-01', isActive: true },
          { id: 'loc-west', name: 'West Coast Transit Hub', code: 'WH-WEST', isActive: true },
        ];

        const mockUser: User = {
          id: role === 'ADMIN' ? 'usr-admin' : role === 'MANAGER' ? 'usr-manager' : 'usr-staff',
          email: `${role.toLowerCase()}@astrava.io`,
          fullName: role === 'ADMIN' ? 'Karan Patel (Admin)' : role === 'MANAGER' ? 'Elena Vance (Manager)' : 'Marcus Brody (Staff)',
          role,
          organizationId: mockOrg.id,
          organizationName: mockOrg.name,
          locations: mockLocations,
          defaultLocationId: mockLocations[0].id,
        };

        setUser(mockUser);
        setActiveLocation(mockLocations[0]);
      }
    } catch (err) {
      console.warn('API connection offline; running in interactive client demo mode');
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    setUser(null);
    setActiveLocation(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        activeLocation,
        setActiveLocation,
        loginAs,
        logout,
        isLoading,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};
