import React, { useState } from 'react';
import ProductGrid from '../components/ProductGrid';
import HeroBanner from '../components/HeroBanner';
import PromoStrip from '../components/PromoStrip';
import FilterBar from '../components/FilterBar';

export default function Home(){
  const [q, setQ] = useState('');
  const [filters, setFilters] = useState({ q:'', category:'Todas', min:'', max:'', brand:'' })

  return (
    <>
      <HeroBanner />
      <PromoStrip />
      <section className="container-edge py-8">
        <FilterBar value={filters} onChange={(v)=>{ setFilters(v); setQ(v.q||'') }} />
        <ProductGrid
          q={[q, filters.brand, filters.category!=='Todas'?filters.category:''].filter(Boolean).join(' ')}
          min={filters.min}
          max={filters.max}
          category={filters.category}
          brand={filters.brand}
        />
      </section>
    </>
  );
}
