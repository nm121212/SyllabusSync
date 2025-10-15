/**
 * Utility functions for date formatting
 */

/**
 * Formats a date string to MM-DD-YYYY format
 * @param dateString - Date string in ISO format (YYYY-MM-DD)
 * @returns Formatted date string in MM-DD-YYYY format
 */
export const formatDateToMMDDYYYY = (dateString: string): string => {
  if (!dateString) return '';
  
  try {
    const date = new Date(dateString + 'T00:00:00');
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    }).replace(/\//g, '-');
  } catch (error) {
    console.error('Error formatting date:', error);
    return dateString;
  }
};

/**
 * Formats a date string to a more readable format
 * @param dateString - Date string in ISO format (YYYY-MM-DD)
 * @returns Formatted date string in a readable format
 */
export const formatDateReadable = (dateString: string): string => {
  if (!dateString) return '';
  
  try {
    const date = new Date(dateString + 'T00:00:00');
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  } catch (error) {
    console.error('Error formatting date:', error);
    return dateString;
  }
};
