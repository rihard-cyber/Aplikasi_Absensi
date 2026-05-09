import { useCallback } from 'react';

// Create a singleton AudioContext so we don't recreate it on every hook call
let audioCtx = null;

export const useSFX = () => {
  const initAudio = () => {
    if (!audioCtx) {
      audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
  };

  const playClick = useCallback(() => {
    try {
      initAudio();
      if (audioCtx.state === 'suspended') audioCtx.resume();

      const oscillator = audioCtx.createOscillator();
      const gainNode = audioCtx.createGain();

      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(800, audioCtx.currentTime);
      oscillator.frequency.exponentialRampToValueAtTime(1200, audioCtx.currentTime + 0.05);

      gainNode.gain.setValueAtTime(0.1, audioCtx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.05);

      oscillator.connect(gainNode);
      gainNode.connect(audioCtx.destination);

      oscillator.start();
      oscillator.stop(audioCtx.currentTime + 0.05);
    } catch (e) {
      console.warn("Audio play failed", e);
    }
  }, []);

  const playHover = useCallback(() => {
    try {
      initAudio();
      if (audioCtx.state === 'suspended') audioCtx.resume();

      const oscillator = audioCtx.createOscillator();
      const gainNode = audioCtx.createGain();

      oscillator.type = 'triangle';
      oscillator.frequency.setValueAtTime(400, audioCtx.currentTime);
      
      gainNode.gain.setValueAtTime(0.02, audioCtx.currentTime);
      gainNode.gain.linearRampToValueAtTime(0, audioCtx.currentTime + 0.03);

      oscillator.connect(gainNode);
      gainNode.connect(audioCtx.destination);

      oscillator.start();
      oscillator.stop(audioCtx.currentTime + 0.03);
    } catch (e) {
      console.warn("Audio play failed", e);
    }
  }, []);

  const playAlert = useCallback(() => {
    try {
      initAudio();
      if (audioCtx.state === 'suspended') audioCtx.resume();

      const oscillator = audioCtx.createOscillator();
      const gainNode = audioCtx.createGain();

      oscillator.type = 'square';
      oscillator.frequency.setValueAtTime(300, audioCtx.currentTime);
      oscillator.frequency.setValueAtTime(450, audioCtx.currentTime + 0.1);
      
      gainNode.gain.setValueAtTime(0.1, audioCtx.currentTime);
      gainNode.gain.linearRampToValueAtTime(0, audioCtx.currentTime + 0.3);

      oscillator.connect(gainNode);
      gainNode.connect(audioCtx.destination);

      oscillator.start();
      oscillator.stop(audioCtx.currentTime + 0.3);
    } catch (e) {
      console.warn("Audio play failed", e);
    }
  }, []);

  const playConfirm = useCallback(() => {
    try {
      initAudio();
      if (audioCtx.state === 'suspended') audioCtx.resume();

      const osc1 = audioCtx.createOscillator();
      const osc2 = audioCtx.createOscillator();
      const gainNode = audioCtx.createGain();

      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(600, audioCtx.currentTime);
      osc1.frequency.linearRampToValueAtTime(800, audioCtx.currentTime + 0.1);

      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(800, audioCtx.currentTime + 0.1);
      osc2.frequency.linearRampToValueAtTime(1200, audioCtx.currentTime + 0.2);

      gainNode.gain.setValueAtTime(0, audioCtx.currentTime);
      gainNode.gain.linearRampToValueAtTime(0.1, audioCtx.currentTime + 0.05);
      gainNode.gain.setValueAtTime(0.1, audioCtx.currentTime + 0.15);
      gainNode.gain.linearRampToValueAtTime(0, audioCtx.currentTime + 0.25);

      osc1.connect(gainNode);
      osc2.connect(gainNode);
      gainNode.connect(audioCtx.destination);

      osc1.start(audioCtx.currentTime);
      osc1.stop(audioCtx.currentTime + 0.1);
      osc2.start(audioCtx.currentTime + 0.1);
      osc2.stop(audioCtx.currentTime + 0.25);
    } catch (e) {
      console.warn("Audio play failed", e);
    }
  }, []);

  return { playClick, playHover, playAlert, playConfirm };
};
