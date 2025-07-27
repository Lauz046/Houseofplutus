import React, { useState, useEffect } from 'react';
import styles from './SizeGrid.module.css';

export interface SizePrice {
  size: string;
  price: number;
  seller: string;
}

export const SizeGrid: React.FC<{ 
  sizes: SizePrice[]; 
  onSelect: (size: SizePrice | null) => void; 
  selectedSize: SizePrice | null;
  onMobileSizeClick?: () => void;
  onMobileSizeChartClick?: () => void;
}> = ({ sizes, onSelect, selectedSize, onMobileSizeClick, onMobileSizeChartClick }) => {
  const [open, setOpen] = useState(true);
  const [isMobile, setIsMobile] = useState(false);
  
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 600);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  // Mobile size selector button
  if (isMobile) {
    return (
      <div className={styles.mobileSection}>
        <div className={styles.mobileHeader}>
          <span className={styles.mobileLabel}>Select Your Size</span>
          <button className={styles.mobileSizeButton} onClick={onMobileSizeChartClick}>
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={styles.mobileSizeIcon}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3.75v4.5m0-4.5h4.5m-4.5 0L9 9M3.75 20.25v-4.5m0 4.5h4.5m-4.5 0L9 15M20.25 3.75h-4.5m4.5 0v4.5m0-4.5L15 9m5.25 11.25h-4.5m4.5 0v-4.5m0 4.5L15 15" />
            </svg>
            Size Chart
          </button>
        </div>
        <button className={styles.mobileSizeSelector} onClick={onMobileSizeClick}>
          {selectedSize ? `${selectedSize.size} - ₹${selectedSize.price.toLocaleString()}` : 'Select Size'}
        </button>
      </div>
    );
  }

  // Desktop size grid
  return (
    <div className={styles.section}>
      <button className={styles.headerRow} onClick={() => setOpen(o => !o)}>
        <div className={styles.header}>Size and Conversations:</div>
        <span className={open ? styles.arrowOpen : styles.arrowClosed}>
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={styles.arrowSvg}>
            <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
          </svg>
        </span>
        {open ? (
          <div className={styles.all}>
            {selectedSize ? selectedSize.size : 'All'}
          </div>
        ) : (
          <div className={styles.all}>
            {selectedSize ? selectedSize.size : 'All'}
          </div>
        )}
      </button>
      {open && (
        <div className={styles.grid}>
          {sizes.map((sp) => (
            <button
              key={sp.size}
              onClick={() => onSelect(selectedSize?.size === sp.size ? null : sp)}
              className={sp.size === selectedSize?.size ? styles.selected : styles.sizeBtn}
            >
              <span className={sp.size === selectedSize?.size ? styles.selectedContent : styles.size}>{sp.size}</span>
              <span className={sp.size === selectedSize?.size ? styles.selectedContent : styles.price}>₹{sp.price}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}; 