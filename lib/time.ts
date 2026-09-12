import { AttendanceWindowStatus } from '@/types/database';

export const getAttendanceWindowStatus = (overrideTime?: Date): AttendanceWindowStatus => {
  const now = overrideTime || new Date();
  const currentServerTime = now.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true,
  });

  const hours = now.getHours();
  const minutes = now.getMinutes();
  const currentMinutesFromMidnight = hours * 60 + minutes;

  const windowStartMinutes = 18 * 60; // 6:00 PM = 18:00
  const windowEndMinutes = 22 * 60;   // 10:00 PM = 22:00

  const isBeforeWindow = currentMinutesFromMidnight < windowStartMinutes;
  const isAfterWindow = currentMinutesFromMidnight >= windowEndMinutes;
  const isOpen = currentMinutesFromMidnight >= windowStartMinutes && currentMinutesFromMidnight < windowEndMinutes;

  let statusMessage = '';
  let timeRemainingText = '';

  if (isBeforeWindow) {
    statusMessage = 'Attendance Not Started';
    const diff = windowStartMinutes - currentMinutesFromMidnight;
    const hrs = Math.floor(diff / 60);
    const mins = diff % 60;
    timeRemainingText = `Starts in ${hrs > 0 ? `${hrs}h ` : ''}${mins}m`;
  } else if (isOpen) {
    statusMessage = 'Attendance Open';
    const diff = windowEndMinutes - currentMinutesFromMidnight;
    const hrs = Math.floor(diff / 60);
    const mins = diff % 60;
    timeRemainingText = `Closes in ${hrs > 0 ? `${hrs}h ` : ''}${mins}m`;
  } else {
    statusMessage = 'Attendance Closed';
    timeRemainingText = 'Window ended at 10:00 PM';
  }

  return {
    isOpen,
    statusMessage,
    timeRemainingText,
    isBeforeWindow,
    isAfterWindow,
    currentServerTime,
  };
};

export const getFormattedTodayDate = (): string => {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export const formatDateDisplay = (dateString?: string | null): string => {
  if (!dateString) return '';
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return dateString;
  return date.toLocaleDateString('en-US', {
    weekday: 'short',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
};

export const formatTimeDisplay = (timeIsoString?: string | null): string => {
  if (!timeIsoString) return '';
  const date = new Date(timeIsoString);
  if (isNaN(date.getTime())) return timeIsoString;
  return date.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true,
  });
};
