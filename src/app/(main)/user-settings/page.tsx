"use client";
import React, { useState, useEffect } from "react";
import { useUser } from "@/context/UserContext";
import { useRouter } from "next/navigation";
import { AnimatedButton } from "@/components/ui/AnimatedButton";
import { CheckCircleIcon, UserIcon, KeyIcon } from "@heroicons/react/24/outline";
import ChangePasswordForm from '@/components/ChangePasswordForm';

export default function UserSettingsPage() {
  const { user, updateUser } = useUser();
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [activeTab, setActiveTab] = useState("profile");

  // Initialize form with current user data
  useEffect(() => {
    if (user) {
      setName(user.name || user.username || user.email || "");
      setEmail(user.email || "");
    }
  }, [user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setSaveError("");
    setSaveSuccess(false);

    try {
      const response = await fetch("/api/auth/me", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({ name }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to update profile");
      }

      const userData = await response.json();
      updateUser(userData);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (error: any) {
      setSaveError(error.message || "An error occurred while saving");
    } finally {
      setIsSaving(false);
    }
  };

  if (!user) {
    return <div className="container mx-auto px-4 py-8">Loading...</div>;
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
        <div className="flex items-center mb-6">
          <div className="flex-shrink-0 w-12 h-12 rounded-full bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center">
            <UserIcon className="w-6 h-6 text-white" />
          </div>
          <div className="ml-4">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">User Settings</h1>
            <p className="text-gray-600 dark:text-gray-400">Manage your profile information and security settings</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200 dark:border-gray-700 mb-6">
          <nav className="flex space-x-8">
            <button
              onClick={() => setActiveTab("profile")}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === "profile"
                  ? "border-primary text-primary dark:text-primary"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300"
              }`}
            >
              Profile
            </button>
            <button
              onClick={() => setActiveTab("security")}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === "security"
                  ? "border-primary text-primary dark:text-primary"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300"
              }`}
            >
              Security
            </button>
          </nav>
        </div>

        {/* Profile Tab */}
        {activeTab === "profile" && (
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Full Name
              </label>
              <input
                type="text"
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary dark:bg-gray-700 dark:text-white"
                placeholder="Enter your full name"
              />
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                This name will be displayed in the application
              </p>
            </div>

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Email Address
              </label>
              <input
                type="email"
                id="email"
                value={email}
                readOnly
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 cursor-not-allowed"
                placeholder="Enter your email address"
              />
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                Your email address cannot be changed
              </p>
            </div>

            <div className="flex items-center justify-between pt-4">
              <div>
                {saveSuccess && (
                  <div className="flex items-center text-green-600 dark:text-green-400">
                    <CheckCircleIcon className="w-5 h-5 mr-1" />
                    <span>Profile updated successfully!</span>
                  </div>
                )}
                {saveError && (
                  <div className="text-red-600 dark:text-red-400">
                    Error: {saveError}
                  </div>
                )}
              </div>
              <AnimatedButton
                type="submit"
                disabled={isSaving}
                className="px-6 py-2 bg-primary hover:bg-primary/90 text-white font-medium rounded-lg transition-colors duration-200"
              >
                {isSaving ? "Saving..." : "Save Changes"}
              </AnimatedButton>
            </div>
          </form>
        )}

        {/* Security Tab */}
        {activeTab === "security" && (
          <div>
            <div className="flex items-center mb-6">
              <div className="flex-shrink-0 w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center">
                <KeyIcon className="w-5 h-5 text-white" />
              </div>
              <div className="ml-3">
                <h2 className="text-lg font-bold text-gray-900 dark:text-white">Security Settings</h2>
                <p className="text-sm text-gray-600 dark:text-gray-400">Manage your password and security preferences</p>
              </div>
            </div>
            <ChangePasswordForm />
          </div>
        )}
      </div>
    </div>
  );
}