'use client';

import React, { useState, useEffect, useRef } from 'react';
import { MapPin, X, CheckCircle2, AlertCircle, Loader2, ChevronDown, Navigation } from 'lucide-react';
import { useCart } from '../../context/CartContext';
import { DEFAULT_STORE_SETTINGS } from '../../lib/seedData';

// Coordinates for supported delivery areas in Delhi NCR
const SUPPORTED_COORDINATES: Record<string, { lat: number; lng: number }> = {
  'Gurugram': { lat: 28.4595, lng: 77.0266 },
  'Delhi NCR': { lat: 28.6139, lng: 77.2090 },
  'Noida': { lat: 28.5355, lng: 77.3910 },
  'Faridabad': { lat: 28.4089, lng: 77.3178 },
  'Ghaziabad': { lat: 28.6692, lng: 77.4538 },
  'Greater Noida': { lat: 28.4744, lng: 77.5040 },
};

function calculateDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371; // Earth radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

interface LocationPinServiceBarProps {
  isDesktop?: boolean;
}

export function LocationPinServiceBar({ isDesktop = false }: LocationPinServiceBarProps) {
  const { deliveryCity, setDeliveryCity } = useCart();

  // Anchored dropdown states
  const [isCityDropdownOpen, setIsCityDropdownOpen] = useState(false);
  const [isPinDropdownOpen, setIsPinDropdownOpen] = useState(false);

  // GPS detection state
  const [isDetecting, setIsDetecting] = useState(false);
  const [locationStatusMessage, setLocationStatusMessage] = useState<string | null>(null);

  // PIN code check states
  const [pinInput, setPinInput] = useState('');
  const [isCheckingPin, setIsCheckingPin] = useState(false);
  const [pinValidationState, setPinValidationState] = useState<
    'idle' | 'empty' | 'invalid' | 'serviceable' | 'not_serviceable'
  >('idle');
  const [pinResponseMessage, setPinResponseMessage] = useState('');
  const [pinDeliveryDetails, setPinDeliveryDetails] = useState<{
    zone?: string;
    city?: string;
    estDeliveryTime?: string;
    fee?: number;
    freeThreshold?: number;
  } | null>(null);
  const [verifiedPin, setVerifiedPin] = useState<string | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const pinInputRef = useRef<HTMLInputElement>(null);

  // Safe focus management without jumping/scrolling the page
  useEffect(() => {
    if (isPinDropdownOpen) {
      setTimeout(() => {
        pinInputRef.current?.focus({ preventScroll: true });
      }, 50);
    }
  }, [isPinDropdownOpen]);

  // Click outside to close anchored dropdowns (preserves scroll position)
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent | TouchEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsCityDropdownOpen(false);
        setIsPinDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside, { passive: true });
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, []);

  // Handle ESC key to close dropdowns
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsCityDropdownOpen(false);
        setIsPinDropdownOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Current Location detection logic
  const handleDetectLocation = () => {
    if (!navigator.geolocation) {
      setLocationStatusMessage('Geolocation is not supported by your browser. Please select a city.');
      setIsCityDropdownOpen(true);
      return;
    }

    setIsDetecting(true);
    setLocationStatusMessage(null);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setIsDetecting(false);
        const { latitude, longitude } = position.coords;

        // Find nearest supported city
        let closestCity = 'Gurugram';
        let minDistance = Infinity;

        for (const [cityName, coords] of Object.entries(SUPPORTED_COORDINATES)) {
          const dist = calculateDistanceKm(latitude, longitude, coords.lat, coords.lng);
          if (dist < minDistance) {
            minDistance = dist;
            closestCity = cityName;
          }
        }

        // Fresh bakery deliveries are within 50 km of city center
        if (minDistance <= 50) {
          setDeliveryCity(closestCity);
          setLocationStatusMessage(`Location detected: ${closestCity} (within delivery zone)`);
          setIsCityDropdownOpen(false);
          setTimeout(() => setLocationStatusMessage(null), 4000);
        } else {
          // User is outside supported area (e.g. outside NCR)
          setLocationStatusMessage(
            `You appear to be outside our fresh delivery zone (~${Math.round(minDistance)} km away). Please pick a delivery city:`
          );
          setIsCityDropdownOpen(true);
        }
      },
      (error) => {
        setIsDetecting(false);
        if (error.code === error.PERMISSION_DENIED) {
          setLocationStatusMessage('Location permission denied. Please select your delivery city manually.');
        } else {
          setLocationStatusMessage('Could not retrieve location. Please select your delivery city manually.');
        }
        setIsCityDropdownOpen(true);
      },
      { timeout: 10000, enableHighAccuracy: false }
    );
  };

  // PIN Code check logic
  const handleCheckPin = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    const trimmed = pinInput.trim();

    // 1. Empty state
    if (!trimmed) {
      setPinValidationState('empty');
      setPinResponseMessage('Please enter your 6-digit PIN code.');
      setPinDeliveryDetails(null);
      return;
    }

    // 2. Format validation: exactly 6 digits
    if (!/^\d{6}$/.test(trimmed)) {
      setPinValidationState('invalid');
      setPinResponseMessage('Please enter a valid 6-digit PIN code.');
      setPinDeliveryDetails(null);
      return;
    }

    // 3. Check availability via backend API
    setIsCheckingPin(true);
    setPinValidationState('idle');
    setPinResponseMessage('');

    try {
      const res = await fetch(`/api/delivery?action=pincode&code=${encodeURIComponent(trimmed)}`);
      const data = await res.json();

      if (data && data.available) {
        setPinValidationState('serviceable');
        setPinResponseMessage('Great! We deliver to this PIN code.');
        setVerifiedPin(trimmed);
        setPinDeliveryDetails({
          zone: data.zone,
          city: data.city,
          estDeliveryTime: data.est_delivery_time,
          fee: data.fee,
          freeThreshold: data.free_delivery_threshold,
        });

        // If the API returns a recognized city, update the cart delivery city
        if (data.city && DEFAULT_STORE_SETTINGS.deliveryCities.includes(data.city)) {
          setDeliveryCity(data.city);
        }
      } else {
        setPinValidationState('not_serviceable');
        setPinResponseMessage('Sorry, delivery is currently unavailable for this PIN code.');
        setPinDeliveryDetails(null);
      }
    } catch {
      setPinValidationState('not_serviceable');
      setPinResponseMessage('Sorry, delivery is currently unavailable for this PIN code.');
      setPinDeliveryDetails(null);
    } finally {
      setIsCheckingPin(false);
    }
  };

  // Helper renderer: City selection list
  const renderCityList = (onClose: () => void) => (
    <>
      <div className="flex items-center justify-between pb-2 border-b border-[var(--border)]/40 mb-3">
        <div>
          <h3 className="text-sm font-bold text-[var(--text-main)]">
            Select Delivery City
          </h3>
          <p className="text-[11px] text-[var(--text-muted)]">
            Serving Gurugram &amp; Delhi NCR
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="p-1 rounded-full hover:bg-[var(--bg-subtle)] text-[var(--text-muted)] hover:text-[var(--text-main)] cursor-pointer"
          aria-label="Close location dropdown"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* GPS Auto-Detect Button */}
      <button
        type="button"
        onClick={() => {
          handleDetectLocation();
        }}
        disabled={isDetecting}
        className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-xl bg-[#FF2B6D]/10 hover:bg-[#FF2B6D]/20 text-[#FF2B6D] font-bold text-xs border border-[#FF2B6D]/30 transition-all cursor-pointer mb-3"
      >
        {isDetecting ? (
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
        ) : (
          <Navigation className="w-3.5 h-3.5" />
        )}
        <span>Detect My Current Location (GPS)</span>
      </button>

      {/* Supported Cities List */}
      <div className="space-y-1">
        <div className="text-[10px] font-bold text-[var(--text-subtle)] uppercase tracking-wider px-1 mb-1">
          Supported Delivery Areas
        </div>
        {DEFAULT_STORE_SETTINGS.deliveryCities.map((city) => (
          <button
            key={city}
            type="button"
            onClick={() => {
              setDeliveryCity(city);
              onClose();
            }}
            className={`w-full text-left px-3 py-2 rounded-xl text-xs font-semibold flex items-center justify-between transition-colors cursor-pointer ${
              deliveryCity === city
                ? 'bg-[#FF2B6D]/15 text-[#FF2B6D] border border-[#FF2B6D]/40 font-bold'
                : 'text-[var(--text-main)] hover:bg-[var(--bg-subtle)] border border-transparent'
            }`}
          >
            <span>{city}</span>
            {deliveryCity === city && <CheckCircle2 className="w-4 h-4 text-[#FF2B6D]" />}
          </button>
        ))}
      </div>
    </>
  );

  // Helper renderer: PIN Code Checker Form
  const renderPinChecker = (onClose: () => void, inputId: string) => (
    <>
      <div className="flex items-center justify-between pb-2 border-b border-[var(--border)]/40 mb-3">
        <div>
          <h3 className="text-sm font-bold text-[var(--text-main)]">
            Check Delivery Availability
          </h3>
          <p className="text-[11px] text-[var(--text-muted)]">
            Enter your 6-digit PIN code
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="p-1 rounded-full hover:bg-[var(--bg-subtle)] text-[var(--text-muted)] hover:text-[var(--text-main)] cursor-pointer"
          aria-label="Close PIN checker"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <form onSubmit={handleCheckPin} className="space-y-3">
        <div>
          <label htmlFor={inputId} className="sr-only">
            6-digit PIN code
          </label>
          <div className="relative">
            <input
              id={inputId}
              ref={pinInputRef}
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={6}
              placeholder="Enter 6-digit PIN (e.g. 122001)"
              value={pinInput}
              onChange={(e) => {
                const val = e.target.value.replace(/\D/g, '').slice(0, 6);
                setPinInput(val);
                if (pinValidationState !== 'idle') {
                  setPinValidationState('idle');
                  setPinResponseMessage('');
                }
              }}
              className="w-full px-3 py-2 rounded-xl bg-[var(--bg-subtle)] border border-[var(--border)] text-sm text-[var(--text-main)] placeholder:text-[var(--text-subtle)] focus:outline-none focus:ring-2 focus:ring-[#FF2B6D] transition-all font-mono tracking-wider"
            />
            {pinInput && (
              <button
                type="button"
                onClick={() => {
                  setPinInput('');
                  setPinValidationState('idle');
                  setPinResponseMessage('');
                  setPinDeliveryDetails(null);
                  pinInputRef.current?.focus({ preventScroll: true });
                }}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-subtle)] hover:text-[var(--text-main)] text-xs"
                aria-label="Clear PIN code"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Status Message Display */}
        {pinValidationState === 'empty' && (
          <div
            role="alert"
            className="flex items-center gap-2 text-xs text-amber-500 bg-amber-500/10 border border-amber-500/20 px-3 py-2 rounded-xl"
          >
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{pinResponseMessage}</span>
          </div>
        )}

        {pinValidationState === 'invalid' && (
          <div
            role="alert"
            className="flex items-center gap-2 text-xs text-rose-500 bg-rose-500/10 border border-rose-500/20 px-3 py-2 rounded-xl"
          >
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{pinResponseMessage}</span>
          </div>
        )}

        {pinValidationState === 'serviceable' && (
          <div
            role="status"
            className="space-y-2 bg-emerald-500/10 border border-emerald-500/25 p-3 rounded-xl text-xs text-emerald-600 dark:text-emerald-400"
          >
            <div className="flex items-center gap-2 font-bold">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-500" />
              <span>{pinResponseMessage}</span>
            </div>
            {pinDeliveryDetails && (
              <div className="pt-1.5 border-t border-emerald-500/20 space-y-1 text-[11px] text-[var(--text-muted)]">
                {pinDeliveryDetails.city && (
                  <div className="flex justify-between">
                    <span>Service Area:</span>
                    <span className="font-semibold text-[var(--text-main)]">
                      {pinDeliveryDetails.city} ({pinDeliveryDetails.zone || 'Local'})
                    </span>
                  </div>
                )}
                {pinDeliveryDetails.estDeliveryTime && (
                  <div className="flex justify-between">
                    <span>Est. Delivery:</span>
                    <span className="font-semibold text-[var(--text-main)]">
                      {pinDeliveryDetails.estDeliveryTime}
                    </span>
                  </div>
                )}
                {pinDeliveryDetails.freeThreshold !== undefined && (
                  <div className="flex justify-between">
                    <span>Free Delivery:</span>
                    <span className="font-semibold text-[var(--text-main)]">
                      Orders above ₹{pinDeliveryDetails.freeThreshold}
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {pinValidationState === 'not_serviceable' && (
          <div
            role="alert"
            className="space-y-1.5 bg-rose-500/10 border border-rose-500/25 p-3 rounded-xl text-xs text-rose-600 dark:text-rose-400"
          >
            <div className="flex items-center gap-2 font-semibold">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{pinResponseMessage}</span>
            </div>
            <div className="text-[11px] text-[var(--text-muted)]">
              Currently we serve Gurugram and select Delhi NCR areas with fresh artisanal deliveries.
            </div>
          </div>
        )}

        <button
          type="submit"
          id="check-pin-availability-btn"
          disabled={isCheckingPin}
          className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-[#FF2B6D] to-[#FF457E] hover:brightness-105 text-white font-bold text-xs shadow-md shadow-[#FF2B6D]/20 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-70"
        >
          {isCheckingPin ? (
            <>
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              <span>Checking Availability...</span>
            </>
          ) : (
            <span>Check Availability</span>
          )}
        </button>
      </form>
    </>
  );

  return (
    <div ref={containerRef} className="relative">
      {/* Optional feedback toast for GPS detection */}
      {locationStatusMessage && !isCityDropdownOpen && (
        <div
          role="status"
          className="text-[11px] text-[#FF2B6D] bg-[#FF2B6D]/10 px-2.5 py-1 rounded-lg mb-1.5 flex items-center justify-between animate-in fade-in"
        >
          <span>{locationStatusMessage}</span>
          <button
            type="button"
            onClick={() => setLocationStatusMessage(null)}
            className="text-[var(--text-muted)] hover:text-[var(--text-main)] ml-2 text-xs"
            aria-label="Dismiss notification"
          >
            ×
          </button>
        </div>
      )}

      {/* ========================================================================= */}
      {/* DESKTOP SERVICE BAR (Compact horizontal layout with anchored dropdowns)    */}
      {/* ========================================================================= */}
      {isDesktop ? (
        <div className="flex items-center justify-between text-xs py-0.5">
          <div className="flex items-center gap-3">
            {/* Option 1: Current Location with GPS & downward anchored dropdown */}
            <div className="relative flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => {
                  setIsCityDropdownOpen((prev) => !prev);
                  setIsPinDropdownOpen(false);
                }}
                aria-expanded={isCityDropdownOpen}
                aria-controls="desktop-city-dropdown"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[var(--bg-subtle)] hover:bg-[var(--bg-accent)] text-xs text-[var(--text-main)] font-semibold border border-[var(--border)] transition-colors cursor-pointer focus-visible:ring-2 focus-visible:ring-[#FF2B6D]"
                aria-label={`Current delivery location: ${deliveryCity}. Click to change.`}
              >
                <MapPin className="w-3.5 h-3.5 text-[#FF2B6D] shrink-0" />
                <span className="text-[var(--text-muted)] font-medium">Current Location:</span>
                <span className="font-bold text-[var(--text-main)]">{deliveryCity}</span>
                <ChevronDown
                  className={`w-3 h-3 text-[var(--text-subtle)] transition-transform duration-150 ${
                    isCityDropdownOpen ? 'rotate-180' : ''
                  }`}
                />
              </button>

              <button
                type="button"
                onClick={handleDetectLocation}
                disabled={isDetecting}
                title="Detect my current location with GPS"
                aria-label="Detect GPS location"
                className="p-1.5 rounded-full bg-[var(--bg-subtle)] hover:bg-[#FF2B6D]/10 text-[var(--text-muted)] hover:text-[#FF2B6D] border border-[var(--border)] transition-colors cursor-pointer"
              >
                {isDetecting ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-[#FF2B6D]" />
                ) : (
                  <Navigation className="w-3.5 h-3.5" />
                )}
              </button>

              {/* Desktop Anchored City Dropdown (Opens Downward) */}
              {isCityDropdownOpen && (
                <div
                  id="desktop-city-dropdown"
                  className="absolute top-full left-0 mt-2 w-72 bg-[var(--bg-surface)] border border-[var(--border)] rounded-2xl p-4 shadow-2xl z-50 animate-in fade-in slide-in-from-top-1 duration-150 max-h-80 overflow-y-auto"
                  onClick={(e) => e.stopPropagation()}
                >
                  {renderCityList(() => setIsCityDropdownOpen(false))}
                </div>
              )}
            </div>

            <div className="h-4 w-px bg-[var(--border)] hidden sm:block" />

            {/* Option 2: Check Your PIN Code with downward anchored dropdown */}
            <div className="relative">
              <button
                type="button"
                onClick={() => {
                  setIsPinDropdownOpen((prev) => !prev);
                  setIsCityDropdownOpen(false);
                }}
                aria-expanded={isPinDropdownOpen}
                aria-controls="desktop-pin-dropdown"
                className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-[var(--bg-subtle)] hover:bg-[var(--bg-accent)] text-xs text-[var(--text-main)] font-semibold border border-[var(--border)] transition-colors cursor-pointer focus-visible:ring-2 focus-visible:ring-[#FF2B6D]"
                aria-label="Check delivery PIN code"
              >
                <span className="text-xs">📮</span>
                <span className="text-[var(--text-muted)] font-medium">Delivery PIN:</span>
                <span className="font-bold text-[var(--text-main)]">
                  {verifiedPin ? verifiedPin : 'Check PIN Code'}
                </span>
                <ChevronDown
                  className={`w-3 h-3 text-[var(--text-subtle)] transition-transform duration-150 ${
                    isPinDropdownOpen ? 'rotate-180' : ''
                  }`}
                />
              </button>

              {/* Desktop Anchored PIN Dropdown (Opens Downward) */}
              {isPinDropdownOpen && (
                <div
                  id="desktop-pin-dropdown"
                  className="absolute top-full left-0 mt-2 w-80 bg-[var(--bg-surface)] border border-[var(--border)] rounded-2xl p-4 shadow-2xl z-50 animate-in fade-in slide-in-from-top-1 duration-150 max-h-96 overflow-y-auto"
                  onClick={(e) => e.stopPropagation()}
                >
                  {renderPinChecker(() => setIsPinDropdownOpen(false), 'desktop-pin-input-field')}
                </div>
              )}
            </div>
          </div>

          <div className="text-[11px] text-[var(--text-muted)] hidden md:block">
            Fresh artisanal delivery across <span className="font-semibold text-[var(--text-main)]">Delhi NCR</span>
          </div>
        </div>
      ) : (
        /* ========================================================================= */
        /* MOBILE SERVICE BAR (Two compact options side-by-side)                    */
        /* ========================================================================= */
        <div className="pt-0.5">
          <div className="grid grid-cols-2 gap-2">
            {/* Option 1 Trigger: 📍 Google / Current Location */}
            <button
              type="button"
              id="mobile-current-location-btn"
              onClick={() => {
                setIsCityDropdownOpen((prev) => !prev);
                setIsPinDropdownOpen(false);
              }}
              aria-expanded={isCityDropdownOpen}
              aria-controls="mobile-location-dropdown"
              className={`flex items-center gap-2 px-2.5 py-1.5 rounded-xl border text-left transition-all active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-[#FF2B6D] min-w-0 cursor-pointer shadow-2xs ${
                isCityDropdownOpen
                  ? 'bg-[var(--bg-accent)] border-[#FF2B6D]/50 ring-1 ring-[#FF2B6D]/30'
                  : 'bg-[var(--bg-subtle)] hover:bg-[var(--bg-accent)] border-[var(--border)]'
              }`}
              aria-label={`Current location: ${deliveryCity}. Tap to view city options or detect GPS.`}
            >
              <div className="w-7 h-7 rounded-lg bg-[#FF2B6D]/10 flex items-center justify-center shrink-0 text-[#FF2B6D]">
                {isDetecting ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-[#FF2B6D]" />
                ) : (
                  <MapPin className="w-3.5 h-3.5 text-[#FF2B6D]" />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-[10px] text-[var(--text-muted)] font-medium leading-tight truncate">
                  📍 Current Location
                </div>
                <div className="text-xs font-bold text-[var(--text-main)] truncate leading-tight mt-0.5">
                  {isDetecting ? 'Detecting...' : deliveryCity}
                </div>
              </div>
            </button>

            {/* Option 2 Trigger: 📮 Check Your PIN Code */}
            <button
              type="button"
              id="mobile-check-pin-btn"
              onClick={() => {
                setIsPinDropdownOpen((prev) => !prev);
                setIsCityDropdownOpen(false);
              }}
              aria-expanded={isPinDropdownOpen}
              aria-controls="mobile-pin-dropdown"
              className={`flex items-center gap-2 px-2.5 py-1.5 rounded-xl border text-left transition-all active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-[#FF2B6D] min-w-0 cursor-pointer shadow-2xs ${
                isPinDropdownOpen
                  ? 'bg-[var(--bg-accent)] border-[#FF2B6D]/50 ring-1 ring-[#FF2B6D]/30'
                  : 'bg-[var(--bg-subtle)] hover:bg-[var(--bg-accent)] border-[var(--border)]'
              }`}
              aria-label="Check delivery PIN code availability"
            >
              <div className="w-7 h-7 rounded-lg bg-pink-500/10 flex items-center justify-center shrink-0">
                <span className="text-xs">📮</span>
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-[10px] text-[var(--text-muted)] font-medium leading-tight truncate">
                  Check Your PIN
                </div>
                <div className="text-xs font-bold text-[var(--text-main)] truncate leading-tight mt-0.5">
                  {verifiedPin ? `PIN: ${verifiedPin}` : 'Check Code'}
                </div>
              </div>
            </button>
          </div>

          {/* ========================================================================= */}
          {/* MOBILE ANCHORED DOWNWARD DROPDOWNS                                       */}
          {/* Positioned absolute top-full mt-2 directly BELOW the service triggers    */}
          {/* ========================================================================= */}

          {/* 1. Mobile Anchored Location Dropdown */}
          {isCityDropdownOpen && (
            <div
              id="mobile-location-dropdown"
              className="absolute top-full left-0 right-0 mt-2 z-50 bg-[var(--bg-surface)] border border-[var(--border)] rounded-2xl p-4 shadow-2xl animate-in fade-in slide-in-from-top-1 duration-150 max-h-[60vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              {renderCityList(() => setIsCityDropdownOpen(false))}
            </div>
          )}

          {/* 2. Mobile Anchored PIN Code Dropdown */}
          {isPinDropdownOpen && (
            <div
              id="mobile-pin-dropdown"
              className="absolute top-full left-0 right-0 mt-2 z-50 bg-[var(--bg-surface)] border border-[var(--border)] rounded-2xl p-4 shadow-2xl animate-in fade-in slide-in-from-top-1 duration-150 max-h-[60vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              {renderPinChecker(() => setIsPinDropdownOpen(false), 'mobile-pin-input-field')}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
