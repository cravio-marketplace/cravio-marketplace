/**
 * App-wide constants. Keep anything that needs to stay in sync between the
 * client and server here.
 */

export const SUPPORT_CATEGORIES = [
    'Technical Issue',
    'Order Problem',
    'Menu Help',
    'Billing',
    'Other',
];

export const SUPPORT_STATUSES = [
    { value: 'open', label: 'Open', color: 'orange' },
    { value: 'in_progress', label: 'In Progress', color: 'blue' },
    { value: 'resolved', label: 'Resolved', color: 'green' },
    { value: 'closed', label: 'Closed', color: 'gray' },
];

export const MEAL_TIME_OPTIONS = [
    { id: 'breakfast', label: 'Breakfast', icon: '🍳' },
    { id: 'lunch', label: 'Lunch', icon: '🍔' },
    { id: 'dinner', label: 'Dinner', icon: '🍽️' },
    { id: 'snacks', label: 'Snacks', icon: '🍿' },
];

export const FEATURED_DURATIONS = [
    { value: 3, label: '3 days' },
    { value: 7, label: '1 week' },
    { value: 14, label: '2 weeks' },
    { value: 30, label: '30 days' },
];
