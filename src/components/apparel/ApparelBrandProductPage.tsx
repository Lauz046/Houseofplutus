import React, { useState, useMemo, useEffect, useRef } from 'react';
import { gql, useQuery } from '@apollo/client';
import Navbar from '../nav/Navbar';
import { Breadcrumbs } from '../ProductPage/Breadcrumbs';
import ApparelFilterSidebar from './ApparelFilterSidebar';
import ApparelProductGrid from './ApparelProductGrid';
import ApparelMobileFilterOverlay from './ApparelMobileFilterOverlay';
import BrandSelector from '../BrandSelector';
import Pagination from './Pagination';
import SearchOverlay from '../SearchOverlay';
import { getBrandUrl } from '../../utils/brandUtils';

const ALL_APPAREL_BRANDS = gql`
  query AllApparelBrands {
    allApparelBrands
  }
`;
const ALL_APPAREL_SUBCATEGORIES = gql`
  query AllApparelSubcategories {
    allApparelSubcategories
  }
`;
const ALL_APPAREL_GENDERS = gql`
  query AllApparelGenders {
    allApparelGenders
  }
`;
export const APPAREL_QUERY = gql`
  query Apparel($brand: String, $subcategory: String, $gender: String, $size: String, $sortOrder: String) {
    apparel(brand: $brand, subcategory: $subcategory, gender: $gender, size: $size, sortOrder: $sortOrder) {
      id
      brand
      productName
      subcategory
      gender
      sizePrices { size price }
      images
      inStock
    }
  }
`;
const PRODUCTS_PER_PAGE = 21;

export default function ApparelBrandProductPage({ brand, initialApparelData }: { brand: string, initialApparelData?: any[] }) {
  // Mobile overlay tab state
  const [mobileOverlayTab, setMobileOverlayTab] = useState<'filter' | 'sort'>('filter');
  const [showFilter, setShowFilter] = useState(true);
  const [sortBy, setSortBy] = useState('');
  const [priceRange, setPriceRange] = useState<[number, number]>([0, 50000]);
  const [selectedSizes, setSelectedSizes] = useState<string[]>([]);
  const [selectedSubcategories, setSelectedSubcategories] = useState<string[]>([]);
  const [selectedGenders, setSelectedGenders] = useState<string[]>([]);
  const [inStockOnly, setInStockOnly] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [shouldResetPriceRange, setShouldResetPriceRange] = useState(true);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
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

  const { data: brandsData } = useQuery(ALL_APPAREL_BRANDS);
  const { data: subcategoriesData } = useQuery(ALL_APPAREL_SUBCATEGORIES);
  const { data: gendersData } = useQuery(ALL_APPAREL_GENDERS);
  const brands = brandsData?.allApparelBrands || [];
  const subcategories = subcategoriesData?.allApparelSubcategories || [];
  const genders = gendersData?.allApparelGenders || [];

  const { data: apparelData, loading } = useQuery(APPAREL_QUERY, {
    variables: {
      brand,
      subcategory: selectedSubcategories.length === 1 ? selectedSubcategories[0] : undefined,
      gender: selectedGenders.length === 1 ? selectedGenders[0] : undefined,
      size: selectedSizes.length === 1 ? selectedSizes[0] : undefined,
      sortOrder: sortBy === 'Price low to high' ? 'asc' : sortBy === 'Price high to low' ? 'desc' : undefined,
    },
    fetchPolicy: initialApparelData ? 'cache-and-network' : 'cache-first',
    nextFetchPolicy: 'cache-first',
  });
  const apparels = apparelData?.apparel || initialApparelData || [];

  const allSizes = useMemo(() => {
    const set = new Set<string>();
    apparels.forEach((a: any) => a.sizePrices.forEach((sp: any) => set.add(sp.size)));
    return Array.from(set).sort();
  }, [apparels]);
  const [minPrice, maxPrice] = useMemo(() => {
    let min = Infinity, max = -Infinity;
    apparels.forEach((a: any) => a.sizePrices.forEach((sp: any) => {
      if (sp.price < min) min = sp.price;
      if (sp.price > max) max = sp.price;
    }));
    if (!isFinite(min) || !isFinite(max)) return [0, 50000];
    return [Math.floor(min), Math.ceil(max)];
  }, [apparels]);
  useEffect(() => {
    if (shouldResetPriceRange && (priceRange[0] !== minPrice || priceRange[1] !== maxPrice)) {
      setPriceRange([minPrice, maxPrice]);
      setShouldResetPriceRange(false);
    }
  }, [minPrice, maxPrice, shouldResetPriceRange]);

  const filteredApparels = useMemo(() => {
    let filtered = apparels;
    if (inStockOnly) filtered = filtered.filter((a: any) => a.inStock);
    return filtered;
  }, [apparels, inStockOnly]);

  const totalPages = Math.ceil(filteredApparels.length / PRODUCTS_PER_PAGE);
  const paginatedApparels = filteredApparels.slice(
    (currentPage - 1) * PRODUCTS_PER_PAGE,
    currentPage * PRODUCTS_PER_PAGE
  );

  const apparelProducts = paginatedApparels.map((a: any) => {
    const lowest = a.sizePrices.reduce((min: number, sp: any) => sp.price < min ? sp.price : min, Infinity);
    return {
      id: a.id,
      brand: a.brand,
      productName: a.productName,
      images: a.images,
      price: lowest,
    };
  });

  // Brand ticker data for mobile
  const brandTickerData = useMemo(() => {
    return brands.map((brandName: string) => {
      const apparel = apparels.find((a: any) => a.brand === brandName);
      return {
        name: brandName,
        image: apparel?.images?.[0] || '/image1.jpeg',
      };
    });
  }, [brands, apparels]);

  // Handlers
  const handleBrandClick = (brandName: string) => {
    if (brandName !== brand) {
      window.location.href = `/apparel/brand/${getBrandUrl(brandName)}`;
    }
  };

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

  if (loading) return <div>Loading...</div>;

  return (
    <>
      <Navbar onSearchClick={() => setIsSearchOpen(true)} />
      <SearchOverlay isOpen={isSearchOpen} onClose={() => setIsSearchOpen(false)} />
      
      {/* Mobile UI */}
      {isMobile ? (
        <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', background: '#f1f1f1', paddingTop: 2, overflowX: 'hidden' }}>
          {/* Static image banner */}
          <div style={{ width: '100vw', maxWidth: '100%', height: 250, overflow: 'hidden', background: '#eee', position: 'relative' }}>
            <img src="/static.jpg" alt="Brand Banner" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
            <div style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -30%)',
              color: 'rgba(255, 255, 255, 0.85)',
              fontSize: '2.5rem',
              fontWeight: '600',
              textAlign: 'center',
              textShadow: '1px 1px 4px rgba(0,0,0,0.3), 0 0 20px rgba(255,255,255,0.2)',
              fontFamily: 'Montserrat, Arial, sans-serif',
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
              zIndex: 2,
              opacity: 0.9
            }}>
              {brand}
            </div>
          </div>
          
          <div style={{ padding: '0 16px', marginTop: 16 }}>
            <Breadcrumbs items={[{ label: 'Home', href: '/' }, { label: 'Apparel', href: '/apparel' }, { label: brand }]} />
          </div>
          
          {/* Mobile Brand Selector - Desktop style but smaller */}
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
                    onClick={() => {
                      if (b !== brand) window.location.href = `/apparel/brand/${getBrandUrl(b)}`;
                    }}
                    style={{
                      border: b === brand ? '2px solid #22304a' : '2px solid #bfc9d1',
                      background: '#fff',
                      color: '#22304a',
                      borderRadius: 6,
                      padding: '6px 12px',
                      fontWeight: 500,
                      fontFamily: 'Inter, Segoe UI, Arial, sans-serif',
                      fontSize: '0.7rem',
                      cursor: 'pointer',
                      boxShadow: b === brand ? '0 2px 8px rgba(30,167,253,0.08)' : 'none',
                      borderBottom: b === brand ? '2.5px solid #0a2230' : '2.5px solid #bfc9d1',
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
          
          <ApparelMobileFilterOverlay
            show={showFilter}
            onClose={() => setShowFilter(false)}
            sortBy={sortBy}
            onSortByChange={setSortBy}
            brands={brands}
            selectedBrands={[brand]}
            onBrandChange={() => {}}
            sizes={allSizes}
            selectedSizes={selectedSizes}
            onSizeChange={size => setSelectedSizes(prev =>
              prev.includes(size) ? prev.filter(s => s !== size) : [...prev, size]
            )}
            subcategories={subcategories}
            selectedSubcategories={selectedSubcategories}
            onSubcategoryChange={subcategory => setSelectedSubcategories(prev =>
              prev.includes(subcategory) ? prev.filter(s => s !== subcategory) : [...prev, subcategory]
            )}
            genders={genders}
            selectedGenders={selectedGenders}
            onGenderChange={gender => setSelectedGenders(prev =>
              prev.includes(gender) ? prev.filter(g => g !== gender) : [...prev, gender]
            )}
            inStockOnly={inStockOnly}
            onInStockChange={setInStockOnly}
            tab={mobileOverlayTab}
            setTab={setMobileOverlayTab}
          />
          
          <div style={{ width: '100%', padding: '0 8px', marginTop: 0 }}>
            <ApparelProductGrid 
              products={apparelProducts}
              mobile
              loading={loading}
            />
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={setCurrentPage}
            />
          </div>
        </div>
      ) : (
        <>
          {/* Desktop UI - unchanged */}
          {/* Static image banner */}
          <div style={{ width: '100vw', maxWidth: '100%', height: 350, overflow: 'hidden', background: '#eee', position: 'relative' }}>
            <img src="/static.jpg" alt="Brand Banner" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
            <div style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -30%)',
              color: 'rgba(255, 255, 255, 0.85)',
              fontSize: '3.5rem',
              fontWeight: '600',
              textAlign: 'center',
              textShadow: '1px 1px 4px rgba(0,0,0,0.3), 0 0 20px rgba(255,255,255,0.2)',
              fontFamily: 'Montserrat, Arial, sans-serif',
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
              zIndex: 2,
              opacity: 0.9
            }}>
              {brand}
            </div>
          </div>
          {/* Breadcrumbs */}
          <div style={{ maxWidth: 1500, margin: '0 auto', padding: '24px 32px 0 32px' }}>
            <Breadcrumbs
              items={[
                { label: 'Home', href: '/' },
                { label: 'Apparel', href: '/apparel' },
                { label: brand }
              ]}
            />
          </div>
          {/* Brand Selector and Hide Filter in one line, matching accessories exactly */}
          <div ref={stickyBarRef} style={{
            maxWidth: 1500,
            margin: '0 auto',
            padding: '4px 32px 0 32px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 16,
            overflowX: 'visible',
            minHeight: 56,
            marginBottom: 18,
          }}>
            {/* Brand buttons row with arrows, exactly as accessories */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 0, flex: 'none', minHeight: 56, position: 'relative', maxWidth: '80vw' }}>
              <button
                aria-label="Scroll left"
                style={{
                  background: 'none',
                  border: 'none',
                  padding: '0 8px',
                  display: 'flex',
                  alignItems: 'center',
                  cursor: 'pointer',
                  height: 48,
                  marginRight: 4,
                }}
                onClick={() => {
                  const el = document.getElementById('brand-scroll-row');
                  if (el) el.scrollBy({ left: -180, behavior: 'smooth' });
                }}
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" style={{ width: 28, height: 28 }}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
                </svg>
              </button>
              <div id="brand-scroll-row" style={{ display: 'flex', gap: 14, overflowX: 'auto', flex: 'none', scrollbarWidth: 'none', msOverflowStyle: 'none', minHeight: 48, maxWidth: '70vw' }}>
                {brands.map((b: string) => (
                  <button
                    key={b}
                    onClick={() => {
                      if (b !== brand) window.location.href = `/apparel/brand/${getBrandUrl(b)}`;
                    }}
                    style={{
                      border: b === brand ? '2px solid #22304a' : '2px solid #bfc9d1',
                      background: '#fff',
                      color: '#22304a',
                      borderRadius: 8,
                      padding: '8px 18px',
                      fontWeight: 500,
                      fontFamily: 'Inter, Segoe UI, Arial, sans-serif',
                      fontSize: '0.8rem',
                      cursor: 'pointer',
                      boxShadow: b === brand ? '0 2px 8px rgba(30,167,253,0.08)' : 'none',
                      borderBottom: b === brand ? '2.5px solid #0a2230' : '2.5px solid #bfc9d1',
                      minWidth: 200,
                      maxWidth: 400,
                      outline: 'none',
                      transition: 'border 0.15s, box-shadow 0.15s',
                      height: 48,
                      margin: 0,
                      marginBottom: 0,
                      marginTop: 0,
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
                    <span style={{ display: 'block', maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{b}</span>
                  </button>
                ))}
              </div>
              <button
                aria-label="Scroll right"
                style={{
                  background: 'none',
                  border: 'none',
                  padding: '0 8px',
                  display: 'flex',
                  alignItems: 'center',
                  cursor: 'pointer',
                  height: 48,
                  marginLeft: 4,
                }}
                onClick={() => {
                  const el = document.getElementById('brand-scroll-row');
                  if (el) el.scrollBy({ left: 180, behavior: 'smooth' });
                }}
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" style={{ width: 28, height: 28 }}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
                </svg>
              </button>
            </div>
            {/* Hide Filter button with new SVG, fixed at end */}
            <button
              style={{
                background: 'none',
                border: 'none',
                color: '#22304a',
                fontSize: '1.13rem',
                fontWeight: 600,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                fontFamily: 'Montserrat',
                marginLeft: 16,
                whiteSpace: 'nowrap',
                height: 40,
                flex: 'none',
              }}
              onClick={() => setShowFilter(f => !f)}
              aria-label={showFilter ? 'Hide Filters' : 'Show Filters'}
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" style={{ width: 24, height: 24, marginRight: 2 }}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 3c2.755 0 5.455.232 8.083.678.533.09.917.556.917 1.096v1.044a2.25 2.25 0 0 1-.659 1.591l-5.432 5.432a2.25 2.25 0 0 0-.659 1.591v2.927a2.25 2.25 0 0 1-1.244 2.013L9.75 21v-6.568a2.25 2.25 0 0 0-.659-1.591L3.659 7.409A2.25 2.25 0 0 1 3 5.818V4.774c0-.54.384-1.006.917-1.096A48.32 48.32 0 0 1 12 3Z" />
              </svg>
              Hide Filters
            </button>
          </div>
          {/* Main content row: filter + cards grid */}
          <div style={{ display: 'flex', width: '100%', maxWidth: '100%', margin: 0, alignItems: 'flex-start', paddingTop: 0, position: 'relative' }}>
            <div style={{ 
              position: 'sticky', 
              top: 107, 
              alignSelf: 'flex-start', 
              zIndex: 20, 
              height: 'calc(100vh - 107px)', 
              overflowY: 'auto', 
              marginTop: 0, 
              marginLeft: 14, 
              paddingTop: 0, 
              background: '#f8f9fa', 
              width: showFilter ? 280 : 0,
              flexShrink: 0,
              transition: 'width 0.3s ease',
              overflow: 'hidden'
            }}>
              <ApparelFilterSidebar
                show={showFilter}
                onHide={() => setShowFilter(false)}
                sortBy={sortBy}
                onSortByChange={setSortBy}
                priceRange={priceRange}
                minPrice={minPrice}
                maxPrice={maxPrice}
                onPriceChange={setPriceRange}
                brands={brands}
                selectedBrands={[brand]}
                onBrandChange={() => {}}
                sizes={allSizes}
                selectedSizes={selectedSizes}
                onSizeChange={size => setSelectedSizes(prev =>
                  prev.includes(size) ? prev.filter(s => s !== size) : [...prev, size]
                )}
                subcategories={subcategories}
                selectedSubcategories={selectedSubcategories}
                onSubcategoryChange={subcategory => setSelectedSubcategories(prev =>
                  prev.includes(subcategory) ? prev.filter(s => s !== subcategory) : [...prev, subcategory]
                )}
                genders={genders}
                selectedGenders={selectedGenders}
                onGenderChange={gender => setSelectedGenders(prev =>
                  prev.includes(gender) ? prev.filter(g => g !== gender) : [...prev, gender]
                )}
                inStockOnly={inStockOnly}
                onInStockChange={setInStockOnly}
              />
            </div>
            <div style={{ 
              flex: 1, 
              padding: '0 32px', 
              marginTop: -30,
              transition: 'margin-left 0.3s ease',
              marginLeft: showFilter ? 0 : -14
            }}>
              <ApparelProductGrid 
                products={apparelProducts}
                loading={loading}
              />
              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={setCurrentPage}
              />
            </div>
          </div>
        </>
      )}
    </>
  );
}