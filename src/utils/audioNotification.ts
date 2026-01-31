// Utility for playing audio notifications
let audioContext: AudioContext | null = null;

export const playAudioNotification = async () => {
  try {
    // Check if audio notifications are enabled in settings
    // We'll fetch the settings and check if audio is enabled
    const response = await fetch('/api/job-monitoring/monitoring-settings', { 
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
      }
    });
    
    let audioEnabled = true; // Default to true if settings can't be fetched
    if (response.ok) {
      const settingsData = await response.json();
      const settings = settingsData.alert_settings || settingsData.settings;
      audioEnabled = settings?.enable_audio_notifications ?? true;
    }
    
    if (!audioEnabled) {
      return; // Don't play notification if disabled
    }

    // Create a simple beep sound using the Web Audio API
    if (!audioContext) {
      audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    
    // Resume the context if it's suspended (needed for Chrome)
    if (audioContext.state === 'suspended') {
      await audioContext.resume();
    }
    
    // Create oscillator for beep sound
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    oscillator.type = 'sine';
    oscillator.frequency.value = 800; // Frequency in Hz
    
    // Get volume from settings or default to 0.3
    let volume = 0.3;
    if (response.ok) {
      const settingsData = await response.json();
      const settings = settingsData.alert_settings || settingsData.settings;
      const volumeSetting = settings?.alert_volume;
      if (typeof volumeSetting === 'number') {
        volume = volumeSetting / 100; // Convert percentage to 0-1 range
      }
    }
    gainNode.gain.value = volume;
    
    // Set up the envelope for the beep
    const now = audioContext.currentTime;
    gainNode.gain.setValueAtTime(volume, now);
    gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.5);
    
    oscillator.start();
    oscillator.stop(now + 0.5); // Stop after 0.5 seconds
    
    // Wait for the sound to finish playing
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve(void 0);
      }, 500);
    });
  } catch (error) {
    console.warn('Audio notification failed:', error);
    // Fallback: try to play an audio file notification
    try {
      await playAudioFileNotification();
    } catch (fallbackError) {
      console.warn('Audio notification fallback also failed:', fallbackError);
    }
  }
};

// Alternative implementation using an audio file if needed
export const playAudioFileNotification = async (soundFile: string = '/sounds/alert.mp3') => {
  try {
    const audio = new Audio(soundFile);
    audio.volume = 0.5;
    await audio.play().catch((error) => {
      console.warn('Audio file playback failed:', error);
      throw error;
    });
  } catch (error) {
    console.warn('Audio file notification failed:', error);
    throw error;
  }
};