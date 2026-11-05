import React from 'react';
import { SignIn } from '@clerk/clerk-react';

export const LoginView: React.FC = () => {
  return (
    <div className="min-h-screen bg-[#FDFBF7] flex flex-col items-center justify-center p-4 relative overflow-hidden select-none">
      {/* Background ambient lighting */}
      <div className="absolute w-[500px] h-[500px] rounded-full bg-plaza-accent/5 filter blur-3xl pointer-events-none top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"></div>

      {/* Brand Header */}
      <div className="text-center mb-6 relative z-10">
        <div className="w-20 h-20 sm:w-24 sm:h-24 mx-auto rounded-2xl overflow-hidden border border-plaza-line/60 p-2 bg-white shadow-card mb-4 flex items-center justify-center">
          <img
            src="/logo.png"
            alt="Nayak's Sujay Logo"
            className="w-full h-full object-contain"
          />
        </div>
        <h1 className="text-xl sm:text-2xl font-black uppercase tracking-[0.14em] text-plaza-accent leading-none">
          NAYAK'S SUJAY
        </h1>
        <p className="text-xs sm:text-sm font-bold text-plaza-text tracking-tight mt-1">
          Reception & Administration Portal
        </p>
        <p className="text-[11px] text-plaza-text-3 mt-0.5">
          Secure authorized access only · Rooms 101 – 303
        </p>
      </div>

      {/* Clerk SignIn Container */}
      <div className="relative z-10 w-full max-w-[420px] flex justify-center">
        <SignIn
          appearance={{
            variables: {
              colorPrimary: '#F26B1D',
              colorText: '#111111',
              colorTextSecondary: '#6B6B6B',
              colorBackground: '#FFFFFF',
              colorInputBackground: '#FFFFFF',
              colorInputText: '#111111',
              borderRadius: '12px',
              fontFamily: 'Inter, -apple-system, sans-serif',
            },
            elements: {
              rootBox: 'w-full',
              card: 'border border-plaza-line/70 shadow-card rounded-2xl p-6 sm:p-7 bg-white',
              headerTitle: 'text-lg font-bold text-plaza-text',
              headerSubtitle: 'text-xs text-plaza-text-3',
              socialButtonsBlockButton: 'rounded-xl border border-plaza-line hover:bg-plaza-card',
              formButtonPrimary: 'bg-plaza-accent hover:bg-plaza-accent-hover text-white text-xs font-bold py-2.5 rounded-xl shadow-xs transition active:scale-[0.98]',
              formFieldInput: 'rounded-xl border border-plaza-line focus:border-plaza-accent focus:ring-1 focus:ring-plaza-accent text-xs py-2 px-3',
              // CRITICAL: Strictly hide any sign up or registration option
              footerAction: 'hidden',
              footer: 'hidden',
            },
          }}
          routing="hash"
        />
      </div>
    </div>
  );
};
