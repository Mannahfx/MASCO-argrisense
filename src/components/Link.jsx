import React, { useContext } from 'react';
import { NavContext } from '../AppNew';

export const Link = ({ to, state, children, className, onClick, ariaLabel }) => {
  const { navigate } = useContext(NavContext);

  return (
    <a 
      href={to} 
      className={className} 
      aria-label={ariaLabel}
      onClick={(e) => { 
        e.preventDefault(); 
        if(onClick) onClick(e); 
        if(navigate) {
          if (state) {
            navigate(to, { state });
          } else {
            navigate(to);
          }
        }
      }}
    >
      {children}
    </a>
  );
};
