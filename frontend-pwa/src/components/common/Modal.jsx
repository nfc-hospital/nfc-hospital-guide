import React, { useEffect, useRef } from 'react';
import ReactDOM from 'react-dom';

export default function Modal({ 
  isOpen, 
  onClose, 
  title, 
  children, 
  size = 'md',
  showCloseButton = true,
  closeOnBackdrop = true,
  closeOnEsc = true,
  className = ''
}) {
  const modalRef = useRef(null);

  useEffect(() => {
    const handleEsc = (event) => {
      if (closeOnEsc && event.keyCode === 27) {
        onClose();
      }
    };

    const handleClickOutside = (event) => {
      if (closeOnBackdrop && modalRef.current && !modalRef.current.contains(event.target)) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEsc);
      document.addEventListener('mousedown', handleClickOutside);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEsc);
      document.removeEventListener('mousedown', handleClickOutside);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose, closeOnBackdrop, closeOnEsc]);

  if (!isOpen) return null;

  const sizeClasses = {
    sm: 'max-w-md',
    md: 'max-w-lg',
    lg: 'max-w-2xl',
    xl: 'max-w-4xl',
    full: 'max-w-full mx-4'
  };

  return ReactDOM.createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div 
        className="fixed inset-0 bg-black bg-opacity-50 transition-opacity duration-300"
        aria-hidden="true"
      />
      
      <div
        ref={modalRef}
        className={`
          relative bg-white rounded-2xl shadow-2xl transform transition-all duration-300
          ${sizeClasses[size]} w-full mx-4 max-h-[90vh] overflow-hidden
          animate-modal-enter ${className}
        `}
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
      >
        {title && (
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 
              id="modal-title" 
              className="text-xl sm:text-2xl font-semibold text-gray-900"
            >
              {title}
            </h2>
          </div>
        )}

        {showCloseButton && (
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 rounded-lg hover:bg-gray-100 
                     transition-colors duration-200 group"
            aria-label="닫기"
          >
            <svg 
              className="w-6 h-6 text-gray-400 group-hover:text-gray-600" 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                strokeWidth={2} 
                d="M6 18L18 6M6 6l12 12" 
              />
            </svg>
          </button>
        )}

        <div className="p-6 overflow-y-auto max-h-[calc(90vh-8rem)]">
          {children}
        </div>
      </div>
    </div>,
    document.body
  );
}