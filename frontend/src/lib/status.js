// Single source of truth for every status pill in the app.
// Each entry returns: label, classes (Badge classes), dotColor, iconName.
//
// Canonical sets:
//   Order status:      pending | accepted | ready | completed
//   Vendor verify:     pending | open | approved | rejected
//   Support ticket:    open | in_progress | resolved

export const ORDER_STATUS = {
  pending: {
    label: 'Pending',
    badge: 'bg-amber-50 text-amber-700 border-amber-200',
    dot: 'bg-amber-500',
    description: 'New order awaiting your acceptance',
  },
  accepted: {
    label: 'Accepted',
    badge: 'bg-blue-50 text-blue-700 border-blue-200',
    dot: 'bg-blue-500',
    description: 'You have accepted, preparing the order',
  },
  ready: {
    label: 'Ready for pickup',
    badge: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    dot: 'bg-emerald-500',
    description: 'Order is ready, share the pickup code with the customer',
  },
  completed: {
    label: 'Completed',
    badge: 'bg-gray-100 text-gray-600 border-gray-200',
    dot: 'bg-gray-400',
    description: 'Order has been handed over',
  },
};

export const VENDOR_STATUS = {
  pending: {
    label: 'Pending review',
    badge: 'bg-amber-50 text-amber-700 border-amber-200',
    dot: 'bg-amber-500',
  },
  open: {
    label: 'Active',
    badge: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    dot: 'bg-emerald-500',
  },
  approved: {
    label: 'Approved',
    badge: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    dot: 'bg-emerald-500',
  },
  rejected: {
    label: 'Rejected',
    badge: 'bg-red-50 text-red-700 border-red-200',
    dot: 'bg-red-500',
  },
};

export const TICKET_STATUS = {
  open: {
    label: 'Open',
    badge: 'bg-amber-50 text-amber-700 border-amber-200',
    dot: 'bg-amber-500',
  },
  in_progress: {
    label: 'In progress',
    badge: 'bg-blue-50 text-blue-700 border-blue-200',
    dot: 'bg-blue-500',
  },
  resolved: {
    label: 'Resolved',
    badge: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    dot: 'bg-emerald-500',
  },
};

export function statusFor(kind, key) {
  const map = {
    order: ORDER_STATUS,
    vendor: VENDOR_STATUS,
    ticket: TICKET_STATUS,
  }[kind];
  if (!map) return { label: key, badge: 'bg-gray-100 text-gray-600 border-gray-200', dot: 'bg-gray-400' };
  return map[key] || { label: key, badge: 'bg-gray-100 text-gray-600 border-gray-200', dot: 'bg-gray-400' };
}
