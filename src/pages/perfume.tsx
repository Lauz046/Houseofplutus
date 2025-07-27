import React, { useState, useEffect, useMemo, useRef } from 'react';
import { gql, useQuery } from '@apollo/client';

import PerfumeBrandTicker from '../components/perfume/PerfumeBrandTicker';
import { getBrandUrl } from '../utils/brandUtils';
import PerfumeFilterSidebar from '../components/perfume/PerfumeFilterSidebar';
import PerfumeProductGrid from '../components/perfume/PerfumeProductGrid';
import PerfumeMobileFilterOverlay from '../components/perfume/PerfumeMobileFilterOverlay';
import Pagination from '../components/perfume/Pagination';
import { Breadcrumbs } from '../components/ProductPage/Breadcrumbs';
import { useProductContext } from '../context/ProductContext';

const ALL_PERFUME_BRANDS = gql`
  query AllPerfumeBrands {
    allPerfumeBrands
  }
`;

const ALL_PERFUME_SUBCATEGORIES = gql`
  query AllPerfumeSubcategories {
    allPerfumeSubcategories
  }
`;

const ALL_PERFUME_FRAGRANCE_FAMILIES = gql`
  query AllPerfumeFragranceFamilies {
    allPerfumeFragranceFamilies
  }
`;

const PERFUMES_QUERY = gql`
  query Perfumes($brand: String, $fragranceFamily: String, $concentration: String, $subcategory: String, $size: String, $sortOrder: String) {
    perfumes(brand: $brand, fragranceFamily: $fragranceFamily, concentration: $concentration, subcategory: $subcategory, size: $size, sortOrder: $sortOrder) {
      id
      brand
      title
      fragranceFamily
      concentration
      subcategory
      variants { size price }
      images
    }
  }
`;

const PRODUCTS_PER_PAGE = 21;

const PerfumePage = () => {
  const { categoryData, isPreloaded, loadCategoryData, isCategoryLoaded } = useProductContext();
  
  // Mobile overlay tab state
  const [mobileOverlayTab, setMobileOverlayTab] = useState<'filter' | 'sort'>('filter');
  // State for filters
  const [showFilter, setShowFilter] = useState(true);
  const [sortBy, setSortBy] = useState('');
  const [priceRange, setPriceRange] = useState<[number, number]>([0, 50000]);
  const [selectedBrands, setSelectedBrands] = useState<string[]>([]);
  const [selectedSubcategories, setSelectedSubcategories] = useState<string[]>([]);
  const [selectedConcentrations, setSelectedConcentrations] = useState<string[]>([]);
  const [selectedFragranceFamilies, setSelectedFragranceFamilies] = useState<string[]>([]);
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

  // Fetch brands, subcategories, and fragrance families
  const { data: brandsData } = useQuery(ALL_PERFUME_BRANDS);
  const { data: subcategoriesData } = useQuery(ALL_PERFUME_SUBCATEGORIES);
  const { data: fragranceFamiliesData } = useQuery(ALL_PERFUME_FRAGRANCE_FAMILIES);
  
  const brands = brandsData?.allPerfumeBrands || [];
  const subcategories = subcategoriesData?.allPerfumeSubcategories || [];
  const fragranceFamilies = fragranceFamiliesData?.allPerfumeFragranceFamilies || [];

  // Load category data if not already loaded
  useEffect(() => {
    if (!isCategoryLoaded('perfumes')) {
      loadCategoryData('perfumes');
    }
  }, [loadCategoryData, isCategoryLoaded]);

  // Determine if we should use preloaded data or fetch from API
  const shouldUsePreloadedData = isPreloaded && 
    selectedBrands.length === 0 && 
    selectedSubcategories.length === 0 && 
    selectedConcentrations.length === 0 && 
    selectedFragranceFamilies.length === 0 && 
    selectedSizes.length === 0 && 
    sortBy === '' && 
    currentPage === 1;

  // Fetch perfumes with filters
  const { data: perfumesData, loading: apiLoading } = useQuery(PERFUMES_QUERY, {
    variables: {
      brand: selectedBrands.length === 1 ? selectedBrands[0] : undefined,
      subcategory: selectedSubcategories.length === 1 ? selectedSubcategories[0] : undefined,
      concentration: selectedConcentrations.length === 1 ? selectedConcentrations[0] : undefined,
      fragranceFamily: selectedFragranceFamilies.length === 1 ? selectedFragranceFamilies[0] : undefined,
      size: selectedSizes.length === 1 ? selectedSizes[0] : undefined,
      sortOrder: sortBy === 'Price low to high' ? 'asc' : sortBy === 'Price high to low' ? 'desc' : undefined,
    },
    skip: shouldUsePreloadedData
  });
  
  const perfumes = shouldUsePreloadedData ? (categoryData.perfumes || []) : (perfumesData?.perfumes || []);

  // Derive unique concentrations, sizes and min/max prices from perfumes
  const allConcentrations = useMemo(() => {
    const set = new Set<string>();
    perfumes.forEach((p: any) => {
      if (p.concentration && typeof p.concentration === 'string' && p.concentration.trim() !== '') {
        set.add(p.concentration.trim());
      }
    });
    return Array.from(set).sort();
  }, [perfumes]);

  const allSizes = useMemo(() => {
    const set = new Set<string>();
    perfumes.forEach((p: any) => {
      if (p.variants) {
        p.variants.forEach((v: any) => {
          if (v.size) set.add(v.size);
        });
      }
    });
    return Array.from(set).sort();
  }, [perfumes]);
  
  const [minPrice, maxPrice] = useMemo(() => {
    let min = Infinity, max = -Infinity;
    perfumes.forEach((p: any) => {
      if (p.variants) {
        p.variants.forEach((v: any) => {
          if (v.price < min) min = v.price;
          if (v.price > max) max = v.price;
        });
      }
    });
    if (!isFinite(min) || !isFinite(max)) return [0, 50000];
    return [Math.floor(min), Math.ceil(max)];
  }, [perfumes]);
  
  useEffect(() => {
    if (shouldResetPriceRange && (priceRange[0] !== minPrice || priceRange[1] !== maxPrice)) {
      setPriceRange([minPrice, maxPrice]);
      setShouldResetPriceRange(false);
    }
  }, [minPrice, maxPrice, shouldResetPriceRange, priceRange]);

  // Filter for in-stock (frontend, as backend does not support it)
  const filteredPerfumes = useMemo(() => {
    let filtered = perfumes;
    if (inStockOnly) filtered = filtered.filter((p: any) => p.inStock);
    return filtered;
  }, [perfumes, inStockOnly]);

  // Pagination
  const totalPages = Math.ceil(filteredPerfumes.length / PRODUCTS_PER_PAGE);
  const paginatedPerfumes = filteredPerfumes.slice(
    (currentPage - 1) * PRODUCTS_PER_PAGE,
    currentPage * PRODUCTS_PER_PAGE
  );

  // Brand ticker: show each brand with a representative image
  const brandTickerData = useMemo(() => {
    return brands.map((brand: string) => {
      const perfume = perfumes.find((p: any) => p.brand === brand);
      return {
        name: brand,
        image: perfume?.images?.[0] || '/image1.jpeg',
      };
    });
  }, [brands, perfumes]);

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
  
  const handleSubcategoryChange = (subcategory: string) => {
    setSelectedSubcategories(prev =>
      prev.includes(subcategory) ? prev.filter(s => s !== subcategory) : [...prev, subcategory]
    );
    setCurrentPage(1);
    setShouldResetPriceRange(true);
  };
  
  const handleConcentrationChange = (concentration: string) => {
    setSelectedConcentrations(prev =>
      prev.includes(concentration) ? prev.filter(c => c !== concentration) : [...prev, concentration]
    );
    setCurrentPage(1);
    setShouldResetPriceRange(true);
  };
  
  const handleFragranceFamilyChange = (fragranceFamily: string) => {
    setSelectedFragranceFamilies(prev =>
      prev.includes(fragranceFamily) ? prev.filter(f => f !== fragranceFamily) : [...prev, fragranceFamily]
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

  // Prepare perfume products for grid (lowest price per perfume)
  const perfumeProducts = paginatedPerfumes.map((p: any) => {
    const lowest = p.variants ? p.variants.reduce((min: number, v: any) => v.price < min ? v.price : min, Infinity) : 0;
    return {
      id: p.id,
      brand: p.brand,
      productName: p.title,
      images: p.images,
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
    <div className="perfume-page" style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', background: '#f1f1f1', paddingTop: 2, overflowX: 'hidden' }}>
      <Breadcrumbs items={[{ label: 'Home', href: '/' }, { label: 'Perfumes' }]} />
      <div style={{ marginTop: 0, width: '100%', maxWidth: '100%' }}>
        <PerfumeBrandTicker brands={brandTickerData} onBrandClick={handleBrandClick} currentPage="Perfumes" />
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
                    onClick={() => window.location.href = `/perfume/brand/${getBrandUrl(b)}`}
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
          <PerfumeMobileFilterOverlay
            show={showFilter}
            onClose={() => setShowFilter(false)}
            sortBy={sortBy}
            onSortByChange={setSortBy}
            brands={brands}
            selectedBrands={selectedBrands}
            onBrandChange={handleBrandChange}
            subcategories={subcategories}
            selectedSubcategories={selectedSubcategories}
            onSubcategoryChange={handleSubcategoryChange}
            concentrations={allConcentrations}
            selectedConcentrations={selectedConcentrations}
            onConcentrationChange={handleConcentrationChange}
            fragranceFamilies={fragranceFamilies}
            selectedFragranceFamilies={selectedFragranceFamilies}
            onFragranceFamilyChange={handleFragranceFamilyChange}
            sizes={allSizes}
            selectedSizes={selectedSizes}
            onSizeChange={handleSizeChange}
            inStockOnly={inStockOnly}
            onInStockChange={setInStockOnly}
            tab={mobileOverlayTab}
            setTab={setMobileOverlayTab}
          />
          <div style={{ width: '100%', padding: '0 8px', marginTop: 0 }}>
            <PerfumeProductGrid products={perfumeProducts} mobile loading={isLoading} />
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
              <PerfumeFilterSidebar
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
                subcategories={subcategories}
                selectedSubcategories={selectedSubcategories}
                onSubcategoryChange={handleSubcategoryChange}
                concentrations={allConcentrations}
                selectedConcentrations={selectedConcentrations}
                onConcentrationChange={handleConcentrationChange}
                fragranceFamilies={fragranceFamilies}
                selectedFragranceFamilies={selectedFragranceFamilies}
                onFragranceFamilyChange={handleFragranceFamilyChange}
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
              <PerfumeProductGrid products={perfumeProducts} loading={isLoading} />
              <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={handlePageChange} />
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default PerfumePage;