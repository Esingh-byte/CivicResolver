import React, { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';

const AuthField = ({
  label,
  type = 'text',
  name,
  value,
  placeholder,
  onChange,
  error,
  children,
  className = '',
  autoComplete,
  required = false,
  disabled = false,
  hint,
}) => {
  const [showPassword, setShowPassword] = useState(false);
  const isPassword = type === 'password';
  const inputType = isPassword ? (showPassword ? 'text' : 'password') : type;

  return (
    <div className={`form-group ${className}`}>
      {label && (
        <label htmlFor={name}>
          {label} {required && <span className="req-star">*</span>}
        </label>
      )}
      <div className="input-wrapper">
        <input
          id={name}
          type={inputType}
          name={name}
          value={value}
          placeholder={placeholder}
          onChange={onChange}
          autoComplete={autoComplete}
          disabled={disabled}
          className={`${error ? 'input-error' : ''} ${isPassword ? 'has-toggle' : ''}`.trim()}
        />
        {isPassword && (
          <button
            type="button"
            className="password-toggle-btn"
            onClick={() => setShowPassword((prev) => !prev)}
            aria-label={showPassword ? 'Hide password' : 'Show password'}
            tabIndex={-1}
          >
            {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
        )}
      </div>
      {hint && !error && <span className="field-hint">{hint}</span>}
      {error && (
        <span className="error-msg" role="alert">
          {error}
        </span>
      )}
      {children}
    </div>
  );
};

export default AuthField;
