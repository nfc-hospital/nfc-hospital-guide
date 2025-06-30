import React from 'react';
import PropTypes from 'prop-types';
import LoadingSpinner from './LoadingSpinner';

const Button = ({
  children,
  variant = 'primary',
  size = 'medium',
  icon,
  isLoading = false,
  disabled = false,
  fullWidth = false,
  onClick,
  type = 'button',
  ariaLabel,
}) => {
  const baseStyles = 'flex items-center justify-center gap-2 rounded-lg font-medium transition-all duration-200';
  
  const variants = {
    primary: 'bg-primary-blue text-white hover:bg-primary-blue-dark focus:ring-2 focus:ring-primary-blue focus:ring-offset-2',
    secondary: 'bg-gray-100 text-gray-800 hover:bg-gray-200 focus:ring-2 focus:ring-gray-200 focus:ring-offset-2',
    danger: 'bg-danger-red text-white hover:bg-red-600 focus:ring-2 focus:ring-red-500 focus:ring-offset-2',
  };

  const sizes = {
    small: 'text-sm px-3 min-h-[36px]',
    medium: 'text-base px-4 min-h-[44px]',
    large: 'text-lg px-6 min-h-[52px]',
  };

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled || isLoading}
      aria-label={ariaLabel || (typeof children === 'string' ? children : undefined)}
      aria-busy={isLoading}
      className={`
        ${baseStyles}
        ${variants[variant]}
        ${sizes[size]}
        ${fullWidth ? 'w-full' : ''}
        ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
        ${isLoading ? 'relative !text-transparent' : ''}
      `}
    >
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center">
          <LoadingSpinner size={size === 'small' ? 16 : size === 'medium' ? 20 : 24} />
        </div>
      )}
      {icon && <span className="text-xl">{icon}</span>}
      {children}
    </button>
  );
};

Button.propTypes = {
  children: PropTypes.node.isRequired,
  variant: PropTypes.oneOf(['primary', 'secondary', 'danger']),
  size: PropTypes.oneOf(['small', 'medium', 'large']),
  icon: PropTypes.node,
  isLoading: PropTypes.bool,
  disabled: PropTypes.bool,
  fullWidth: PropTypes.bool,
  onClick: PropTypes.func,
  type: PropTypes.oneOf(['button', 'submit', 'reset']),
  ariaLabel: PropTypes.string,
};

export default Button; 