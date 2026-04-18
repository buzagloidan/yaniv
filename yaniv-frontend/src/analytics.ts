import posthog from 'posthog-js';

const POSTHOG_KEY = import.meta.env.VITE_PUBLIC_POSTHOG_PROJECT_TOKEN as string | undefined;
const POSTHOG_HOST = (import.meta.env.VITE_PUBLIC_POSTHOG_HOST as string | undefined) ?? 'https://eu.i.posthog.com';
let isInitialized = false;

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
  }
}

function hasGoogleTag(): boolean {
  return typeof window !== 'undefined' && typeof window.gtag === 'function';
}

function trackGoogleEvent(event: string, props?: Record<string, unknown>): void {
  if (!hasGoogleTag()) return;
  window.gtag?.('event', event, props ?? {});
}

function ensureAnalytics(): boolean {
  if (!POSTHOG_KEY) return false;
  if (isInitialized) return true;

  posthog.init(POSTHOG_KEY, {
    api_host: POSTHOG_HOST,
    defaults: '2026-01-30',
    person_profiles: 'identified_only',
    capture_pageview: true,
    capture_pageleave: true,
  });
  isInitialized = true;
  return true;
}

export function initAnalytics(): void {
  ensureAnalytics();
}

export function getAnalyticsClient() {
  return ensureAnalytics() ? posthog : null;
}

export function identifyUser(userId: string, displayName: string): void {
  if (ensureAnalytics()) {
    posthog.identify(userId, { display_name: displayName });
  }
  if (!hasGoogleTag()) return;
  window.gtag?.('set', { user_id: userId });
  window.gtag?.('set', 'user_properties', { display_name: displayName });
}

export function resetAnalyticsUser(): void {
  if (ensureAnalytics()) {
    posthog.reset();
  }
  if (!hasGoogleTag()) return;
  window.gtag?.('set', { user_id: null });
  window.gtag?.('set', 'user_properties', { display_name: null });
}

export function trackEvent(event: string, props?: Record<string, unknown>): void {
  if (ensureAnalytics()) {
    posthog.capture(event, props);
  }
  trackGoogleEvent(event, props);
}

export function trackPageView(path: string): void {
  if (!hasGoogleTag()) return;
  window.gtag?.('event', 'page_view', {
    page_path: path,
    page_location: window.location.href,
    page_title: document.title,
  });
}
