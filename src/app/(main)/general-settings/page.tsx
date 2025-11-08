"use client";

import { useState, useEffect } from "react";
import { useTheme } from '@/context/ThemeContext';
import { useRouter } from 'next/navigation';
import {
  getUserSettings,
  saveUserSettings,
  getPhotoConfig,
  updatePhotoConfig,
  uploadImage,
  deleteImage
} from '@/services/api/settingsApi';
import { getUsers, getRoles, createUser, updateUser as updateUserService, deleteUser, createRole, updateRole as updateRoleService, deleteRole, activateUser } from '@/services/api/userApi';
import { User, Role } from '@/lib/types';
import { toast } from 'react-hot-toast';
import {
  Cog6ToothIcon,
  DevicePhoneMobileIcon,
  CreditCardIcon,
  ArrowPathIcon,
  DocumentArrowDownIcon,
  KeyIcon,
  UserIcon,
  ShieldCheckIcon,
  PlusIcon,
  PencilIcon,
  TrashIcon,
  CheckCircleIcon
} from '@heroicons/react/24/outline';
import ChangePasswordForm from '@/components/ChangePasswordForm';
import UserModal from '@/components/organisms/UserModal';
import RoleModal from '@/components/organisms/RoleModal';
import ConfirmationModal from '@/components/organisms/ConfirmationModal';

const BACKEND_URL = process.env.NEXT_PUBLIC_API_BASE_URL || process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

const settingsCategories = [
  { name: "General", icon: Cog6ToothIcon },
  { name: "Driver App", icon: DevicePhoneMobileIcon },
  { name: "Billing", icon: CreditCardIcon },
  { name: "User Management", icon: UserIcon },
  { name: "Export Database", icon: ArrowPathIcon }, // Updated name
];

const stageOptions = [
  { value: "OTW", label: "OTW (On The Way)" },
  { value: "OTS", label: "OTS (On The Spot)" },
  { value: "POB", label: "POB (Person On Board)" },
  { value: "SD", label: "SD (Stand Down)" },
  { value: "JC", label: "JC (Job Complete)" },
];


export default function SettingsPage() {
  const { theme, setTheme } = useTheme();
  const router = useRouter();
  // Modal state for image preview
  const [previewImageUrl, setPreviewImageUrl] = useState<string>("");
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);

  // Redirect logic for deep links to security section
  useEffect(() => {
    if (typeof window !== 'undefined' && window.location.hash === '#security') {
      router.push('/user-settings?tab=security');
    }
  }, [router]);

  const openImagePreview = (url: string) => {
    setPreviewImageUrl(url);
    setIsPreviewOpen(true);
  };

  const closeImagePreview = () => {
    setIsPreviewOpen(false);
    setPreviewImageUrl("");
  };

  // General Settings
  const [companyName, setCompanyName] = useState("FleetOps Management");
  const [companyWebsite, setCompanyWebsite] = useState("");
  const [websiteError, setWebsiteError] = useState("");
  const [companyAddress, setCompanyAddress] = useState("123 Fleet Street\nSan Francisco, CA 94102\nUnited States");
  const [email, setEmail] = useState("");
  const [contactNumber, setContactNumber] = useState("");
  const [timezone, setTimezone] = useState("SGT");
  const [language, setLanguage] = useState("English");

  // Website validation handler
  const handleWebsiteChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const url = e.target.value;
    setCompanyWebsite(url);
    if (url && !/^https?:\/\//.test(url)) {
      setWebsiteError("Website must start with http:// or https://");
    } else {
      setWebsiteError("");
    }
  };

  // Driver App - Photos Settings
  const defaultPhotoSettings = {
    stage: "OTS",
    maxPhotos: 3,
    maxSizeMb: 2.0, // number type
    allowedFormats: "jpg,png",
  };

  const [photoStage, setPhotoStage] = useState(defaultPhotoSettings.stage);
  const [maxPhotos, setMaxPhotos] = useState<number>(1);
  const [maxSizeMb, setMaxSizeMb] = useState<number>(1);
  const [allowedFormats, setAllowedFormats] = useState(defaultPhotoSettings.allowedFormats);

  // Billing
  const [companyLogo, setCompanyLogo] = useState<File | null>(null);
  const [billingInfo, setBillingInfo] = useState("");
  const [qrCodeImage, setQrCodeImage] = useState<File | null>(null);
  const [companyLogoUrl, setCompanyLogoUrl] = useState("");
  const [qrCodeImageUrl, setQrCodeImageUrl] = useState("");

  // GST %
  const [gstPercent, setGstPercent] = useState<number | ''>('');
  const [gstError, setGstError] = useState<string>("");

  // Export Database state
  const [tables, setTables] = useState<{index: number, name: string}[]>([]);
  const [selectedTables, setSelectedTables] = useState<number[]>([]);
  const [isLoadingTables, setIsLoadingTables] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  // User Management state
  const [users, setUsers] = useState<User[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [isRoleModalOpen, setIsRoleModalOpen] = useState(false);
  // Confirmation modal state
  const [isConfirmationModalOpen, setIsConfirmationModalOpen] = useState(false);
  const [confirmationModalData, setConfirmationModalData] = useState<{
    title: string;
    message: string;
    onConfirm: () => void;
  } | null>(null);

  const [activeCategory, setActiveCategory] = useState("General");


  // Fetch users and roles when User Management tab is active
  useEffect(() => {
    if (activeCategory === "User Management") {
      fetchUsersAndRoles();
    }
  }, [activeCategory]);

  const fetchUsersAndRoles = async () => {
    try {
      setLoadingUsers(true);
      const [usersData, rolesData] = await Promise.all([
        getUsers(),
        getRoles()
      ]);
      setUsers(usersData);
      setRoles(rolesData);
    } catch (error) {
      toast.error('Failed to fetch users and roles');
      console.error('Error fetching users and roles:', error);
    } finally {
      setLoadingUsers(false);
    }
  };

  const handleResetPhotoSettings = () => {
    setPhotoStage(defaultPhotoSettings.stage);
    setMaxPhotos(defaultPhotoSettings.maxPhotos);
    setMaxSizeMb(defaultPhotoSettings.maxSizeMb);
    setAllowedFormats(defaultPhotoSettings.allowedFormats);
    toast.success('Photo settings reset to default!');
  };

  // User Management functions
  const handleCreateUser = () => {
    setSelectedUser(null);
    setIsUserModalOpen(true);
  };

  const handleEditUser = (user: User) => {
    setSelectedUser(user);
    setIsUserModalOpen(true);
  };

  const handleDeleteUser = async (userId: number) => {
    setConfirmationModalData({
      title: 'Deactivate User',
      message: 'Are you sure you want to deactivate this user?',
      onConfirm: async () => {
        try {
          // Soft delete - make user inactive
          await updateUserService(userId, { active: false });
          toast.success('User deactivated successfully');
          fetchUsersAndRoles();
        } catch (error) {
          toast.error('Failed to deactivate user');
          console.error('Error deleting user:', error);
        }
      }
    });
    setIsConfirmationModalOpen(true);
  };

  const handleActivateUser = async (userId: number) => {
    setConfirmationModalData({
      title: 'Activate User',
      message: 'Are you sure you want to activate this user?',
      onConfirm: async () => {
        try {
          await activateUser(userId);
          toast.success('User activated successfully');
          fetchUsersAndRoles();
        } catch (error) {
          toast.error('Failed to activate user');
          console.error('Error activating user:', error);
        }
      }
    });
    setIsConfirmationModalOpen(true);
  };

  const handleCreateRole = () => {
    setSelectedRole(null);
    setIsRoleModalOpen(true);
  };

  const handleEditRole = (role: Role) => {
    setSelectedRole(role);
    setIsRoleModalOpen(true);
  };

  const handleDeleteRole = async (roleId: number) => {
    setConfirmationModalData({
      title: 'Delete Role',
      message: 'Are you sure you want to delete this role? This action cannot be undone.',
      onConfirm: async () => {
        try {
          await deleteRole(roleId);
          toast.success('Role deleted successfully');
          fetchUsersAndRoles();
        } catch (error) {
          toast.error('Failed to delete role');
          console.error('Error deleting role:', error);
        }
      }
    });
    setIsConfirmationModalOpen(true);
  };

  const getRolePermissions = (roleName: string) => {
    switch (roleName.toLowerCase()) {
      case 'admin':
        return 'Full Access';
      case 'manager':
        return 'Fleet Wise, View Report';
      case 'driver':
        return 'View Assignment, Update Status';
      default:
        return 'View Only';
    }
  };


  // Example save handler for General Settings
  const handleSaveGeneralSettings = async () => {
    const preferences = {
      general_settings: {
        company_name: companyName,
        company_website: companyWebsite,
        company_address: companyAddress,
        email_id: email,
        contact_number: contactNumber,
        timezone,
        language,
        dark_mode: theme === "dark",
      }
    };
    try {
      await saveUserSettings({ preferences });
      toast.success('General settings saved!');
    } catch (err) {
      toast.error('Failed to save general settings');
    }
  };

  // Save handler for Driver App (Photos Settings)
  const handleSavePhotoSettings = async () => {
    const preferences = {
      photo_config: {
        stage: photoStage,
        max_photos: Number(maxPhotos),
        max_size_mb: Number(maxSizeMb),
        allowed_formats: allowedFormats,
      },
    };
    try {
      await updatePhotoConfig({ preferences });
      toast.success('Photo settings saved!');
    } catch (err) {
      toast.error('Failed to save photo settings');
    }
  };

  // Save handler for Billing
  const handleSaveBilling = async () => {
    if (gstPercent !== '' && (Number.isNaN(Number(gstPercent)) || Number(gstPercent) < 0 || Number(gstPercent) > 100)) {
    setGstError("GST% must be a number between 0 and 100");
    toast.error("Fix GST% before saving");
    return;
  }
    const preferences = {
      billing_settings: {
        company_logo: companyLogoUrl.replace(BACKEND_URL, ""),
        billing_payment_info: billingInfo,
        billing_qr_code_image: qrCodeImageUrl.replace(BACKEND_URL, ""),
        gst_percent: gstPercent === '' ? 0 : Number(gstPercent),
      }
    };
    try {
      await saveUserSettings({ preferences });
      toast.success('Billing info saved!');
    } catch (err) {
      toast.error('Failed to save billing info');
    }
  };

  const handlePhotoStageChange = async (newStage: string) => {
    setPhotoStage(newStage);
    try {
      const response = await getPhotoConfig(newStage);
      const config = response.config;
      if (config) {
        setMaxPhotos(config.max_photos);
        setMaxSizeMb(config.max_size_mb);
        setAllowedFormats(config.allowed_formats);
        toast.success('Photo config loaded for selected stage!');
      } else {
        // Reset to defaults if no config found
        setMaxPhotos(defaultPhotoSettings.maxPhotos);
        setMaxSizeMb(defaultPhotoSettings.maxSizeMb);
        setAllowedFormats(defaultPhotoSettings.allowedFormats);
        toast('No config found for this stage, using defaults.');
      }
    } catch (err) {
      toast.error('Failed to fetch photo config');
      console.error(err);
    }
  };

  // Use uploadImage from settingsApi
  async function handleUploadImage(file: File, field: 'logo' | 'qr'): Promise<string> {
    try {
      const data = await uploadImage(file, field);
      return data.logo_url || data.qr_url || data.url;
    } catch (err) {
      throw new Error('Failed to upload image');
    }
  }

  useEffect(() => {
    async function fetchSettings() {
      try {
        const data = await getUserSettings();
        const prefs = data.settings?.preferences || {};

        // General Settings: handle nested preferences structure
        let general = prefs.general_settings;
        if (!general && prefs.preferences && prefs.preferences.general_settings) {
          general = prefs.preferences.general_settings;
        }
        if (!general && prefs) {
          // Try to find keys that match general settings
          general = {
            company_name: prefs.company_name,
            company_website: prefs.company_website,
            company_address: prefs.company_address,
            email_id: prefs.email_id,
            contact_number: prefs.contact_number,
            timezone: prefs.timezone,
            language: prefs.language,
            dark_mode: prefs.dark_mode,
          };
        }
        setCompanyName(general?.company_name || "");
        setCompanyWebsite(general?.company_website || "");
        setCompanyAddress(general?.company_address || "");
        setEmail(general?.email_id || "");
        setContactNumber(general?.contact_number || "");
        setTimezone(general?.timezone || "SGT");
        setLanguage(general?.language || "English");
        const savedDarkMode = !!general?.dark_mode;
        // Sync with theme context
        setTheme(savedDarkMode ? "dark" : "light");

        // Photo Config
        const photo = prefs.photo_config || {};
        setPhotoStage(photo.stage || defaultPhotoSettings.stage);
        setMaxPhotos(photo.max_photos || defaultPhotoSettings.maxPhotos);
        setMaxSizeMb(photo.max_size_mb || defaultPhotoSettings.maxSizeMb);
        setAllowedFormats(photo.allowed_formats || defaultPhotoSettings.allowedFormats);

        // Billing Settings: handle nested preferences structure
        let billing = prefs.billing_settings;
        if (!billing && prefs.preferences && prefs.preferences.billing_settings) {
          billing = prefs.preferences.billing_settings;
        }
        setBillingInfo(billing?.billing_payment_info || "");
        // Only set image URLs if path is present
        if (billing?.company_logo) {
          let logoUrl = billing.company_logo;
          if (logoUrl && !/^https?:\/\//.test(logoUrl)) {
            logoUrl = `${BACKEND_URL}${logoUrl}`;
          }
          setCompanyLogoUrl(logoUrl);
        } else {
          setCompanyLogoUrl("");
        }
        if (billing?.billing_qr_code_image) {
          let qrUrl = billing.billing_qr_code_image;
          if (qrUrl && !/^https?:\/\//.test(qrUrl)) {
            qrUrl = `${BACKEND_URL}${qrUrl}`;
          }
          setQrCodeImageUrl(qrUrl);
        } else {
          setQrCodeImageUrl("");
        }
        setGstPercent(
        typeof billing?.gst_percent === "number"
        ? billing!.gst_percent
        : (billing?.gst_percent ? Number(billing.gst_percent) : 0)
        );
      } catch (err) {
        toast.error('Failed to load settings. Please try again.');
        console.error('Settings fetch error:', err);
      }
    }
    fetchSettings();
  }, [setTheme]);

  // For Company Logo
  const handleCompanyLogoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    setCompanyLogo(file);
    if (file) {
      try {
        const logoPath = await handleUploadImage(file, 'logo');
        // If logoPath is already a full URL, use it directly; else, prepend BACKEND_URL
        let previewUrl = logoPath;
        if (logoPath && !/^https?:\/\//.test(logoPath)) {
          previewUrl = `${BACKEND_URL}${logoPath}`;
        }
        setCompanyLogoUrl(previewUrl);
        toast.success('Logo uploaded!');
      } catch (err) {
        toast.error('Failed to upload logo');
      }
    }
  };

  // For QR Code
  const handleQrCodeImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    setQrCodeImage(file);
    if (file) {
      try {
        const qrPath = await handleUploadImage(file, 'qr');
        // If qrPath is already a full URL, use it directly; else, prepend BACKEND_URL
        let previewUrl = qrPath;
        if (qrPath && !/^https?:\/\//.test(qrPath)) {
          previewUrl = `${BACKEND_URL}${qrPath}`;
        }
        setQrCodeImageUrl(previewUrl);
        toast.success('QR code uploaded!');
      } catch (err) {
        toast.error('Failed to upload QR code');
      }
    }
  };

  const extractFilename = (url) => {
    if (!url) return '';
    
    try {
      // Try to extract from /static/uploads/ path first
      if (url.includes('/static/uploads/')) {
        const parts = url.split('/static/uploads/');
        return parts.length > 1 ? parts[1] : '';
      }
      
      // Fallback: extract from full backend URL
      if (url.includes(BACKEND_URL + "/static/uploads/")) {
        return url.replace(BACKEND_URL + "/static/uploads/", "");
      }
      
      // Last resort: get the last part of the URL
      return url.split('/').pop() || '';
    } catch (error) {
      console.error('Error extracting filename:', error);
      return '';
    }
  };

  const handleRemoveCompanyLogo = async () => {
    if (companyLogoUrl) {
      // Extract filename from URL safely
      const filename = extractFilename(companyLogoUrl);
      
      if (!filename) {
        toast.error('Could not extract filename from URL');
        return;
      }
      
      try {
        await deleteImage(filename, 'company_logo');
        setCompanyLogo(null);
        setCompanyLogoUrl("");
        toast.success('Logo removed!');
      } catch (err) {
        toast.error(`Failed to remove logo: ${err instanceof Error ? err.message : 'Unknown error'}`);
      }
    }
  };

  const handleRemoveQrCodeImage = async () => {
    if (qrCodeImageUrl) {
      // Extract filename from URL safely
      const filename = extractFilename(qrCodeImageUrl);
      
      if (!filename) {
        toast.error('Could not extract filename from URL');
        return;
      }
      
      try {
        await deleteImage(filename, 'billing_qr_code_image');
        setQrCodeImage(null);
        setQrCodeImageUrl("");
        toast.success('QR code removed!');
      } catch (err) {
        toast.error(`Failed to remove QR code: ${err instanceof Error ? err.message : 'Unknown error'}`);
      }
    }
  };

  // Fetch tables when Export Database category is selected
  useEffect(() => {
    if (activeCategory === "Export Database" && tables.length === 0) {
      fetchTables();
    }
  }, [activeCategory]);

  const fetchTables = async () => {
    // Check if user has admin role before fetching tables
    try {
      const userRes = await fetch('/api/auth/me', { credentials: 'include' });
      if (!userRes.ok) {
        if (userRes.status === 401) {
          toast.error('Authentication required. Please log in.');
        } else {
          toast.error(`Failed to verify authentication: ${userRes.status} ${userRes.statusText}`);
        }
        return;
      }
      
      const userData = await userRes.json();
      const user = userData.response?.user || userData.user || userData || {};
      
      // Check roles in different possible locations
      const roles = user.roles || user.response?.roles || [];
      
      // Check if user has admin role (handle different role structures)
      const normalizedRoles = Array.isArray(roles) ? roles : (roles ? [roles] : []);
      const isAdmin = normalizedRoles.some((role: any) => {
        const roleName = typeof role === 'string' ? role : (role?.name || role?.role || '');
        return roleName.toLowerCase() === 'admin';
      });
      
      if (!isAdmin) {
        toast.error('Admin privileges required to access database export functionality');
        return;
      }
    } catch (error) {
      toast.error('Failed to verify user permissions');
      console.error('Error verifying user permissions:', error);
      return;
    }
    
    setIsLoadingTables(true);
    try {
      const response = await fetch('/api/db/tables', {
        credentials: 'include'
      });
      
      // Check if response is HTML (redirect to login page)
      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('text/html')) {
        toast.error('Session expired or not authenticated. Please log in again.');
        // Optionally redirect to login page
        // window.location.href = '/login';
        return;
      }
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      if (data.success) {
        setTables(data.tables);
      } else {
        toast.error(data.error || 'Failed to fetch tables');
      }
    } catch (error) {
      toast.error('Error fetching tables: ' + (error.message || 'Network error'));
      console.error('Error fetching tables:', error);
      setTables([]);
    } finally {
      setIsLoadingTables(false);
    }
  };

  const handleTableSelection = (index: number) => {
    setSelectedTables(prev => 
      prev.includes(index) 
        ? prev.filter(i => i !== index) 
        : [...prev, index]
    );
  };

  const handleSelectAll = () => {
    if (selectedTables.length === tables.length) {
      // If all selected, deselect all
      setSelectedTables([]);
    } else {
      // Select all
      setSelectedTables(tables.map(t => t.index));
    }
  };

  const handleExport = async () => {
    if (selectedTables.length === 0) {
      toast.error('Please select at least one table');
      return;
    }

    // Check if user has admin role before exporting
    try {
      const userRes = await fetch('/api/auth/me', { credentials: 'include' });
      if (!userRes.ok) {
        if (userRes.status === 401) {
          toast.error('Authentication required. Please log in.');
        } else {
          toast.error(`Failed to verify authentication: ${userRes.status} ${userRes.statusText}`);
        }
        return;
      }
      
      const userData = await userRes.json();
      const user = userData.response?.user || userData.user || userData || {};
      
      // Check roles in different possible locations
      const roles = user.roles || user.response?.roles || [];
      
      // Check if user has admin role (handle different role structures)
      const normalizedRoles = Array.isArray(roles) ? roles : (roles ? [roles] : []);
      const isAdmin = normalizedRoles.some((role: any) => {
        const roleName = typeof role === 'string' ? role : (role?.name || role?.role || '');
        return roleName.toLowerCase() === 'admin';
      });
      
      if (!isAdmin) {
        toast.error('Admin privileges required to access database export functionality');
        return;
      }
    } catch (error) {
      toast.error('Failed to verify user permissions');
      console.error('Error verifying user permissions:', error);
      return;
    }

    setIsExporting(true);
    try {
      const response = await fetch('/api/db/export', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          table_indices: selectedTables
        }),
      });

      // Check if response is HTML (redirect to login page)
      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('text/html')) {
        toast.error('Session expired or not authenticated. Please log in again.');
        // Optionally redirect to login page
        // window.location.href = '/login';
        setIsExporting(false);
        return;
      }

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      if (data.success) {
        // Instead of fetching the file, we can directly navigate to the download URL
        // This approach is more reliable and handles CORS better
        window.open(data.download_url, '_blank');
        
        toast.success('Export completed successfully!');
      } else {
        toast.error(data.error || 'Export failed');
      }
    } catch (error) {
      toast.error('Export failed: ' + (error.message || 'Network error'));
      console.error('Export error:', error);
    } finally {
      setIsExporting(false);
    }
  };


  return (
    <div className="min-h-screen bg-gray-950 text-gray-200">
      {/* Header */}
      <header className="bg-gray-900 border border-gray-800 px-6 py-4 ml-8 mr-12 mt-4 rounded-lg">
        <div className="flex items-center space-x-3">
          <Cog6ToothIcon className="w-8 h-8 text-blue-400" />
          <div>
            <h1 className="text-2xl font-bold text-blue-400">Admin Settings</h1>
            <p className="text-sm text-gray-400">Configure your FleetOps management system settings</p>
          </div>
        </div>
      </header>

      <div className="flex ml-8 mr-12 mb-4 gap-4 mt-4">
        {/* Sidebar */}
        <aside className="w-72 bg-gray-900 border border-gray-800 hidden md:flex flex-col rounded-lg min-h-[700px]">
          <h2 className="p-4 text-lg font-semibold text-white border-b border-gray-800">
            Settings Categories
          </h2>
          <nav className="flex-1 px-2 py-4 space-y-1">
            {settingsCategories.map((category) => {
              const IconComponent = category.icon;
              return (
                <button
                  key={category.name}
                  onClick={() => setActiveCategory(category.name)}
                  className={`w-full text-left px-4 py-3 rounded-lg transition-colors flex items-center space-x-3 ${
                    activeCategory === category.name
                      ? "bg-blue-600 text-white"
                      : "hover:bg-gray-800 text-gray-300"
                  }`}
                >
                  <IconComponent className="w-5 h-5 flex-shrink-0" />
                  <span className="whitespace-nowrap">{category.name}</span>
                </button>
              );
            })}
          </nav>
        </aside>

        {/* Main content */}
        <main className="flex-1 p-6 bg-gray-900 border border-gray-800 rounded-lg min-h-[700px]">
          <div className="min-h-[600px]">
            {activeCategory === "General" && (
              <div>
                <h2 className="text-2xl font-bold mb-6 text-white">
                  General Settings
                </h2>
            <form className="space-y-6">
              {/* Company Name and Website - Side by Side */}
              <div className="w-full max-w-[700px]">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2 text-gray-300">
                      Company Name
                    </label>
                    <input
                      type="text"
                      value={companyName}
                      onChange={(e) => setCompanyName(e.target.value)}
                      className="w-full rounded-lg bg-gray-800 border border-gray-700 px-3 py-2 text-gray-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2 text-gray-300">
                      Company Website
                    </label>
                    <input
                      type="url"
                      value={companyWebsite}
                      onChange={handleWebsiteChange}
                      placeholder="https://example.com"
                      className="w-full rounded-lg bg-gray-800 border border-gray-700 px-3 py-2 text-gray-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                    />
                    {websiteError && <p className="text-sm text-red-400 mt-1">{websiteError}</p>}
                  </div>
                </div>
              </div>

              {/* Email ID and Contact Number - Side by Side */}
              <div className="w-full max-w-[700px]">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-sm font-medium mb-2 text-gray-300">
                      Email ID
                    </label>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full rounded-lg bg-gray-800 border border-gray-700 px-3 py-2 text-gray-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2 text-gray-300">
                      Contact Number
                    </label>
                    <input
                      type="tel"
                      value={contactNumber}
                      onChange={(e) => setContactNumber(e.target.value)}
                      className="w-full rounded-lg bg-gray-800 border border-gray-700 px-3 py-2 text-gray-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                    />
                  </div>
                </div>
              </div>
              
              {/* Timezone and Language - Side by Side */}
              <div className="w-full max-w-[700px]">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-sm font-medium mb-2 text-gray-300">
                      Timezone
                    </label>
                    <select
                      value={timezone}
                      onChange={(e) => setTimezone(e.target.value)}
                      className="w-full rounded-lg bg-gray-800 border border-gray-700 px-3 py-2 text-gray-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                    >
                      <option value="SGT">SGT (Singapore Standard Time)</option>
                      <option value="PST">PST (Pacific Standard Time)</option>
                      <option value="EST">EST (Eastern Standard Time)</option>
                      <option value="CET">CET (Central European Time)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2 text-gray-300">
                      Language
                    </label>
                    <select
                      value={language}
                      onChange={(e) => setLanguage(e.target.value)}
                      className="w-full rounded-lg bg-gray-800 border border-gray-700 px-3 py-2 text-gray-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                    >
                      <option value="English">English</option>
                      <option value="German">German</option>
                      <option value="Spanish">Spanish</option>
                    </select>
                  </div>
                </div>
              </div>
              
              {/* Company Address */}
              <div>
                <label className="block text-sm font-medium mb-2 text-gray-300">
                  Company Address
                </label>
                <textarea
                  value={companyAddress}
                  onChange={(e) => setCompanyAddress(e.target.value)}
                  rows={3}
                  className="w-full max-w-[700px] rounded-lg bg-gray-800 border border-gray-700 px-3 py-2 text-gray-200 resize-vertical focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                />
              </div>
              
              {/* Enable Dark Mode */}
              <div>
                <label className="block text-sm font-medium mb-2 text-gray-300">
                  Enable Dark Mode
                </label>
                <div className="flex items-center">
                  <button
                    type="button"
                    onClick={() => {
                      setTheme(theme === "dark" ? "light" : "dark");
                    }}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-gray-800 ${
                      theme === "dark" ? 'bg-blue-600' : 'bg-gray-600'
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        theme === "dark" ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>
              </div>
              
              {/* Buttons */}
              <div className="flex gap-3 pt-6">
                <button
                  type="button"
                  onClick={handleSaveGeneralSettings}
                  className="flex items-center space-x-2 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium shadow transition-colors"
                >
                  <DocumentArrowDownIcon className="w-4 h-4" />
                  <span>Save General Settings</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setCompanyName("FleetOps Management");
                    setCompanyAddress("123 Fleet Street\nSan Francisco, CA 94102\nUnited States");
                    setEmail("");
                    setContactNumber("");
                    setTimezone("SGT");
                    setLanguage("English");
                    setTheme("dark");
                    toast.success('Settings reset to defaults!');
                  }}
                  className="flex items-center space-x-2 px-4 py-2 rounded-lg bg-gray-700 hover:bg-gray-800 text-white font-medium shadow transition-colors"
                >
                  <ArrowPathIcon className="w-4 h-4" />
                  <span>Reset to Defaults</span>
                </button>
              </div>
            </form>
          </div>
        )}

        {activeCategory === "Driver App" && (
          <div>
            <h2 className="text-2xl font-bold mb-6 text-white">
              Driver App Settings
            </h2>
            <form className="space-y-6">
              {/* Stage Dropdown */}
              <div>
                <label className="block text-sm font-medium mb-2 text-gray-300">
                  Stage
                </label>
                <select
                  value={photoStage}
                  onChange={(e) => handlePhotoStageChange(e.target.value)}
                  className="w-full max-w-[700px] rounded-lg bg-gray-800 border border-gray-700 px-3 py-2 text-gray-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                >
                  {stageOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
              {/* Max Photos */}
              <div>
                <label className="block text-sm font-medium mb-2 text-gray-300">
                  Max Photos
                </label>
                <input
                  type="number"
                  min={1}
                  max={10}
                  value={maxPhotos === 0 ? '' : maxPhotos}
                  onChange={(e) => {
                    // Allow empty string while editing
                    const val = e.target.value;
                    setMaxPhotos(val === '' ? 0 : Math.max(0, Number(val)));
                  }}
                  onBlur={() => {
                    // Enforce minimum value on blur
                    if (maxPhotos < 1) setMaxPhotos(1);
                    if (maxPhotos > 10) setMaxPhotos(10);
                  }}
                  className="w-full max-w-[700px] rounded-lg bg-gray-800 border border-gray-700 px-3 py-2 text-gray-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                />
                <p className="text-xs text-gray-400 mt-1">
                  Example: Minimum 1 photo, maximum 10 photos allowed.
                </p>
              </div>
              {/* Max Size (MB) */}
              <div>
                <label className="block text-sm font-medium mb-2 text-gray-300">
                  Max Size (MB)
                </label>
                <input
                  type="number"
                  min={1}
                  step={0.1}
                  value={maxSizeMb === 0 ? '' : maxSizeMb}
                  onChange={(e) => {
                    // Allow empty string while editing
                    const val = e.target.value;
                    setMaxSizeMb(val === '' ? 0 : Math.max(0, Number(val)));
                  }}
                  onBlur={() => {
                    // Enforce minimum value on blur
                    if (maxSizeMb < 1) setMaxSizeMb(1);
                  }}
                  className="w-full max-w-[700px] rounded-lg bg-gray-800 border border-gray-700 px-3 py-2 text-gray-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                />
              </div>
              {/* Allowed Formats */}
              <div>
                <label className="block text-sm font-medium mb-2 text-gray-300">
                  Allowed Formats
                </label>
                <input
                  type="text"
                  value={allowedFormats}
                  onChange={(e) => setAllowedFormats(e.target.value)}
                  className="w-full max-w-[700px] rounded-lg bg-gray-800 border border-gray-700 px-3 py-2 text-gray-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                />
                <p className="text-xs text-gray-400 mt-1">
                  Example: jpg,png,gif
                </p>
              </div>
              {/* Buttons */}
              <div className="flex gap-3 pt-6">
                <button
                  type="button"
                  onClick={handleSavePhotoSettings}
                  className="flex items-center space-x-2 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium shadow transition-colors"
                >
                  <DocumentArrowDownIcon className="w-4 h-4" />
                  <span>Save Photo Settings</span>
                </button>
                <button
                  type="button"
                  onClick={handleResetPhotoSettings}
                  className="flex items-center space-x-2 px-4 py-2 rounded-lg bg-gray-700 hover:bg-gray-800 text-white font-medium shadow transition-colors"
                >
                  <ArrowPathIcon className="w-4 h-4" />
                  <span>Reset to Default</span>
                </button>
              </div>
            </form>
          </div>
        )}

        {activeCategory === "Billing" && (
          <div>
            <h2 className="text-2xl font-bold mb-6 text-white">
              Billing Settings
            </h2>
            <form className="space-y-6">
              {/* Company Logo */}
              <div className="w-1/3">
                <label className="block text-sm font-medium mb-2 text-gray-300">
                  Company Logo
                </label>
                <div className="flex items-center gap-2">
                  <div className="flex items-center justify-center w-16 h-16 rounded-lg border-2 border-dashed border-gray-700 bg-gray-800 hover:border-blue-500">
                    {companyLogoUrl ? (
                      <img
                        src={companyLogoUrl}
                        alt="Company Logo"
                        className="w-full h-full object-contain rounded-lg cursor-pointer"
                        onClick={() => openImagePreview(companyLogoUrl)}
                      />
                    ) : (
                      <label htmlFor="company-logo-upload" className="w-full h-full flex items-center justify-center cursor-pointer">
                        <span className="text-2xl text-gray-400">+</span>
                      </label>
                    )}
                    <input
                      id="company-logo-upload"
                      type="file"
                      accept="image/*"
                      onChange={handleCompanyLogoChange}
                      className="hidden"
                    />
                  </div>
                  {companyLogoUrl && (
                    <button
                      type="button"
                      onClick={handleRemoveCompanyLogo}
                      className="text-xs text-red-400 hover:underline"
                    >
                      Remove
                    </button>
                  )}
                </div>
              </div>

              {/* Billing QR Code Image */}
              <div className="w-1/3">
                <label className="block text-sm font-medium mb-2 text-gray-300">
                  Billing QR Code Image
                </label>
                <div className="flex items-center gap-2">
                  <div className="flex items-center justify-center w-16 h-16 rounded-lg border-2 border-dashed border-gray-700 bg-gray-800 hover:border-blue-500">
                    {qrCodeImageUrl ? (
                      <img
                        src={qrCodeImageUrl}
                        alt="QR Code"
                        className="w-full h-full object-contain rounded-lg cursor-pointer"
                        onClick={() => openImagePreview(qrCodeImageUrl)}
                      />
                    ) : (
                      <label htmlFor="qr-code-upload" className="w-full h-full flex items-center justify-center cursor-pointer">
                        <span className="text-2xl text-gray-400">+</span>
                      </label>
                    )}
                    <input
                      id="qr-code-upload"
                      type="file"
                      accept="image/*"
                      onChange={handleQrCodeImageChange}
                      className="hidden"
                    />
                  </div>
                  {qrCodeImageUrl && (
                    <button
                      type="button"
                      onClick={handleRemoveQrCodeImage}
                      className="text-xs text-red-400 hover:underline"
                    >
                      Remove
                    </button>
                  )}
                </div>
              </div>
              {/* GST % */}
<div className="w-full max-w-[350px]">
  <label className="block text-sm font-medium mb-2 text-gray-300">
    GST %
  </label>
  <input
    type="number"
    placeholder="0"
    value={gstPercent === '' ? '' : gstPercent}
    min={0}
    max={100}
    step={0.01}
    onChange={(e) => {
      const v = e.target.value;
      // allow empty while typing
      if (v === '') {
        setGstPercent('');
        setGstError("");
        return;
      }
      const n = Number(v);
      if (Number.isNaN(n)) {
        setGstError("Please enter a valid number");
      } else if (n < 0 || n > 100) {
        setGstError("GST% must be between 0 and 100");
      } else {
        // keep only 2 decimals
        const fixed = Math.round(n * 100) / 100;
        setGstPercent(fixed);
        setGstError("");
      }
    }}
    onBlur={() => {
      if (gstPercent === '') { setGstPercent(0); setGstError(""); }
    }}
    className="w-full rounded-lg bg-gray-800 border border-gray-700 px-3 py-2 text-gray-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
  />
  <p className={`text-xs mt-1 ${gstError ? 'text-red-400' : 'text-gray-400'}`}>
    {gstError || "Enter a percentage between 0 and 100 (e.g., 8 or 8.00)."}
  </p>
</div>


              {/* Billing Payment Info */}
              <div>
                <label className="block text-sm font-medium mb-2 text-gray-300">
                  Billing Payment Info
                </label>
                <textarea
                  value={billingInfo}
                  onChange={(e) => setBillingInfo(e.target.value)}
                  rows={7}
                  className="w-full max-w-[700px] rounded-lg bg-gray-800 border border-gray-700 px-3 py-2 text-gray-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                />
              </div>

      {/* Image Preview Modal */}
      {isPreviewOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-70" onClick={closeImagePreview}>
          <div className="bg-gray-900 rounded-lg p-4 shadow-lg relative" style={{ maxWidth: '90vw', maxHeight: '90vh' }} onClick={e => e.stopPropagation()}>
            <img src={previewImageUrl} alt="Preview" className="max-w-full max-h-[80vh] rounded-lg" />
            <button
              onClick={closeImagePreview}
              className="absolute top-2 right-2 text-white bg-gray-700 rounded-full px-2 py-1 hover:bg-gray-800"
            >
              Close
            </button>
          </div>
        </div>
      )}
              {/* Buttons */}
              <div className="flex gap-3 pt-6">
                <button
                  type="button"
                  onClick={handleSaveBilling}
                  className="flex items-center space-x-2 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium shadow transition-colors"
                >
                  <DocumentArrowDownIcon className="w-4 h-4" />
                  <span>Save Billing Info</span>
                </button>
              </div>
            </form>
          </div>
        )}

        {activeCategory === "Security" && (
          <div>
            <h2 className="text-2xl font-bold mb-6 text-white">
              Security Settings
            </h2>
            <ChangePasswordForm />
          </div>
        )}

        {activeCategory === "User Management" && (
          <div>
            {loadingUsers ? (
              <div className="flex justify-center items-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Users Section */}
                <div>
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-xl font-bold text-white">Users</h3>
                    <button
                      onClick={handleCreateUser}
                      className="flex items-center space-x-2 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium shadow transition-colors"
                    >
                      <PlusIcon className="w-4 h-4" />
                      <span>Add User</span>
                    </button>
                  </div>
                  <div className="bg-gray-900 border border-gray-800 rounded-lg p-6">
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-gray-700">
                        <thead>
                          <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                              Email
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                              Role
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                              Linked To
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                              Status
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                              Actions
                            </th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-800">
                          {users.map((user) => (
                            <tr key={user.id}>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="text-sm text-white">{user.email}</div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="text-sm text-gray-300">
                                  {user.roles?.map((role) => role.name).join(', ') || '-'}
                                </div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="text-sm text-gray-300">
                                  {user.driver ? user.driver.name : user.customer ? user.customer.name : 'N/A'}
                                </div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                                  user.active
                                    ? 'bg-green-900 text-green-200'
                                    : 'bg-red-900 text-red-200'
                                }`}>
                                  {user.active ? 'Active' : 'Inactive'}
                                </span>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                <div className="flex space-x-3">
                                  <button
                                    onClick={() => handleEditUser(user)}
                                    className="text-blue-400 hover:text-blue-300"
                                  >
                                    <PencilIcon className="w-5 h-5" />
                                  </button>
                                  {user.active ? (
                                    <button
                                      onClick={() => handleDeleteUser(user.id)}
                                      className="text-red-400 hover:text-red-300"
                                    >
                                      <TrashIcon className="w-5 h-5" />
                                    </button>
                                  ) : (
                                    <button
                                      onClick={() => handleActivateUser(user.id)}
                                      className="text-green-400 hover:text-green-300"
                                    >
                                      <CheckCircleIcon className="w-5 h-5" />
                                    </button>
                                  )}
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>

                {/* Roles & Permissions Section */}
                <div>
                  <h3 className="text-xl font-bold text-white mb-4">Roles & Permissions</h3>
                  <div className="bg-gray-900 border border-gray-800 rounded-lg p-6">
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-gray-700">
                        <thead>
                          <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                              Role
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                              Users
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                              Permissions
                            </th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-800">
                          {roles.map((role) => (
                            <tr key={role.id}>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="text-sm font-medium text-white">{role.name}</div>
                                {role.description && (
                                  <div className="text-sm text-gray-400">{role.description}</div>
                                )}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="text-sm text-gray-300">
                                  {role.users?.length || 0} users
                                </div>
                              </td>
                              <td className="px-6 py-4">
                                <div className="text-sm text-gray-300">
                                  {getRolePermissions(role.name)}
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {activeCategory === "Export Database" && (
          <div>
            <h2 className="text-2xl font-bold mb-6 text-white">
              Export Database
            </h2>
            <div className="space-y-6">
              <div className="bg-gray-800 rounded-lg p-4">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-medium text-white">Database Tables</h3>
                  <button
                    onClick={fetchTables}
                    disabled={isLoadingTables}
                    className="flex items-center space-x-2 px-3 py-1 rounded bg-gray-700 hover:bg-gray-600 text-white text-sm disabled:opacity-50"
                  >
                    {isLoadingTables ? (
                      <>
                        <ArrowPathIcon className="w-4 h-4 animate-spin" />
                        <span>Loading...</span>
                      </>
                    ) : (
                      <>
                        <ArrowPathIcon className="w-4 h-4" />
                        <span>Refresh</span>
                      </>
                    )}
                  </button>
                </div>
                
                {isLoadingTables ? (
                  <div className="flex justify-center items-center h-32">
                    <ArrowPathIcon className="w-8 h-8 animate-spin text-blue-500" />
                  </div>
                ) : tables.length > 0 ? (
                  <>
                    <div className="mb-4">
                      <button
                        onClick={handleSelectAll}
                        className="text-sm text-blue-400 hover:text-blue-300"
                      >
                        {selectedTables.length === tables.length ? 'Deselect All' : 'Select All'}
                      </button>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 max-h-96 overflow-y-auto">
                      {tables.map((table) => (
                        <div 
                          key={table.index}
                          className={`flex items-center p-3 rounded-lg border cursor-pointer transition-colors ${
                            selectedTables.includes(table.index)
                              ? 'bg-blue-900/30 border-blue-500'
                              : 'bg-gray-700/50 border-gray-600 hover:bg-gray-700'
                          }`}
                          onClick={() => handleTableSelection(table.index)}
                        >
                          <input
                            type="checkbox"
                            checked={selectedTables.includes(table.index)}
                            className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                            readOnly
                          />
                          <div className="ml-3">
                            <div className="text-sm font-medium text-white">{table.name}</div>
                            <div className="text-xs text-gray-400">Index: {table.index}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                    
                    <div className="mt-6 flex items-center justify-between">
                      <div className="text-sm text-gray-300">
                        {selectedTables.length} of {tables.length} tables selected
                      </div>
                      <button
                        onClick={handleExport}
                        disabled={selectedTables.length === 0 || isExporting}
                        className="flex items-center space-x-2 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium shadow transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {isExporting ? (
                          <>
                            <ArrowPathIcon className="w-4 h-4 animate-spin" />
                            <span>Exporting...</span>
                          </>
                        ) : (
                          <>
                            <DocumentArrowDownIcon className="w-4 h-4" />
                            <span>Export Selected Tables</span>
                          </>
                        )}
                      </button>
                    </div>
                  </>
                ) : (
                  <div className="text-center py-8 text-gray-400">
                    <p>No tables found. Click refresh to load tables.</p>
                  </div>
                )}
              </div>
              
              <div className="bg-gray-800 rounded-lg p-4">
                <h3 className="text-lg font-medium text-white mb-2">How to use</h3>
                <ul className="text-sm text-gray-300 space-y-1">
                  <li>• Select one or more tables from the list above</li>
                  <li>• Click &quot;Export Selected Tables&quot; to download an Excel file</li>
                  <li>• The Excel file will contain each table in a separate sheet</li>
                  <li>• Check your browser&apos;s download folder for the file (it may open in a new tab)</li>
                </ul>
              </div>
            </div>
          </div>
        )}

        {/* User Modal */}
        {isUserModalOpen && (
          <UserModal
            user={selectedUser}
            roles={roles}
            onClose={() => setIsUserModalOpen(false)}
            onSave={fetchUsersAndRoles}
          />
        )}

        {/* Role Modal */}
        {isRoleModalOpen && (
          <RoleModal
            role={selectedRole}
            onClose={() => setIsRoleModalOpen(false)}
            onSave={fetchUsersAndRoles}
          />
        )}

        {/* Confirmation Modal */}
        {isConfirmationModalOpen && confirmationModalData && (
          <ConfirmationModal
            isOpen={isConfirmationModalOpen}
            onClose={() => setIsConfirmationModalOpen(false)}
            onConfirm={confirmationModalData.onConfirm}
            title={confirmationModalData.title}
            message={confirmationModalData.message}
          />
        )}
          </div>
        </main>
      </div>
    </div>
  );
}
