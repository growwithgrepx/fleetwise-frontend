import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { useRouter } from 'next/navigation';


interface UserContextType {
  user: any;
  isLoggedIn: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => Promise<void>;
  updateUser: (userData: any) => void;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export function UserProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<any>(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();


  // Check session on mount
  useEffect(() => {
    async function checkSession() {
      try {
        const res = await fetch('/api/auth/me', { 
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
          }
        });
        
        // Check if response is OK (2xx status)
        if (res.ok) {
          const data = await res.json();
          // Extract user data from response
          const userData = data.response?.user || data.user || data || null;
          // Verify presence of required identity fields to prevent setting authenticated state with incomplete user data
          if (userData && (userData.id || userData.email)) {
            setUser(userData);
            setIsLoggedIn(true);
          } else {
            console.warn('Invalid user data received:', userData);
            setUser(null);
            setIsLoggedIn(false);
          }
        } else if (res.status === 401) {
          // Not authenticated
          setUser(null);
          setIsLoggedIn(false);
        } else {
          // Other error
          console.error('Failed to fetch user data:', res.status, res.statusText);
          setUser(null);
          setIsLoggedIn(false);
        }
      } catch (error) {
        console.error('Error checking session:', error);
        setUser(null);
        setIsLoggedIn(false);
      } finally {
        setIsLoading(false);
      }
    }
    checkSession();
  }, []);

  // Login using backend session
  const login = async (email: string, password: string) => {
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
        credentials: 'include',
      });
      
      if (res.ok) {
        // After successful login, fetch user info
        const meRes = await fetch('/api/auth/me', { 
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
          }
        });
        
        if (meRes.ok) {
          const data = await meRes.json();
          // Extract user data from response
          const userData = data.response?.user || data.user || data || null;
          // Verify presence of required identity fields to prevent setting authenticated state with incomplete user data
          if (userData && (userData.id || userData.email)) {
            setUser(userData);
            setIsLoggedIn(true);

            return true;
          } else {
            console.warn('Invalid user data received during login:', userData);
            setUser(null);
            setIsLoggedIn(false);
            return false;
          }

        }
      }
      
      setUser(null);
      setIsLoggedIn(false);
      return false;
    } catch (error) {
      console.error('Login error:', error);
      setUser(null);
      setIsLoggedIn(false);
      return false;
    }
  };

  // Logout using backend session
  const logout = async () => {
    try {
      await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'include',
      });
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      setUser(null);
      setIsLoggedIn(false);
      router.replace('/login');
    }
  };

  // Update user data
  const updateUser = (userData: any) => {
    setUser(userData);
  };

  return (
    <UserContext.Provider value={{ user, isLoggedIn, isLoading, login, logout, updateUser }}>
      {children}
    </UserContext.Provider>
  );
}

export function useUser() {
  const context = useContext(UserContext);
  if (!context) {
    throw new Error('useUser must be used within a UserProvider');
  }
  return context;
}