import React from 'react';

export const Link = ({to, children, className, onClick}) => (
  <a 
    href="#" 
    className={className} 
    onClick={(e) => { 
      e.preventDefault(); 
      if(onClick) onClick(e); 
      window.dispatchEvent(new CustomEvent('navigate', {detail: to}));
    }}
  >
    {children}
  </a>
);
