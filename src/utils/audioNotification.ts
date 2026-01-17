// Utility for playing audio notifications
export const playAudioNotification = async () => {
  try {
    // Create a simple beep sound using the Web Audio API
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    
    // Create oscillator for beep sound
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    oscillator.type = 'sine';
    oscillator.frequency.value = 800; // Frequency in Hz
    gainNode.gain.value = 0.3; // Volume (0.0 to 1.0)
    
    // Set up the envelope for the beep
    const now = audioContext.currentTime;
    gainNode.gain.setValueAtTime(0.3, now);
    gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.5);
    
    oscillator.start();
    oscillator.stop(now + 0.5); // Stop after 0.5 seconds
    
    // Resume the context if it's suspended (needed for Chrome)
    if (audioContext.state === 'suspended') {
      await audioContext.resume();
    }
    
    // Wait for the sound to finish playing
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve(void 0);
      }, 500);
    });
  } catch (error) {
    console.warn('Audio notification failed:', error);
    // Fallback: try to play a system beep if available
    try {
      // On some browsers, this might trigger a system beep
      console.log('Playing audio notification fallback');
    } catch (fallbackError) {
      console.warn('Audio notification fallback also failed:', fallbackError);
    }
  }
};

// Alternative implementation using an audio file if needed
export const playAudioFileNotification = (soundFile: string = '/sounds/alert.mp3') => {
  try {
    const audio = new Audio(soundFile);
    audio.volume = 0.5;
    return audio.play().catch((error) => {
      console.warn('Audio file playback failed:', error);
    });
  } catch (error) {
    console.warn('Audio file notification failed:', error);
  }
};