import React, { useEffect, useState } from 'react'

import { useUploader } from "../../Hooks/useUploader"
import { filterNullFromArray as filterObject } from "../../myCodes/Util"
import axios from 'axios'
import { message } from 'antd'
import { db } from '@/lib/firebase'
import { doc, getDoc, updateDoc } from 'firebase/firestore'
import { getAuth } from 'firebase/auth'

export const useCreateProductUtil = async (product, runFunAfter, setLoading) => {
    setLoading(true)
    const user = getAuth().currentUser
    //setup Products
    let PRODUCT = { ...product }
    delete PRODUCT.PRICES
    PRODUCT.images = []
    PRODUCT.metadata.tags = PRODUCT.metadata?.tags?.toString()
    //get image url

    // Helper to ensure we end up with HTTPS URLs (uploading blobs/data URLs to Firebase Storage)
    const toHttpsImageUrl = async (entry, idx) => {
        try {
            // If it's already an https URL, just use it
            if (typeof entry === 'string') {
                if (/^https?:\/\//i.test(entry)) return entry
                if (/^(data:|blob:)/i.test(entry)) {
                    const res = await fetch(entry)
                    const blob = await res.blob()
                    const ext = (blob.type && blob.type.split('/')[1]) || 'jpg'
                    const safeName = (product?.name || 'image').replace(/[^a-z0-9-_]+/gi, '-').toLowerCase()
                    const fileName = `${safeName}-${Date.now()}-${idx}.${ext}`
                    const file = new File([blob], fileName, { type: blob.type || 'image/jpeg' })
                    return await useUploader(file, product.name)
                }
                // Unknown non-http string: skip
                return null
            }
            // File or Blob
            if (typeof Blob !== 'undefined' && entry instanceof Blob) {
                const blob = entry
                const ext = (blob.type && blob.type.split('/')[1]) || 'jpg'
                const safeName = (product?.name || 'image').replace(/[^a-z0-9-_]+/gi, '-').toLowerCase()
                const fileName = `${safeName}-${Date.now()}-${idx}.${ext}`
                const file = new File([blob], fileName, { type: blob.type || 'image/jpeg' })
                return await useUploader(file, product.name)
            }
        } catch (e) {
            console.warn('toHttpsImageUrl failed', e)
        }
        return null
    }

    for (let index = 0; index < (product.images?.length || 0); index++) {
        const item = product.images[index]
        let url = null
        if (typeof item === 'string' && /^https?:\/\//i.test(item)) {
            url = item
        } else {
            url = await toHttpsImageUrl(item, index)
        }
        if (url) PRODUCT.images.push(url)
    }
    //setup Prices
    /*   let allPRICES = [];
      for (let index = 0; index < PRICES.length; index++) {
          allPRICES = [...allPRICES, ...PRICES[index]]
  
      }
  
      PRICES = allPRICES */


    const sendData = async () => {
    const { data } = await axios.post('/api/CreateProduct', {
            productData: PRODUCT,
            UID:user.uid
        },
            {
                headers: {
                    "Content-Type": "application/json",
                    'Cache-Control': 'no-cache',
                    'Pragma': 'no-cache',
                    'Expires': '0',
                },
            })
        return (data)

    }

    if (product.images.length == PRODUCT.images.length || !product.images) try {
        const res = await sendData()
        // live-sync collections membership -> users/{uid}.siteInfo.collections
        try {
            const pid = res?.id || PRODUCT?.id
            const names = Array.isArray(PRODUCT?.metadata?.collections) ? PRODUCT.metadata.collections.filter(Boolean) : []
            if (user?.uid && pid) {
                await syncCollectionsSiteInfo(user.uid, pid, names)
            }
        } catch (e) { /* non-fatal */ }
        runFunAfter()
        message.success('Product Created')

    } catch (error) {
        message.error(error.message)

    }

    setLoading(false)

}
export const useUpdateProductUtil = async (product, runFunAfter, setLoading) => {
    setLoading(true)
    //setup Products
    let PRODUCT = { ...product }
    delete PRODUCT.PRICES
    PRODUCT.images = []
    PRODUCT.metadata.tags = PRODUCT.metadata?.tags?.toString()
    //get image url

    // Helper to ensure we end up with HTTPS URLs (uploading blobs/data URLs to Firebase Storage)
    const toHttpsImageUrl = async (entry, idx) => {
        try {
            // If it's already an https URL, just use it
            if (typeof entry === 'string') {
                if (/^https?:\/\//i.test(entry)) return entry
                if (/^(data:|blob:)/i.test(entry)) {
                    const res = await fetch(entry)
                    const blob = await res.blob()
                    const ext = (blob.type && blob.type.split('/')[1]) || 'jpg'
                    const safeName = (product?.name || 'image').replace(/[^a-z0-9-_]+/gi, '-').toLowerCase()
                    const fileName = `${safeName}-${Date.now()}-${idx}.${ext}`
                    const file = new File([blob], fileName, { type: blob.type || 'image/jpeg' })
                    return await useUploader(file, product.name)
                }
                // Unknown non-http string: skip
                return null
            }
            // File or Blob
            if (typeof Blob !== 'undefined' && entry instanceof Blob) {
                const blob = entry
                const ext = (blob.type && blob.type.split('/')[1]) || 'jpg'
                const safeName = (product?.name || 'image').replace(/[^a-z0-9-_]+/gi, '-').toLowerCase()
                const fileName = `${safeName}-${Date.now()}-${idx}.${ext}`
                const file = new File([blob], fileName, { type: blob.type || 'image/jpeg' })
                return await useUploader(file, product.name)
            }
        } catch (e) {
            console.warn('toHttpsImageUrl failed', e)
        }
        return null
    }

    for (let index = 0; index < (product.images?.length || 0); index++) {
        const item = product.images[index]
        let url = null
        if (typeof item === 'string' && /^https?:\/\//i.test(item)) {
            url = item
        } else {
            url = await toHttpsImageUrl(item, index)
        }
        if (url) PRODUCT.images.push(url)
    }
    //setup Prices
    /*   let PRICES = Object.values(product?.PRICES)
      let allPRICES = [];
      for (let index = 0; index < PRICES.length; index++) {
          allPRICES = [...allPRICES, ...PRICES[index]]
  
      }
  
      PRICES = allPRICES */


    const sendData = async () => {
        const { data } = await axios.post('/api/UpdateProduct', {
            productData: PRODUCT,
        },
            {
                headers: {
                    "Content-Type": "application/json",
                    'Cache-Control': 'no-cache',
                    'Pragma': 'no-cache',
                    'Expires': '0',
                },
            })
        return (data)

    }

    if (product.images.length == PRODUCT.images.length || !product.images) try {
        const res = await sendData()
        // live-sync collections membership -> users/{uid}.siteInfo.collections
        try {
            const auth = getAuth().currentUser
            const pid = product?.id || PRODUCT?.id || res?.id
            const names = Array.isArray(PRODUCT?.metadata?.collections) ? PRODUCT.metadata.collections.filter(Boolean) : []
            if (auth?.uid && pid) {
                await syncCollectionsSiteInfo(auth.uid, pid, names)
            }
        } catch (e) { /* non-fatal */ }
        runFunAfter()
        message.success('Product Updated')

    } catch (error) {
        message.error(error.message)

    }
    setLoading(false)
}



export const updateBanner = (bannerData) => {
    if (bannerData.title) updateDatabaseItem('Admin', 'Banner', 'title', bannerData.title)
    if (bannerData.link) updateDatabaseItem('Admin', 'Banner', 'link', bannerData.link)
    if (bannerData.message) updateDatabaseItem('Admin', 'Banner', 'message', bannerData.message)
}

// Helper: ensure users/{uid}.siteInfo.collections productIds reflect this product's membership
async function syncCollectionsSiteInfo(uid, productId, collectionNames = []) {
    try {
        const userRef = doc(db, 'users', uid)
        const snap = await getDoc(userRef)
        const data = snap.data() || {}
        const siteInfo = data.siteInfo || {}
        const collections = Array.isArray(siteInfo.collections) ? siteInfo.collections : []

        // Map name -> collection object clone
        const nameToCol = new Map(collections.map(c => [c?.name, { ...(c||{}), productIds: Array.isArray(c?.productIds) ? [...c.productIds] : [] }]))

        // Ensure all named collections exist (optional: create if missing)
        collectionNames.forEach(n => {
            if (!nameToCol.has(n)) nameToCol.set(n, { name: n, image: null, productIds: [] })
        })

        // Update membership for each collection
        nameToCol.forEach((col, name) => {
            const has = col.productIds?.includes(productId)
            const shouldHave = collectionNames.includes(name)
            if (shouldHave && !has) col.productIds.push(productId)
            if (!shouldHave && has) col.productIds = col.productIds.filter(id => id !== productId)
        })

        const updated = Array.from(nameToCol.values())
        await updateDoc(userRef, { 'siteInfo.collections': updated })
    } catch (err) {
        // swallow to avoid blocking UX
        console.warn('syncCollectionsSiteInfo failed', err)
    }
}