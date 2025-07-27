import React, { useState, useEffect, useMemo, useRef } from 'react';
import { gql, useQuery } from '@apollo/client';

import WatchBrandTicker from '../components/watch/WatchBrandTicker';
import { getBrandUrl } from '../utils/brandUtils';
import WatchFilterSidebar from '../components/watch/WatchFilterSidebar';
import WatchProductGrid from '../components/watch/WatchProductGrid';
import WatchMobileFilterOverlay from '../components/watch/WatchMobileFilterOverlay';
import Pagination from '../components/watch/Pagination';
import { Breadcrumbs } from '../components/ProductPage/Breadcrumbs';
import { useProductContext } from '../context/ProductContext';

const ALL_WATCH_BRANDS = gql`
  query AllWatchBrands {
    allWatchBrands
  }
`;

const ALL_WATCH_GENDERS = gql`
  query AllWatchGenders {
    allWatchGenders
  }
`;

const WATCHES_QUERY = gql`
  query Watches($brand: String, $color: String, $gender: String, $sortOrder: String) {
    watches(brand: $brand, color: $color, gender: $gender, sortOrder: $sortOrder) {
      id
      brand
      name
      color
      salePrice
      marketPrice
      images
      gender
    }
  }
`;

const PRODUCTS_PER_PAGE = 21;

const WatchPage = () => {
  const { categoryData, isPreloaded, loadCategoryData, isCategoryLoaded } = useProductContext();
  
  // Mobile overlay tab state
  const [mobileOverlayTab, setMobileOverlayTab] = useState<'filter' | 'sort'>('filter');
  // State for filters
  const [showFilter, setShowFilter] = useState(true);
  const [sortBy, setSortBy] = useState('');
  const [priceRange, setPriceRange] = useState<[number, number]>([0, 50000]);
  const [selectedBrands, setSelectedBrands] = useState<string[]>([]);
  const [selectedColors, setSelectedColors] = useState<string[]>([]);
  const [selectedGenders, setSelectedGenders] = useState<string[]>([]);
  const [inStockOnly, setInStockOnly] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [shouldResetPriceRange, setShouldResetPriceRange] = useState(true);
  // Mobile detection
  const [isMobile, setIsMobile] = useState(false);
  
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const checkMobile = () => {
        const mobile = window.innerWidth < 900;
        setIsMobile(mobile);
        // Set initial filter state based on screen size
        if (mobile && showFilter) {
          setShowFilter(false); // Close filter on mobile by default
        } else if (!mobile && !showFilter) {
          setShowFilter(true); // Open filter on desktop by default
        }
      };
      checkMobile();
      window.addEventListener('resize', checkMobile);
      return () => window.removeEventListener('resize', checkMobile);
    }
  }, [showFilter]);

  // Fetch brands and genders
  const { data: brandsData } = useQuery(ALL_WATCH_BRANDS);
  const { data: gendersData } = useQuery(ALL_WATCH_GENDERS);
  
  const brands = brandsData?.allWatchBrands || [];
  const genders = gendersData?.allWatchGenders || [];

  // Load category data if not already loaded
  useEffect(() => {
    if (!isCategoryLoaded('watches')) {
      loadCategoryData('watches');
    }
  }, [loadCategoryData, isCategoryLoaded]);

  // Always fetch watches from the backend; we'll fall back to any cached/pre-loaded data only while the query is loading.
  const { data: watchesData, loading: apiLoading } = useQuery(WATCHES_QUERY, {
    variables: {
      brand: selectedBrands.length === 1 ? selectedBrands[0] : undefined,
      color: selectedColors.length === 1 ? selectedColors[0] : undefined,
      gender: selectedGenders.length === 1 ? selectedGenders[0] : undefined,
      sortOrder: sortBy === 'Price low to high' ? 'asc' : sortBy === 'Price high to low' ? 'desc' : undefined,
    },
    skip: false
  });

  // Use freshly fetched data when available, otherwise rely on the (limited) pre-loaded cache.
  // If the user hasn't chosen a price sort we default to the natural data order: ascending by (numeric) id.
  const watches = useMemo(() => {
    const list = (watchesData?.watches || categoryData.watches || []);
    if (sortBy === '') {
      return [...list].sort((a: any, b: any) => {
        const aId = parseInt(a.id, 10);
        const bId = parseInt(b.id, 10);
        // Fallback for non-numeric ids
        if (isNaN(aId) || isNaN(bId)) return 0;
        return aId - bId;
      });
    }
    return list;
  }, [watchesData, categoryData, sortBy]);

  // Derive unique colors and min/max prices from watches
  const allColors = useMemo(() => {
    const set = new Set<string>();
    watches.forEach((w: any) => {
      if (w.color) set.add(w.color);
    });
    return Array.from(set).sort();
  }, [watches]);
  
  const [minPrice, maxPrice] = useMemo(() => {
    let min = Infinity, max = -Infinity;
    watches.forEach((w: any) => {
      if (w.salePrice < min) min = w.salePrice;
      if (w.salePrice > max) max = w.salePrice;
    });
    if (!isFinite(min) || !isFinite(max)) return [0, 50000];
    return [Math.floor(min), Math.ceil(max)];
  }, [watches]);
  
  useEffect(() => {
    if (shouldResetPriceRange && (priceRange[0] !== minPrice || priceRange[1] !== maxPrice)) {
      setPriceRange([minPrice, maxPrice]);
      setShouldResetPriceRange(false);
    }
  }, [minPrice, maxPrice, shouldResetPriceRange, priceRange]);

  // Filter for in-stock (frontend, as backend does not support it)
  const filteredWatches = useMemo(() => {
    let filtered = watches;
    if (inStockOnly) filtered = filtered.filter((w: any) => w.inStock);
    return filtered;
  }, [watches, inStockOnly]);

  // Pagination
  const totalPages = Math.ceil(filteredWatches.length / PRODUCTS_PER_PAGE);
  const paginatedWatches = filteredWatches.slice(
    (currentPage - 1) * PRODUCTS_PER_PAGE,
    currentPage * PRODUCTS_PER_PAGE
  );

  // Brand ticker: show each brand with a representative image
  const brandTickerData = useMemo(() => {
    return brands.map((brand: string) => {
      const watch = watches.find((w: any) => w.brand === brand);
      return {
        name: brand,
        image: watch?.images?.[0] || '/image1.jpeg',
      };
    });
  }, [brands, watches]);

  // Handlers
  const handleBrandClick = (brand: string) => {
    setSelectedBrands(prev => {
      if (prev.length === 1 && prev[0] === brand) {
        return [];
      } else {
        return [brand];
      }
    });
    setCurrentPage(1);
    setShouldResetPriceRange(true);
  };
  
  const handleBrandChange = (brand: string) => {
    setSelectedBrands(prev =>
      prev.includes(brand) ? prev.filter(b => b !== brand) : [...prev, brand]
    );
    setCurrentPage(1);
    setShouldResetPriceRange(true);
  };
  
  const handleColorChange = (color: string) => {
    setSelectedColors(prev =>
      prev.includes(color) ? prev.filter(c => c !== color) : [...prev, color]
    );
    setCurrentPage(1);
    setShouldResetPriceRange(true);
  };
  
  const handleGenderChange = (gender: string) => {
    setSelectedGenders(prev =>
      prev.includes(gender) ? prev.filter(g => g !== gender) : [...prev, gender]
    );
    setCurrentPage(1);
    setShouldResetPriceRange(true);
  };
  
  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  // Prepare watch products for grid
  const watchProducts = paginatedWatches.map((w: any) => {
    return {
      id: w.id,
      brand: w.brand,
      productName: w.name,
      images: w.images,
      price: w.salePrice,
      marketPrice: w.marketPrice,
    };
  });

  const stickyBarRef = useRef<HTMLDivElement>(null);
  const gridContainerRef = useRef<HTMLDivElement>(null);
  const [gridScrollable, setGridScrollable] = useState(false);

  useEffect(() => {
    const stickyBar = stickyBarRef.current;
    if (!stickyBar) return;
    const observer = new window.IntersectionObserver(
      ([entry]) => {
        setGridScrollable(!entry.isIntersecting);
      },
      {
        root: null,
        threshold: 1.0,
        rootMargin: '-67px 0px 0px 0px',
      }
    );
    observer.observe(stickyBar);
    return () => observer.disconnect();
  }, []);

  // Determine loading state
  const isLoading = !isPreloaded && apiLoading;

  return (
    <div className="watch-page" style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', background: '#f1f1f1', paddingTop: 2, overflowX: 'hidden' }}>
      <Breadcrumbs items={[{ label: 'Home', href: '/' }, { label: 'Watches' }]} />
      <div style={{ marginTop: 0, width: '100%', maxWidth: '100%' }}>
        <WatchBrandTicker brands={brandTickerData} onBrandClick={handleBrandClick} currentPage="Watches" />
      </div>
      {/* Mobile UI: overlay and grid */}
      {isMobile ? (
        <>
          {/* Mobile Brand Selector */}
          <div style={{
            margin: '16px auto 0 auto',
            padding: '4px 16px 0 16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 8,
            overflowX: 'visible',
            minHeight: 48,
            marginBottom: 8,
            maxWidth: '100%',
          }}>
            {/* Brand buttons row with arrows - mobile optimized */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 0, flex: 'none', minHeight: 48, position: 'relative', maxWidth: '85vw' }}>
              <button
                aria-label="Scroll left"
                style={{
                  background: 'none',
                  border: 'none',
                  padding: '0 4px',
                  display: 'flex',
                  alignItems: 'center',
                  cursor: 'pointer',
                  height: 40,
                  marginRight: 2,
                }}
                onClick={() => {
                  const el = document.getElementById('brand-scroll-row-mobile');
                  if (el) el.scrollBy({ left: -120, behavior: 'smooth' });
                }}
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" style={{ width: 20, height: 20 }}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
                </svg>
              </button>
              <div id="brand-scroll-row-mobile" style={{ display: 'flex', gap: 8, overflowX: 'auto', flex: 'none', scrollbarWidth: 'none', msOverflowStyle: 'none', minHeight: 40, maxWidth: '75vw' }}>
                {brands.map((b: string) => (
                  <button
                    key={b}
                    onClick={() => window.location.href = `/watch/brand/${getBrandUrl(b)}`}
                    style={{
                      border: '2px solid #bfc9d1',
                      background: '#fff',
                      color: '#22304a',
                      borderRadius: 6,
                      padding: '6px 12px',
                      fontWeight: 500,
                      fontFamily: 'Inter, Segoe UI, Arial, sans-serif',
                      fontSize: '0.7rem',
                      cursor: 'pointer',
                      boxShadow: 'none',
                      borderBottom: '2.5px solid #bfc9d1',
                      minWidth: 100,
                      maxWidth: 160,
                      outline: 'none',
                      transition: 'border 0.15s, box-shadow 0.15s',
                      height: 40,
                      margin: 0,
                      whiteSpace: 'nowrap',
                      lineHeight: 1,
                      textAlign: 'center',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                    title={b}
                  >
                    <span style={{ display: 'block', maxWidth: 140, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{b}</span>
                  </button>
                ))}
              </div>
              <button
                aria-label="Scroll right"
                style={{
                  background: 'none',
                  border: 'none',
                  padding: '0 4px',
                  display: 'flex',
                  alignItems: 'center',
                  cursor: 'pointer',
                  height: 40,
                  marginLeft: 2,
                }}
                onClick={() => {
                  const el = document.getElementById('brand-scroll-row-mobile');
                  if (el) el.scrollBy({ left: 120, behavior: 'smooth' });
                }}
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" style={{ width: 20, height: 20 }}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
                </svg>
              </button>
            </div>
          </div>
          
          {/* Sticky mobile filter/sort bar */}
          <div style={{
            position: 'sticky',
            top: 62,
            zIndex: 50,
            background: '#f1f1f1',
            width: '100%',
            maxWidth: '100vw',
            margin: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '10px 0 0 0',
            minHeight: 54,
            boxSizing: 'border-box',
            border: 'none',
            boxShadow: '0 2px 8px rgba(30,167,253,0.04)'
          }}>
            <button
              style={{
                flex: 1,
                background: 'none',
                border: 'none',
                color: mobileOverlayTab === 'filter' ? '#22304a' : '#7a8ca3',
                fontSize: '1.13rem',
                fontWeight: 600,
                cursor: 'pointer',
                fontFamily: 'Montserrat',
                padding: '10px 0',
                borderBottom: mobileOverlayTab === 'filter' ? '2.5px solid #22304a' : '2.5px solid transparent',
                transition: 'color 0.2s, border-bottom 0.2s',
              }}
              onClick={() => {
                setMobileOverlayTab('filter');
                setShowFilter(true);
              }}
            >
              Filters
            </button>
            <button
              style={{
                flex: 1,
                background: 'none',
                border: 'none',
                color: mobileOverlayTab === 'sort' ? '#22304a' : '#7a8ca3',
                fontSize: '1.13rem',
                fontWeight: 600,
                cursor: 'pointer',
                fontFamily: 'Montserrat',
                padding: '10px 0',
                borderBottom: mobileOverlayTab === 'sort' ? '2.5px solid #22304a' : '2.5px solid transparent',
                transition: 'color 0.2s, border-bottom 0.2s',
              }}
              onClick={() => {
                setMobileOverlayTab('sort');
                setShowFilter(true);
              }}
            >
              Sort
            </button>
          </div>
          <WatchMobileFilterOverlay
            show={showFilter}
            onClose={() => setShowFilter(false)}
            sortBy={sortBy}
            onSortByChange={setSortBy}
            brands={brands}
            selectedBrands={selectedBrands}
            onBrandChange={handleBrandChange}
            colors={allColors}
            selectedColors={selectedColors}
            onColorChange={handleColorChange}
            genders={genders}
            selectedGenders={selectedGenders}
            onGenderChange={handleGenderChange}
            inStockOnly={inStockOnly}
            onInStockChange={setInStockOnly}
            tab={mobileOverlayTab}
            setTab={setMobileOverlayTab}
          />
          <div style={{ width: '100%', padding: '0 8px', marginTop: 0 }}>
            <WatchProductGrid products={watchProducts} loading={isLoading} />
            <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={handlePageChange} />
          </div>
        </>
      ) : (
        <>
          {/* Sticky header for Hide Filters button - now just below Navbar */}
          <div
            ref={stickyBarRef}
            style={{
              position: 'sticky',
              top: 90,
              zIndex: 30,
              background: '#f1f1f1',
              width: '100%',
              maxWidth: '100%',
              margin: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'flex-end',
              padding: '20px 60px 0 20px',
              minHeight: 60,
              boxSizing: 'border-box',
              border: 'none',
              boxShadow: '0 2px 8px rgba(30,167,253,0.04)'
            }}
          >
            <button
              style={{ background: 'none', border: 'none', color: '#22304a', fontSize: '1rem', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, fontFamily: 'Montserrat' }}
              onClick={() => setShowFilter(f => !f)}
              aria-label={showFilter ? 'Hide Filters' : 'Show Filters'}
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" style={{ width: 18, height: 18, marginRight: 2 }}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 6h9.75M10.5 6a1.5 1.5 0 1 1-3 0m3 0a1.5 1.5 0 1 0-3 0M3.75 6H7.5m3 12h9.75m-9.75 0a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m-3.75 0H7.5m9-6h3.75m-3.75 0a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m-9.75 0h9.75" />
              </svg>
              {showFilter ? 'Hide Filters' : 'Show Filters'}
            </button>
          </div>
          {/* Main content row: filter + cards grid */}
          <div style={{ display: 'flex', width: '100%', maxWidth: '100%', margin: 0, alignItems: 'flex-start', paddingTop: 0, position: 'relative', height: 'calc(100vh - 67px - 50px)' }}>
            <div style={{ position: 'sticky', top: 117, alignSelf: 'flex-start', zIndex: 20, height: 'calc(100vh - 117px)', overflowY: 'auto', marginTop: 0, marginLeft: 14, paddingTop: 0, background: '#f8f9fa' }}>
              <WatchFilterSidebar
                show={showFilter}
                onHide={() => setShowFilter(false)}
                sortBy={sortBy}
                onSortByChange={setSortBy}
                priceRange={priceRange}
                minPrice={minPrice}
                maxPrice={maxPrice}
                onPriceChange={setPriceRange}
                brands={brands}
                selectedBrands={selectedBrands}
                onBrandChange={handleBrandChange}
                colors={allColors}
                selectedColors={selectedColors}
                onColorChange={handleColorChange}
                genders={genders}
                selectedGenders={selectedGenders}
                onGenderChange={handleGenderChange}
                inStockOnly={inStockOnly}
                onInStockChange={setInStockOnly}
              />
            </div>
            <div
              ref={gridContainerRef}
              style={{
                flex: 1,
                padding: '0 32px',
                marginTop: -30,
                height: '100%',
                // Always allow interaction so pagination and other controls are clickable
                pointerEvents: 'auto',
              }}
            >
              <WatchProductGrid products={watchProducts} loading={isLoading} />
              <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={handlePageChange} />
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default WatchPage;