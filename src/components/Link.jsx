import React, { useContext } from 'react';
import { NavContext } from '../AppNew';

export const Link = ({to, children, className, onClick}) => {
  const { navigate } = useContext(NavContext);

  return (
    <a 
      href="#" 
      className={className} 
      onClick={(e) => { 
        e.preventDefault(); 
        if(onClick) onClick(e); 
        if(navigate) navigate(to);
      }}
    >
      {children}
    </a>
  );
};
