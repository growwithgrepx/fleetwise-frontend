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

// --- ALERT SETTINGS API ---
export interface AlertSettings {
  enable_audio_notifications: boolean;
  enable_visual_alerts: boolean;
  alert_volume: number;
  pickup_threshold_minutes: number;
  reminder_interval_minutes: number;
  max_alert_reminders: number;
  alert_history_retention_hours: number;
  trigger_frequency_minutes: number;
}

export interface GetAlertSettingsResponse {
  alert_settings: AlertSettings;
}

export async function getAlertSettings(): Promise<GetAlertSettingsResponse> {
  const res = await fetch('/api/job-monitoring/monitoring-settings', { credentials: 'include' });
  if (!res.ok) {
    // Return default settings if endpoint doesn't exist
    return {
      alert_settings: {
        enable_audio_notifications: true,
        enable_visual_alerts: true,
        alert_volume: 70,
        pickup_threshold_minutes: 15,
        reminder_interval_minutes: 10,
        max_alert_reminders: 3,
        alert_history_retention_hours: 24,
        trigger_frequency_minutes: 5
      }
    };
  }
  
  // Parse the response and ensure proper structure
  const rawData = await res.json();
  
  // Handle different response formats
  // If response has settings key, use that
  if (rawData.settings) {
    const settings = rawData.settings;
    if (settings.trigger_frequency_minutes === undefined) {
      settings.trigger_frequency_minutes = 5;
    }
    return {
      alert_settings: settings
    };
  }
  
  // If response has alert_settings key, use that
  if (rawData.alert_settings) {
    const alertSettings = rawData.alert_settings;
    if (alertSettings.trigger_frequency_minutes === undefined) {
      alertSettings.trigger_frequency_minutes = 5;
    }
    return { alert_settings: alertSettings } as GetAlertSettingsResponse;
  }
  
  // Otherwise, assume raw data is the settings
  // Ensure trigger_frequency_minutes is present with a default value if not provided by backend
  const settings = rawData;
  if (settings.trigger_frequency_minutes === undefined) {
    settings.trigger_frequency_minutes = 5;
  }
  return {
    alert_settings: settings
  };}

export async function saveAlertSettings(alertSettings: AlertSettings): Promise<{ message: string }> {
  // Prepare settings object, ensuring trigger_frequency_minutes is included
  const settingsToSend = {
    ...alertSettings,
    trigger_frequency_minutes: alertSettings.trigger_frequency_minutes !== undefined ? alertSettings.trigger_frequency_minutes : 5
  };
  
  const res = await fetch('/api/job-monitoring/monitoring-settings', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ settings: settingsToSend }),
    credentials: 'include',
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({ error: 'Failed to save alert settings' }));
    throw new Error(errorData.error || 'Failed to save alert settings');
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
