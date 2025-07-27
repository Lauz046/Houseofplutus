import React, { useState, useEffect, useMemo, useRef } from 'react';
import SneakerMobileFilterOverlay from '../components/sneaker/SneakerMobileFilterOverlay';
import { gql, useQuery } from '@apollo/client';
import BrandTicker from '../components/sneaker/BrandTicker';
import { getBrandUrl } from '../utils/brandUtils';
import SneakerFilterSidebar from '../components/sneaker/SneakerFilterSidebar';
import SneakerProductGrid from '../components/sneaker/SneakerProductGrid';
import Pagination from '../components/sneaker/Pagination';
import { Breadcrumbs } from '../components/ProductPage/Breadcrumbs';
import { useProductContext } from '../context/ProductContext';

const ALL_SNEAKER_BRANDS = gql`
  query AllSneakerBrands {
    allSneakerBrands
  }
`;

const SNEAKERS_QUERY = gql`
  query Sneakers($brand: String, $size: String, $sortOrder: String, $limit: Int, $offset: Int) {
    sneakers(brand: $brand, size: $size, sortOrder: $sortOrder, limit: $limit, offset: $offset) {
      id
      brand
      productName
      sizePrices { size price }
      images
      soldOut
    }
  }
`;

const ALL_SNEAKER_SIZES = gql`
  query AllSneakerSizes($brand: String) {
    allSneakerSizes(brand: $brand)
  }
`;

const PRODUCTS_PER_PAGE = 21;

const SneakerPage = () => {
  const { categoryData, isPreloaded, loadCategoryData, isCategoryLoaded } = useProductContext();
  
  // Mobile overlay tab state
  const [mobileOverlayTab, setMobileOverlayTab] = useState<'filter' | 'sort'>('filter');
  // State for filters
  const [showFilter, setShowFilter] = useState(true);
  const [sortBy, setSortBy] = useState('');
  const [priceRange, setPriceRange] = useState<[number, number]>([0, 50000]);
  const [selectedBrands, setSelectedBrands] = useState<string[]>([]);
  const [selectedSizes, setSelectedSizes] = useState<string[]>([]);
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

  // Fetch brands
  const { data: brandsData } = useQuery(ALL_SNEAKER_BRANDS);
  const brands: string[] = React.useMemo(() => brandsData?.allSneakerBrands || [], [brandsData]);

  // Load category data if not already loaded
  useEffect(() => {
    if (!isCategoryLoaded('sneakers')) {
      loadCategoryData('sneakers');
    }
  }, [loadCategoryData, isCategoryLoaded]);

  // Determine if we should use preloaded data or fetch from API
  const shouldUsePreloadedData = isPreloaded && 
    selectedBrands.length === 0 && 
    selectedSizes.length === 0 && 
    sortBy === '' && 
    currentPage === 1;

  // Use pre-loaded data if available, otherwise fetch from API
  const { data: sneakersData, loading: apiLoading } = useQuery(SNEAKERS_QUERY, {
    variables: {
      brand: selectedBrands.length === 1 ? selectedBrands[0] : undefined,
      size: selectedSizes.length === 1 ? selectedSizes[0] : undefined,
      sortOrder: sortBy === 'Price low to high' ? 'asc' : sortBy === 'Price high to low' ? 'desc' : undefined,
      limit: PRODUCTS_PER_PAGE,
      offset: (currentPage - 1) * PRODUCTS_PER_PAGE,
    },
    skip: shouldUsePreloadedData
  });

  // Use pre-loaded data when no filters are applied
  const sneakers: Array<{
    id: string;
    brand: string;
    productName: string;
    sizePrices: Array<{ size: string; price: number }>;
    images: string[];
    soldOut: boolean;
  }> = React.useMemo(() => {
    if (shouldUsePreloadedData) {
      return categoryData.sneakers || [];
    }
    return sneakersData?.sneakers || [];
  }, [shouldUsePreloadedData, categoryData.sneakers, sneakersData?.sneakers]);

  const { data: allSizesData } = useQuery(ALL_SNEAKER_SIZES, { 
    variables: { brand: selectedBrands.length === 1 ? selectedBrands[0] : undefined },
    skip: shouldUsePreloadedData
  });
  const allSizes = allSizesData?.allSneakerSizes || [];

  // Derive min/max prices from sneakers
  const [minPrice, maxPrice] = useMemo(() => {
    let min = Infinity, max = -Infinity;
    sneakers.forEach((s) => s.sizePrices.forEach((sp) => {
      if (sp.price < min) min = sp.price;
      if (sp.price > max) max = sp.price;
    }));
    if (!isFinite(min) || !isFinite(max)) return [0, 50000];
    return [Math.floor(min), Math.ceil(max)];
  }, [sneakers]);
  
  useEffect(() => {
    if (shouldResetPriceRange && (priceRange[0] !== minPrice || priceRange[1] !== maxPrice)) {
      setPriceRange([minPrice, maxPrice]);
      setShouldResetPriceRange(false);
    }
  }, [minPrice, maxPrice, shouldResetPriceRange, priceRange]);

  // Pagination (now backend-driven)
  const totalPages = sneakers.length === PRODUCTS_PER_PAGE ? currentPage + 1 : currentPage;
  const paginatedSneakers = sneakers;

  // Brand ticker: show each brand with a representative image
  const brandTickerData = useMemo(() => {
    return brands.map((brand) => {
      const sneaker = sneakers.find((s) => s.brand === brand);
      return {
        name: brand,
        image: sneaker?.images?.[0] || '/image1.jpeg',
      };
    });
  }, [brands, sneakers]);

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
  
  const handleSizeChange = (size: string) => {
    setSelectedSizes(prev =>
      prev.includes(size) ? prev.filter(s => s !== size) : [...prev, size]
    );
    setCurrentPage(1);
    setShouldResetPriceRange(true);
  };
  
  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  // Prepare sneaker products for grid (lowest price per sneaker)
  const sneakerProducts = paginatedSneakers.map((s: {
    id: string;
    brand: string;
    productName: string;
    sizePrices: Array<{ size: string; price: number }>;
    images: string[];
    soldOut: boolean;
  }) => {
    const lowest = s.sizePrices.reduce((min: number, sp: { size: string; price: number }) => sp.price < min ? sp.price : min, Infinity);
    return {
      id: s.id,
      brand: s.brand,
      productName: s.productName,
      images: s.images,
      price: lowest,
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
    <div className="sneaker-page" style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', background: '#f1f1f1', paddingTop: 2, overflowX: 'hidden' }}>
      <Breadcrumbs items={[{ label: 'Home', href: '/' }, { label: 'Sneakers' }]} />
      <div style={{ marginTop: 0, width: '100%', maxWidth: '100%' }}>
        <BrandTicker brands={brandTickerData} onBrandClick={handleBrandClick} currentPage="Sneakers" />
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
                    onClick={() => window.location.href = `/sneaker/brand/${getBrandUrl(b)}`}
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
          <SneakerMobileFilterOverlay
            show={showFilter}
            onClose={() => setShowFilter(false)}
            sortBy={sortBy}
            onSortByChange={setSortBy}
            brands={brands}
            selectedBrands={selectedBrands}
            onBrandChange={handleBrandChange}
            sizes={allSizes}
            selectedSizes={selectedSizes}
            onSizeChange={handleSizeChange}
            inStockOnly={inStockOnly}
            onInStockChange={setInStockOnly}
            tab={mobileOverlayTab}
            setTab={setMobileOverlayTab}
          />
          <div style={{ width: '100%', padding: '0 8px', marginTop: 0 }}>
            <SneakerProductGrid 
              products={sneakerProducts}
              mobile
              loading={isLoading}
            />
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
              <SneakerFilterSidebar
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
                sizes={allSizes}
                selectedSizes={selectedSizes}
                onSizeChange={handleSizeChange}
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
                overflowY: gridScrollable ? 'auto' : 'hidden',
                pointerEvents: gridScrollable ? 'auto' : 'none',
              }}
            >
              <SneakerProductGrid 
                products={sneakerProducts}
                loading={isLoading}
              />
              <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={handlePageChange} />
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default SneakerPage;