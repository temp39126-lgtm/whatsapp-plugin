import { toast as toastify, type ToastOptions } from 'react-toastify';

const defaults: ToastOptions = {
  position: 'top-right',
  autoClose: 3500,
  hideProgressBar: false,
  closeOnClick: true,
  pauseOnHover: true,
};

export function toastSuccess(message: string, options?: ToastOptions) {
  toastify.success(message, { ...defaults, ...options });
}

export function toastError(message: string, options?: ToastOptions) {
  toastify.error(message, { ...defaults, ...options });
}
