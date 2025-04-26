import React from 'react';
import './Loader.css';

const Loader: React.FC = () => {
  return (
    <div className="loader-container">
      <div className="loader-content">
        <div className="spinner-container">
          <div className="spinner">
            <div className="double-bounce1"></div>
            <div className="double-bounce2"></div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Loader;