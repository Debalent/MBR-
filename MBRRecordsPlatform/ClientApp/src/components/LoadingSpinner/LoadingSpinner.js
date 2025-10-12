import React from 'react';

const LoadingSpinner = ({ size = 'medium' }) => {
  const sizeClass = size === 'large' ? 'loading-spinner--large' : 'loading-spinner--medium';
  
  return (
    <div className={`loading-spinner ${sizeClass}`}>
      <div className="loading-spinner__circle"></div>
      <div className="loading-spinner__text">Loading...</div>
    </div>
  );
};

export default LoadingSpinner;