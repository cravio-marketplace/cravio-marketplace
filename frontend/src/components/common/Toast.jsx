/**
 * Toast wrapper. We keep this re-export because some pages still import
 * `components/common/Toast`. The actual implementation is the global
 * `react-hot-toast` Toaster mounted in App.jsx — this is just a thin
 * wrapper so call sites that want a `toast.success('...')` style API can
 * `import toast from 'components/common/Toast'` and get the same instance.
 */
import toast from 'react-hot-toast';

const wrapped = {
    success: (msg, opts) => toast.success(msg, opts),
    error: (msg, opts) => toast.error(msg, opts),
    loading: (msg, opts) => toast.loading(msg, opts),
    dismiss: (id) => toast.dismiss(id),
};

export default wrapped;
