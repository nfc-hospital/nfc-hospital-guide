import React from 'react';
import PropTypes from 'prop-types';

const Typography = ({
  variant = 'body1',
  component,
  children,
  color = 'primary',
  align = 'left',
  className = '',
  ...props
}) => {
  const variants = {
    h1: 'text-4xl font-bold leading-tight mb-4',
    h2: 'text-3xl font-bold leading-tight mb-3',
    h3: 'text-2xl font-bold leading-snug mb-2',
    h4: 'text-xl font-semibold leading-snug mb-2',
    body1: 'text-base leading-relaxed',
    body2: 'text-lg leading-relaxed',
    caption: 'text-sm leading-normal text-gray-600',
    button: 'text-base font-medium',
  };

  const colors = {
    primary: 'text-gray-900',
    secondary: 'text-gray-600',
    white: 'text-white',
    error: 'text-danger-red',
    success: 'text-success-green',
    warning: 'text-warning-orange',
  };

  const alignments = {
    left: 'text-left',
    center: 'text-center',
    right: 'text-right',
  };

  const Component = component || {
    h1: 'h1',
    h2: 'h2',
    h3: 'h3',
    h4: 'h4',
    body1: 'p',
    body2: 'p',
    caption: 'span',
    button: 'span',
  }[variant];

  return (
    <Component
      className={`
        ${variants[variant]}
        ${colors[color]}
        ${alignments[align]}
        ${className}
      `}
      {...props}
    >
      {children}
    </Component>
  );
};

Typography.propTypes = {
  variant: PropTypes.oneOf(['h1', 'h2', 'h3', 'h4', 'body1', 'body2', 'caption', 'button']),
  component: PropTypes.elementType,
  children: PropTypes.node.isRequired,
  color: PropTypes.oneOf(['primary', 'secondary', 'white', 'error', 'success', 'warning']),
  align: PropTypes.oneOf(['left', 'center', 'right']),
  className: PropTypes.string,
};

export default Typography; 