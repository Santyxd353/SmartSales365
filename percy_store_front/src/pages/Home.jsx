import React from 'react'
import HeroBanner from '../components/HeroBanner'
import CategoryBar from '../components/CategoryBar'
import ProductGrid from '../components/ProductGrid'

export default function Home(){
  return (
    <div className="pb-12">
      <HeroBanner />
      <CategoryBar />
      <ProductGrid />
    </div>
  )
}