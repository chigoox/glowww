"use client"
// Removed NextUI Button
import React, { useEffect, useState } from 'react'
import { AiFillPlusSquare } from 'react-icons/ai'
import { ProductAddEdit } from '../Support/ProductAddEdit'
import ProductsListAdmin from '../Support/ProductsListAdmin'

export const AdminProduct = ({SITEINFO, productId }) => {
    const [ProductWindow, setProductWindow] = useState(false)
    const [selectedProductData, setSelectedProductData] = useState({})
    const [filter, setFilter] = useState(false)

    // If deep-linked with productId, request ProductsList to select/open it via localStorage bridge
    useEffect(() => {
        if (productId) {
            try { localStorage.setItem('admin.product.openId', productId); } catch {}
        }
    }, [productId])

    return (
        <div>
            {ProductWindow == 'openNew' && <ProductAddEdit  SITEINFO={SITEINFO} setWindow={setProductWindow} openType={'openNew'} />}
            {ProductWindow == 'openEdit' && <ProductAddEdit SITEINFO={SITEINFO} defualt={selectedProductData} setWindow={setProductWindow} openType={'openEdit'} />}
            <div className='between'>
                <button onClick={() => { setProductWindow('openNew') }} className='ADD-NEW-BUTTON h-6 mb-10  w-fit p-2 bg-white rounded min-w-0'><AiFillPlusSquare color='blue' size={24} /></button>
            </div>
            <ProductsListAdmin window={ProductWindow} filter={filter} setWidow={setProductWindow} setSelectedProductData={setSelectedProductData} />
        </div >
    )
}
