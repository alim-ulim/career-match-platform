import React from 'react';

export default function Toast({ toast }) {
  if (!toast.show) return null;
  return (
    <div className={`toast toast-${toast.type}`}>
      {toast.message}
    </div>
  );
}
