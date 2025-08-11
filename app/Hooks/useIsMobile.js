import { useState, useEffect } from 'react';

const useIsMobile = () => {
  const [isMobile, setIsMobile] = useState(false);

  const checkDeviceSize = () => {
    setIsMobile(window.innerWidth <= 768);
  };

  useEffect(() => {
    checkDeviceSize();
    window.addEventListener('resize', checkDeviceSize);

    return () => {
      window.removeEventListener('resize', checkDeviceSize);
    };
  }, []);

  return isMobile;
};

export default useIsMobile;