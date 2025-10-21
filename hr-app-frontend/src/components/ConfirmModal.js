import React from 'react';

const ConfirmModal = ({ visible, title = 'Confirm', message = '', onConfirm, onCancel, confirmText = 'Yes', cancelText = 'Cancel', loading = false }) => {
  if (!visible) return null;

  return (
    <div className="modal-overlay">
      <div className="modal-card" role="dialog" aria-modal="true" aria-labelledby="confirm-modal-title">
        <div className="modal-title" id="confirm-modal-title">{title}</div>
        <div className="modal-message">{message}</div>
        <div className="modal-actions">
          <button className="btn btn-cancel" onClick={onCancel} disabled={loading}>{cancelText}</button>
          <button className="btn btn-confirm" onClick={onConfirm} disabled={loading}>{loading ? 'Please wait...' : confirmText}</button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmModal;
