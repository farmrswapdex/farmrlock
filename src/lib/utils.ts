import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export interface TimeRemaining {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
}

export type PresaleStatus = "NOT_STARTED" | "ACTIVE" | "ENDED";

export const PresaleStatus = {
  NOT_STARTED: "NOT_STARTED" as const,
  ACTIVE: "ACTIVE" as const,
  ENDED: "ENDED" as const
} as const;

export const PRESALE_START_TIME = 1758722400; 
export const PRESALE_END_TIME = 1759708740;

export function getPresaleStatus(): PresaleStatus {
  const now = Math.floor(Date.now() / 1000);
  
  if (now < PRESALE_START_TIME) {
    return PresaleStatus.NOT_STARTED;
  } else if (now >= PRESALE_START_TIME && now < PRESALE_END_TIME) {
    return PresaleStatus.ACTIVE;
  } else {
    return PresaleStatus.ENDED;
  }
}

export function getTimeUntilStart(): TimeRemaining {
  const now = Math.floor(Date.now() / 1000);
  const timeLeft = Math.max(0, PRESALE_START_TIME - now);
  return parseTimeLeft(timeLeft);
}

export function getTimeUntilEnd(): TimeRemaining {
  const now = Math.floor(Date.now() / 1000);
  const timeLeft = Math.max(0, PRESALE_END_TIME - now);
  return parseTimeLeft(timeLeft);
}

function parseTimeLeft(seconds: number): TimeRemaining {
  const days = Math.floor(seconds / (24 * 60 * 60));
  const hours = Math.floor((seconds % (24 * 60 * 60)) / (60 * 60));
  const minutes = Math.floor((seconds % (60 * 60)) / 60);
  const secs = seconds % 60;

  return {
    days,
    hours,
    minutes,
    seconds: secs
  };
}

export function formatPresaleDate(timestamp: number): string {
  return new Date(timestamp * 1000).toLocaleString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'UTC',
    timeZoneName: 'short'
  });
}
