import React, { useEffect, useState } from 'react'
import { listProducts, addToCart } from '../api'
import ProductCard from './ProductCard'

export default function ProductGrid(){
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(()=>{
    (async ()=>{
      try{
        const data = await listProducts()
        setItems(data)
      }catch(e){
        setError('No se pudo cargar el catálogo.')
      }finally{
        setLoading(false)
      }
    })()
  }, [])

  async function handleAdd(p){
    try{
      await addToCart(p.id, 1)
      alert('Agregado al carrito ✅')
    }catch(e){
      alert('Inicia sesión para agregar al carrito.')
    }
  }

  if(loading) return <div className="container-edge py-10">Cargando productos...</div>
  if(error) return <div className="container-edge py-10 text-red-600">{error}</div>

  return (
    <section className="container-edge my-6">
      <h2 className="text-xl font-bold mb-3">El momento es ahorrar </h2>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
        {items.map(p => <ProductCard key={p.id} p={p} onAdd={handleAdd} />)}
      </div>
    </section>
  )
}