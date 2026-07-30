/**
 * ConfirmDialog — modal that asks the user "are you sure?".
 */
import Modal from './Modal';
import Button from './Button';

export default function ConfirmDialog({
    open,
    title = 'Are you sure?',
    message,
    confirmText = 'Confirm',
    cancelText = 'Cancel',
    danger = false,
    onConfirm,
    onClose,
}) {
    return (
        <Modal
            open={open}
            onClose={onClose}
            title={title}
            size="sm"
            footer={
                <>
                    <Button variant="ghost" onClick={onClose}>
                        {cancelText}
                    </Button>
                    <Button variant={danger ? 'danger' : 'primary'} onClick={onConfirm}>
                        {confirmText}
                    </Button>
                </>
            }
        >
            <p className="text-sm text-gray-600">{message}</p>
        </Modal>
    );
}
