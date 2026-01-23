import { useState, useEffect } from 'react';
import { createUser, updateUser, getUnassignedDrivers, assignCustomerOrDriver, getDriverById, getCustomerById, adminChangePassword } from '@/services/api/userApi';
import { getCustomers } from '@/services/api/customersApi';
import { User, Role } from '@/lib/types';
import { Driver } from '@/lib/types';
import { Customer } from '@/types/customer';
import { toast } from 'react-hot-toast';
import { XMarkIcon, EyeIcon, EyeSlashIcon } from '@heroicons/react/24/outline';

interface UserModalProps {
  user: User | null;
  roles: Role[];
  onClose: () => void;
  onSave: () => void;
}

export default function UserModal({ user, roles, onClose, onSave }: UserModalProps) {
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [selectedRoleId, setSelectedRoleId] = useState<number | null>(null);
  const [isActive, setIsActive] = useState(true);
  const [loading, setLoading] = useState(false);
  // Password visibility states
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  

  
  // User type linking states
  const [userType, setUserType] = useState<'driver' | 'customer' | null>(null);
  const [availableDrivers, setAvailableDrivers] = useState<Driver[]>([]);
  const [availableCustomers, setAvailableCustomers] = useState<Customer[]>([]);
  const [selectedDriverId, setSelectedDriverId] = useState<number | null>(null);
  const [selectedCustomerId, setSelectedCustomerId] = useState<number | null>(null);
  const [loadingDrivers, setLoadingDrivers] = useState(false);
  const [loadingCustomers, setLoadingCustomers] = useState(false);
  const [driversError, setDriversError] = useState<string | null>(null);
  const [customersError, setCustomersError] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      setEmail(user.email || '');
      // Initialize username with user's name field
      setUsername(user.name || '');
      setIsActive(user.active);
      // For single role selection, use the first role if available
      setSelectedRoleId(user.roles && user.roles.length > 0 ? user.roles[0].id : null);
      
      // Set user type based on existing data
      if (user.driver_id) {
        setUserType('driver');
        setSelectedDriverId(user.driver_id);
      } else if (user.customer_id) {
        setUserType('customer');
        setSelectedCustomerId(user.customer_id);
      }
    } else {
      setEmail('');
      setUsername('');
      setPassword('');
      setConfirmPassword('');
      setIsActive(true);
      setSelectedRoleId(null);
      setUserType(null);
      setSelectedDriverId(null);
      setSelectedCustomerId(null);
    }
  }, [user, roles]);

  // Fetch available drivers or customers when user type changes
  useEffect(() => {
    let isMounted = true;
    
    const fetchEntities = async () => {
      if (userType === 'driver') {
        if (isMounted) {
          setLoadingDrivers(true);
          setDriversError(null); // Clear previous errors
        }
        try {
          const drivers = await getUnassignedDrivers();
          
          // Include current driver if editing
          let finalDrivers = drivers;
          if (user?.driver_id) {
            try {
              const currentDriver = await getDriverById(user.driver_id);
              if (currentDriver && isMounted) {
                finalDrivers = [currentDriver, ...drivers.filter(d => d.id !== currentDriver.id)];
              }
            } catch (error) {
              console.error('Error fetching current driver:', error);
            }
          }
          
          if (isMounted) {
            setAvailableDrivers(finalDrivers);
          }
        } catch (error) {
          if (isMounted) {
            setDriversError('Failed to load drivers');
            toast.error('Failed to fetch unassigned drivers');
          }
        } finally {
          if (isMounted) {
            setLoadingDrivers(false);
          }
        }
      } else if (userType === 'customer') {
        if (isMounted) {
          setLoadingCustomers(true);
          setCustomersError(null); // Clear previous errors
        }
        try {
          // Fetch ALL customers instead of just unassigned ones
          const customers = await getCustomers();
          
          if (isMounted) {
            setAvailableCustomers(customers);
          }
        } catch (error) {
          if (isMounted) {
            setCustomersError('Failed to load customers');
            toast.error('Failed to fetch customers');
          }
        } finally {
          if (isMounted) {
            setLoadingCustomers(false);
          }
        }
      }
    };

    if (userType) {
      fetchEntities();
    }
    
    return () => {
      isMounted = false;
    };
  }, [userType, user?.driver_id, user?.customer_id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validation
    if (!email) {
      toast.error('Email is required');
      return;
    }
    
    if (!user && (!password || password !== confirmPassword)) {
      toast.error('Passwords must match');
      return;
    }
    
    // Validate user type selection
    if (userType && userType === 'driver' && !selectedDriverId) {
      toast.error('Please select a driver');
      return;
    }
    
    if (userType && userType === 'customer' && !selectedCustomerId) {
      toast.error('Please select a customer');
      return;
    }
    
    setLoading(true);
    
    try {
      let userId: number;
      
      // Create or update user first
      if (user) {
        // Update existing user
        const userData: any = {
          email,
          active: isActive,
          role_names: selectedRoleId ? [roles.find(role => role.id === selectedRoleId)?.name].filter(Boolean) : []
        };
        
        // Send username as 'name' field in the API payload
        const trimmedName = username.trim();
        if (trimmedName) {
          if (trimmedName.length > 255) {
            toast.error('Name cannot exceed 255 characters');
            return;
          }
          userData.name = trimmedName;
        }
        
        try {
          const updatedUser = await updateUser(user.id, userData);
          userId = updatedUser.id;
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Failed to update user';
          toast.error(errorMessage);
          throw error;
        }
        
        // Handle assignment updates for existing user
        let assignmentSuccess = false;
        let assignmentMessage = '';
        
        if (userType === 'driver' && selectedDriverId) {
          if (!user || user.driver_id !== selectedDriverId) {
            try {
              await assignCustomerOrDriver(userId, 'driver', selectedDriverId);
              assignmentSuccess = true;
            } catch (error) {
              assignmentMessage = 'User updated but driver assignment failed. Driver may be assigned already.';
              console.error('Driver assignment error:', error);
            }
          } else {
            assignmentSuccess = true; // No change needed
          }
        } else if (userType === 'customer' && selectedCustomerId) {
          if (!user || user.customer_id !== selectedCustomerId) {
            try {
              await assignCustomerOrDriver(userId, 'customer', selectedCustomerId);
              assignmentSuccess = true;
            } catch (error) {
              assignmentMessage = 'User updated but customer assignment failed. Please verify details and retry.';
              console.error('Customer assignment error:', error);
            }
          } else {
            assignmentSuccess = true; // No change needed
          }
        }
        
        // Show appropriate success message
        if (userType) {
          if (assignmentMessage) {
            toast.error('User updated successfully, but ' + assignmentMessage);
          } else {
            toast.success('User and assignment updated successfully');
          }
        } else {
          toast.success('User updated successfully');
        }
      } else {
        // Create new user
        const userData: any = {
          email,
          active: isActive,
          role_names: selectedRoleId ? [roles.find(role => role.id === selectedRoleId)?.name].filter(Boolean) : []
        };
        
        // Send username as 'name' field in the API payload
        const trimmedName = username.trim();
        if (trimmedName) {
          if (trimmedName.length > 255) {
            toast.error('Name cannot exceed 255 characters');
            return;
          }
          userData.name = trimmedName;
        }
        
        // Include password only when creating a new user
        if (password) {
          userData.password = password;
        }
        
        try {
          const newUser = await createUser(userData);
          userId = newUser.id;
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Failed to create user';
          toast.error(errorMessage);
          throw error;
        }
        
        // Handle user assignment for new user
        let assignmentMessage = '';
        
        if (userType === 'driver' && selectedDriverId) {
          try {
            await assignCustomerOrDriver(userId, 'driver', selectedDriverId);
            toast.success('User created and driver assigned successfully');
          } catch (error) {
            assignmentMessage = 'User created but driver assignment failed. Driver may be assigned already.';
            toast.error('User created successfully, but ' + assignmentMessage);
            console.error('Driver assignment error:', error);
          }
        } else if (userType === 'customer' && selectedCustomerId) {
          try {
            await assignCustomerOrDriver(userId, 'customer', selectedCustomerId);
            toast.success('User created and customer assigned successfully');
          } catch (error) {
            assignmentMessage = 'User created but customer assignment failed. Verify details and retry.';
            toast.error('User created successfully, but ' + assignmentMessage);
            console.error('Customer assignment error:', error);
          }
        } else {
          toast.success('User created successfully');
        }
      }
      
      onSave();
      onClose();
    } catch (error) {
      // Error messages are already handled above
      console.error('Error saving user:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRoleChange = (roleId: number) => {
    // For radio buttons, directly set the selected role ID
    setSelectedRoleId(roleId);
    
    // Set user type based on role
    const role = roles.find(r => r.id === roleId);
    if (role) {
      const normalizedName = role.name.trim().toLowerCase();
      if (normalizedName === 'driver') {
        setUserType('driver');
        setSelectedCustomerId(null);
      } else if (normalizedName === 'customer') {
        setUserType('customer');
        setSelectedDriverId(null);
      } else {
        setUserType(null);
        setSelectedDriverId(null);
        setSelectedCustomerId(null);
      }
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-900 border border-gray-800 rounded-lg w-full max-w-md max-h-[90vh] flex flex-col">
        <div className="flex justify-between items-center p-4 border-b border-gray-800">
          <h3 className="text-lg font-medium text-white">
            {user ? 'Edit User' : 'Create User'}
          </h3>
          <button 
            onClick={onClose}
            className="text-gray-400 hover:text-gray-200"
          >
            <XMarkIcon className="w-6 h-6" />
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-4 space-y-4 flex-1 overflow-y-auto">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              Full Name
            </label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full rounded-lg bg-gray-800 border border-gray-700 px-3 py-2 text-gray-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-lg bg-gray-800 border border-gray-700 px-3 py-2 text-gray-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              required
            />
          </div>
          
          {!user && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Password
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full rounded-lg bg-gray-800 border border-gray-700 px-3 py-2 pr-10 text-gray-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                    required={!user}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-200"
                  >
                    {showPassword ? (
                      <EyeSlashIcon className="h-5 w-5" />
                    ) : (
                      <EyeIcon className="h-5 w-5" />
                    )}
                  </button>
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Confirm Password
                </label>
                <div className="relative">
                  <input
                    type={showConfirmPassword ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full rounded-lg bg-gray-800 border border-gray-700 px-3 py-2 pr-10 text-gray-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                    required={!user}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-200"
                  >
                    {showConfirmPassword ? (
                      <EyeSlashIcon className="h-5 w-5" />
                    ) : (
                      <EyeIcon className="h-5 w-5" />
                    )}
                  </button>
                </div>
              </div>
            </>
          )}
          
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              Roles
            </label>
            <div className="space-y-2 max-h-40 overflow-y-auto p-2 bg-gray-800 rounded-lg">
              {roles.map((role) => (
                <div key={role.id} className="flex items-center">
                  <input
                    type="radio"
                    id={`role-${role.id}`}
                    name="user-role"
                    checked={selectedRoleId === role.id}
                    onChange={() => handleRoleChange(role.id)}
                    className="h-4 w-4 text-blue-600 border-gray-600 bg-gray-700 focus:ring-blue-500"
                  />
                  <label 
                    htmlFor={`role-${role.id}`} 
                    className="ml-2 text-sm text-gray-300"
                  >
                    {role.name}
                  </label>
                </div>
              ))}
            </div>
          </div>
          
          {/* User Type Linking Section */}
          {selectedRoleId && (
            <div className="border-t border-gray-700 pt-4">
              <h4 className="text-md font-medium text-white mb-2">User Type Linking</h4>
              
              {userType === 'driver' && (
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    Select Driver
                  </label>
                  {loadingDrivers ? (
                    <div className="flex justify-center py-2">
                      <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-blue-500"></div>
                    </div>
                  ) : (
                    <>
                      {driversError && (
                        <div className="text-red-400 text-sm mb-2">
                          {driversError}.{' '}
                          <button
                            onClick={() => {
                              // Trigger re-fetch by temporarily clearing userType
                              const tempUserType = userType;
                              setUserType(null);
                              setTimeout(() => setUserType(tempUserType), 0);
                            }}
                            className="text-blue-400 underline hover:text-blue-300"
                          >
                            Retry
                          </button>
                        </div>
                      )}
                      <select
                        value={selectedDriverId || ''}
                        onChange={(e) => setSelectedDriverId(Number(e.target.value) || null)}
                        className="w-full rounded-lg bg-gray-800 border border-gray-700 px-3 py-2 text-gray-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                      >
                        <option value="">Select a driver</option>
                        {availableDrivers.map((driver) => (
                          <option key={driver.id} value={driver.id}>
                            {driver.name} {driver.email ? `(${driver.email})` : ''}
                          </option>
                        ))}
                      </select>
                    </>
                  )}
                </div>
              )}
              
              {userType === 'customer' && (
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    Select Customer
                  </label>
                  {loadingCustomers ? (
                    <div className="flex justify-center py-2">
                      <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-blue-500"></div>
                    </div>
                  ) : (
                    <>
                      {customersError && (
                        <div className="text-red-400 text-sm mb-2">
                          {customersError}.{' '}
                          <button
                            onClick={() => {
                              // Trigger re-fetch by temporarily clearing userType
                              const tempUserType = userType;
                              setUserType(null);
                              setTimeout(() => setUserType(tempUserType), 0);
                            }}
                            className="text-blue-400 underline hover:text-blue-300"
                          >
                            Retry
                          </button>
                        </div>
                      )}
                      <select
                        value={selectedCustomerId || ''}
                        onChange={(e) => setSelectedCustomerId(Number(e.target.value) || null)}
                        className="w-full rounded-lg bg-gray-800 border border-gray-700 px-3 py-2 text-gray-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                      >
                        <option value="">Select a customer</option>
                        {availableCustomers.map((customer) => (
                          <option key={customer.id} value={customer.id}>
                            {customer.name} {customer.email ? `(${customer.email})` : ''}
                          </option>
                        ))}
                      </select>
                    </>
                  )}
                </div>
              )}
              
              {userType && userType !== 'driver' && userType !== 'customer' && (
                <div className="text-sm text-gray-400">
                  No additional linking required for this role type.
                </div>
              )}
            </div>
          )}
          
          <div className="flex items-center">
            <input
              type="checkbox"
              id="active"
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
              className="h-4 w-4 text-blue-600 rounded border-gray-600 bg-gray-700 focus:ring-blue-500"
            />
            <label htmlFor="active" className="ml-2 text-sm text-gray-300">
              Active
            </label>
          </div>
          

          
          <div className="flex justify-end space-x-3 pt-4 sticky bottom-0 bg-gray-900 py-4 -mx-4 px-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg bg-gray-700 hover:bg-gray-800 text-white font-medium shadow transition-colors"
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className={`px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium shadow transition-colors flex items-center ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
              disabled={loading}
            >
              {loading && (
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              )}
              {loading ? 'Saving...' : user ? 'Update' : 'Create'} User
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
