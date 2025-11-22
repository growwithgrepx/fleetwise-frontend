// Email Settings Interfaces
export interface EmailSettings {
  smtp_host: string;
  smtp_port: string;
  use_tls: boolean;
  use_ssl: boolean;
  username: string;
  password: string;
  sender_email: string;
  is_encrypted?: boolean;
}

export interface EmailSettingsResponse {
  email_settings: EmailSettings;
}

export interface SaveEmailResponse {
  message: string;
}

export interface TestEmailPayload {
  email_settings: EmailSettings;
  test_recipient?: string;
}

export async function getUserSettings() {
  const res = await fetch('/api/settings/user', { credentials: 'include' });
  if (!res.ok) throw new Error('Failed to fetch user settings');
  return res.json();
}

export async function saveUserSettings(preferences: any) {
  const res = await fetch('/api/settings/user', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ preferences }),
    credentials: 'include',
  });
  if (!res.ok) throw new Error('Failed to save user settings');
  return res.json();
}

export async function getPhotoConfig(stage: string) {
  const res = await fetch(`/api/settings/photo_config?stage=${encodeURIComponent(stage)}`, {
    method: 'GET',
    credentials: 'include',
  });
  if (!res.ok) throw new Error('Failed to fetch photo config');
  return res.json();
}

export async function updatePhotoConfig(photoConfig: any) {
  // Accepts either { preferences: { photo_config: { ... } } } or { stage, max_photos, ... }
  let payload = photoConfig;
  // If called as { preferences: { photo_config: { ... } } }, flatten it
  if (photoConfig.preferences && photoConfig.preferences.photo_config) {
    payload = { ...photoConfig.preferences.photo_config };
  }
  const res = await fetch('/api/settings/photo_config', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
    credentials: 'include',
  });
  if (!res.ok) throw new Error('Failed to update photo config');
  return res.json();
}

export async function uploadImage(file: File, field: 'logo' | 'qr') {
  const formData = new FormData();
  formData.append(field, file);
  const res = await fetch('/api/settings/upload_file', {
    method: 'POST',
    body: formData,
    credentials: 'include',
  });
  if (!res.ok) throw new Error('Failed to upload image');
  return res.json();
}

export async function deleteImage(filename: string, field: string) {
  const res = await fetch('/api/settings/delete_file', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ filename, field }),
    credentials: 'include',
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({ error: 'Failed to delete image' }));
    throw new Error(errorData.error || 'Failed to delete image');
  }
  return res.json();
}

// --- EMAIL SETTINGS API ---
export async function getEmailSettings(): Promise<EmailSettingsResponse> {
  const res = await fetch('/api/settings/email', { credentials: 'include' });
  if (!res.ok) throw new Error('Failed to fetch email settings');
  return res.json();
}

export async function saveEmailSettings(emailSettings: EmailSettings): Promise<SaveEmailResponse> {
  const res = await fetch('/api/settings/email', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email_settings: emailSettings }),
    credentials: 'include',
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({ error: 'Failed to save email settings' }));
    throw new Error(errorData.error || 'Failed to save email settings');
  }
  return res.json();
}

export async function testEmailSettings(payload: TestEmailPayload): Promise<SaveEmailResponse> {
  const res = await fetch('/api/settings/email/test', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
    credentials: 'include',
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({ error: 'Failed to send test email' }));
    throw new Error(errorData.error || 'Failed to send test email');
  }
  return res.json();
}
