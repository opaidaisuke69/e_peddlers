const isBrowser = typeof window !== 'undefined';
const isRemoteHost = isBrowser && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1';

export const API_BASE_URL =
  import.meta.env.VITE_API_URL ||
  (isRemoteHost ? `${window.location.origin}/api` : 'http://localhost:8000/api');

export const SOCKET_URL =
  import.meta.env.VITE_SOCKET_URL !== undefined
    ? import.meta.env.VITE_SOCKET_URL
    : (isRemoteHost ? '' : 'http://localhost:3001');

export const APP_STATUS_CONFIG = {
  PENDING_ADMIN_APPROVAL: {
    label: 'Pending Admin Review',
    color: 'bg-amber-100 text-amber-800 border-amber-300',
    dot: 'bg-amber-500',
    step: 1,
  },
  ADMIN_REJECTED: {
    label: 'Admin Rejected',
    color: 'bg-red-100 text-red-800 border-red-300',
    dot: 'bg-red-500',
    step: 1,
  },
  PENDING_INSPECTOR_APPROVAL: {
    label: 'Pending Field Inspection',
    color: 'bg-blue-100 text-blue-800 border-blue-300',
    dot: 'bg-blue-500',
    step: 2,
  },
  INSPECTOR_REJECTED: {
    label: 'Inspection Rejected',
    color: 'bg-rose-100 text-rose-800 border-rose-300',
    dot: 'bg-rose-500',
    step: 2,
  },
  PENDING_SANITARY_APPROVAL: {
    label: 'Pending Sanitary Inspection',
    color: 'bg-purple-100 text-purple-800 border-purple-300',
    dot: 'bg-purple-500',
    step: 3,
  },
  SANITARY_REJECTED: {
    label: 'Sanitary Non-Compliant',
    color: 'bg-red-100 text-red-800 border-red-300',
    dot: 'bg-red-500',
    step: 3,
  },
  PENDING_TREASURY_PAYMENT: {
    label: 'Pending Treasury Payment',
    color: 'bg-indigo-100 text-indigo-800 border-indigo-300',
    dot: 'bg-indigo-500',
    step: 4,
  },
  PAYMENT_REJECTED: {
    label: 'Payment Rejected',
    color: 'bg-red-100 text-red-800 border-red-300',
    dot: 'bg-red-500',
    step: 4,
  },
  READY_FOR_PERMIT_RELEASE: {
    label: 'Ready for Permit Release',
    color: 'bg-teal-100 text-teal-800 border-teal-300',
    dot: 'bg-teal-500',
    step: 5,
  },
  FINISHED: {
    label: 'Permit Released / Finished',
    color: 'bg-emerald-100 text-emerald-800 border-emerald-300',
    dot: 'bg-emerald-500',
    step: 6,
  },
};

export const WORKFLOW_STAGES = [
  { id: 1, name: 'Admin Verification', role: 'Admin' },
  { id: 2, name: 'Field Inspection', role: 'Inspector' },
  { id: 3, name: 'Sanitary Clearance', role: 'Sanitary' },
  { id: 4, name: 'Treasury Payment', role: 'Treasury' },
  { id: 5, name: 'Permit Release', role: 'Admin' },
];

export const BARANGAYS_LA_CARLOTA = [
  'Barangay I (Poblacion)',
  'Barangay II (Poblacion)',
  'Barangay III (Poblacion)',
  'Ara-al',
  'Ayungon',
  'Balabag',
  'Batuan',
  'Cubay',
  'Haguimit',
  'La Granja',
  'Nagasi',
  'San Miguel',
  'RSB (Roberto S. Benedicto)',
  'Yubo',
];
