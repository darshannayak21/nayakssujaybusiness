import React, { useState, useEffect } from 'react';

interface LoadingScreenProps {
  onComplete?: () => void;
  minDuration?: number; // milliseconds
}

export const LoadingScreen: React.FC<LoadingScreenProps> = ({ onComplete, minDuration = 1800 }) => {
  const fullText = "Nayak's Sujay";
  const [displayedText, setDisplayedText] = useState<string>('');
  const [showCursor, setShowCursor] = useState<boolean>(true);
  const [fadingOut, setFadingOut] = useState<boolean>(false);

  // Typewriter effect
  useEffect(() => {
    let currentIndex = 0;
    const typingInterval = setInterval(() => {
      if (currentIndex <= fullText.length) {
        setDisplayedText(fullText.slice(0, currentIndex));
        currentIndex++;
      } else {
        clearInterval(typingInterval);
      }
    }, 90);

    // Blinking cursor
    const cursorInterval = setInterval(() => {
      setShowCursor((prev) => !prev);
    }, 500);

    // Minimum display duration before fadeout
    const timer = setTimeout(() => {
      setFadingOut(true);
      setTimeout(() => {
        if (onComplete) onComplete();
      }, 400);
    }, minDuration);

    return () => {
      clearInterval(typingInterval);
      clearInterval(cursorInterval);
      clearTimeout(timer);
    };
  }, [minDuration, onComplete]);

  return (
    <div
      className={`fixed inset-0 z-50 flex flex-col items-center justify-center bg-white transition-opacity duration-400 select-none ${
        fadingOut ? 'opacity-0 pointer-events-none' : 'opacity-100'
      }`}
    >
      {/* Soft Ambient Background Glow */}
      <div className="absolute w-80 h-80 rounded-full bg-plaza-accent/10 filter blur-3xl pointer-events-none"></div>

      {/* Hotel Mandala Logo Centered */}
      <div className="relative mb-6 flex items-center justify-center">
        <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-2xl overflow-hidden shadow-card border border-plaza-line/50 p-2 bg-white flex items-center justify-center animate-pulse">
          <img
            src="/logo.png"
            alt="Nayak's Sujay Logo"
            className="w-full h-full object-contain"
          />
        </div>
      </div>

      {/* Typewriter Text "Nayak's Sujay" in Vibrant Orange */}
      <div className="text-center px-4 flex flex-col items-center justify-center">
        <div className="text-3xl sm:text-4xl md:text-5xl font-black tracking-tight text-plaza-accent font-sans h-12 sm:h-14 flex items-center justify-center">
          <span>{displayedText}</span>
          <span
            className={`inline-block w-1 sm:w-1.5 h-7 sm:h-9 ml-1.5 bg-plaza-accent rounded-full transition-opacity ${
              showCursor ? 'opacity-100' : 'opacity-0'
            }`}
          ></span>
        </div>

        {/* Minimalist Subtitle Centered */}
        <p className="text-xs sm:text-sm font-semibold text-plaza-text tracking-[0.22em] uppercase mt-2.5 text-center">
          PLAZA HOTEL DESK SYSTEM
        </p>

        {/* Elegant Animated Progress Bar Centered */}
        <div className="w-44 sm:w-52 h-1 rounded-full bg-plaza-accent-tint overflow-hidden mx-auto mt-6">
          <div className="h-full bg-plaza-accent rounded-full animate-[progress_1.8s_ease-in-out_infinite]"></div>
        </div>
      </div>
    </div>
  );
};
