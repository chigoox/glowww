"use client"
import React, { useEffect, useMemo, useRef, useState } from 'react'
import { Upload, Modal, Button as ButtonA, Input as InputA, Select as SelectA, Switch, Divider, InputNumber, Tag, Tooltip } from 'antd';
import { Star, Trash2 } from 'lucide-react'
import { Reorder, motion, useDragControls } from 'framer-motion'
import MediaLibrary from '@/app/Components/editor/MediaLibrary';
// Removed legacy Uploader in favor of MediaLibrary
//import Masonry from 'masonry-layout';
import { createArray, filterNullFromArray } from '@/app/myCodes/Util';
import dynamic from "next/dynamic";
import { useCreateProductUtil, useUpdateProductUtil } from '../../AdminUtil';
const TextEditor = dynamic(() => import("@/app/Components/editor/Tinymce"), {
    ssr: false,
});



export const ProductAddEdit = ({SITEINFO, openType, setWindow, defualt }) => {
  // Inner item component to provide per-item drag controls (better with overlay/buttons)
  const DraggableMediaItem = ({ item, idx, setCoverImage, removeMainImage }) => {
    const controls = useDragControls()
    return (
      <Reorder.Item
        as="div"
        layout
        key={item.id}
        value={item}
        dragControls={controls}
        dragListener={false}
        whileDrag={{ scale: 1.03, zIndex: 10, boxShadow: '0 8px 24px rgba(0,0,0,0.2)' }}
        className="list-none"
        style={{ touchAction: 'none' }}
      >
        <div className="relative group">
          <img src={item.url} alt="product" className="w-full h-24 object-cover rounded  select-none" />
          <div className="absolute top-1 left-1 text-[10px] px-1 py-0.5 rounded bg-black/60 text-white">{idx+1}</div>
          {/* Bottom overlay bar for actions */}
          <div className="absolute inset-x-0 bottom-0 rounded-b bg-gradient-to-t from-black/70 to-transparent p-1.5 flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition select-none">
            <Tooltip title={idx===0 ? 'Already cover' : 'Set as cover'} mouseEnterDelay={0.1}>
              <button
                onClick={()=> idx===0 ? null : setCoverImage(idx)}
                disabled={idx===0}
                aria-label={idx===0 ? 'Already cover' : 'Set as cover'}
                className={`w-7 h-7 inline-flex items-center justify-center rounded bg-white/95 text-gray-900 shadow-sm ring-1 ring-white/70 hover:bg-white focus:outline-none focus:ring-2 focus:ring-white/60 ${idx===0 ? 'opacity-80 cursor-default' : 'cursor-pointer'}`}
              >
                <Star size={14} className={`${idx===0 ? 'fill-yellow-400 text-yellow-500' : 'text-gray-800'}`} />
              </button>
            </Tooltip>
            <Tooltip title="Remove image" mouseEnterDelay={0.1}>
              <button
                onClick={()=> removeMainImage(idx)}
                aria-label="Remove image"
                className="w-7 h-7 inline-flex items-center justify-center rounded bg-red-500 text-white shadow-sm hover:bg-red-600 focus:outline-none focus:ring-2 focus:ring-white/60 cursor-pointer"
              >
                <Trash2 size={14} />
              </button>
            </Tooltip>
          </div>
          {/* Drag handle */}
          <div
            className="absolute top-1 right-1 text-white bg-black/50 ring-1 ring-white/50 rounded px-1.5 text-[12px] select-none cursor-grab active:cursor-grabbing shadow-sm"
            onPointerDown={(e)=> controls.start(e)}
            title="Drag to reorder"
          >
            ⇅
          </div>
        </div>
      </Reorder.Item>
    )
  }
  const [isOpen, setIsOpen] = useState(false);
  const onOpenChange = (next) => setIsOpen(next);
  const onOpen = () => setIsOpen(true);
  const categoriesArray = Array.isArray(SITEINFO?.categories) ? SITEINFO.categories : [];
  const category = (filterNullFromArray([...categoriesArray, 'Addon']) || []).map((item)=> typeof item === 'string' ? item : item?.name).filter(Boolean)
  // Removed Masonry layout dependency

    const [product, setProuduct] = useState({
        active: true,
        name: "Untitled product",
        description: '',
        images: [],
        currency: 'usd',
        requiresShipping: false,
        weight: 0,
        hasVariants: false,
        options: [
          // { name: 'Size', values: ['S','M','L'] },
        ],
        variants: [
          // { id, title, sku, price, quantity, active, image }
        ],
        sku: '',
        barcode: '',
        trackQuantity: false,
        quantity: 0,
        metadata: {
            category: '',
            tags: '',
            isNew: '',
            price: 0,
            compareAtPrice: 0,
            costPerItem: 0,
            time: '',
            collections: [], // names of collections this product belongs to
        },
    })


    const [loading, setLoading] = useState(false)

    useEffect(() => {
        if (openType == "openNew") onOpen()
        if (openType == "openEdit") onOpen()
        if (defualt) setProuduct(defualt)
    }, [openType])

    const setText = (text, name) => {
        setProuduct(o => ({ ...o, [name]: text }))
    }
    const setTextMeta = (text, name) => {
        setProuduct(o => ({
            ...o, metadata: {
                ...o.metadata, [name]: text
            }
        }))
    }

    const profit = useMemo(() => {
      const p = Number(product.metadata?.price || 0)
      const c = Number(product.metadata?.costPerItem || 0)
      return (p - c).toFixed(2)
    }, [product.metadata?.price, product.metadata?.costPerItem])
    const margin = useMemo(() => {
      const p = Number(product.metadata?.price || 0)
      const c = Number(product.metadata?.costPerItem || 0)
      if (!p) return '0.00'
      return (((p - c) / p) * 100).toFixed(2)
    }, [product.metadata?.price, product.metadata?.costPerItem])
    const [Variants, setVariants] = useState(0)
    const x = (ED5) => {
        // ENTERPISES()
    }
    // Media Library state for variant image picking
  const [mediaOpen, setMediaOpen] = useState(false)
    const [mediaVariantIndex, setMediaVariantIndex] = useState(null)
    const openVariantImagePicker = (idx) => { setMediaVariantIndex(idx); setMediaOpen(true) }
    const onMediaSelect = (item/* , type */) => {
      const url = item?.thumbnail || item?.url
      if (!url || mediaVariantIndex == null) return setMediaOpen(false)
      setProuduct(o=>{
        if (!Array.isArray(o.variants)) return { ...o }
        const variants = [...o.variants]
        variants[mediaVariantIndex] = { ...variants[mediaVariantIndex], image: url }
        return { ...o, variants }
      })
      setMediaOpen(false)
      setMediaVariantIndex(null)
    }
    // Main images via media library + drag-reorder (framer-motion Reorder)
    const [mediaMainOpen, setMediaMainOpen] = useState(false)
    const [imagesList, setImagesList] = useState([]) // [{id, url}]
    const openMainImagePicker = () => setMediaMainOpen(true)
    const syncProductImages = (list) => {
      setProuduct(o=> ({ ...o, images: list.map(x=> x.url) }))
    }
    useEffect(()=>{
      // Initialize/sync imagesList from product.images when product changes externally
      const imgs = Array.isArray(product?.images) ? product.images : []
      if (imgs.length !== imagesList.length || imgs.some((u, i)=> imagesList[i]?.url !== u)) {
        setImagesList(imgs.map((url, i)=> ({ id: `img_${i}_${(typeof window!== 'undefined' && window.btoa ? window.btoa(unescape(encodeURIComponent(url))).slice(0,8) : `${i}`)}`, url })))
      }
    }, [product.images])
    const onMainMediaSelect = (item/* , type */) => {
      const url = item?.thumbnail || item?.url
      if (!url) return setMediaMainOpen(false)
      setImagesList(prev => {
        const next = [...prev, { id: `img_${Date.now()}_${Math.random().toString(36).slice(2,8)}` , url }]
        syncProductImages(next)
        return next
      })
      setMediaMainOpen(false)
    }
    const removeMainImage = (idx) => setImagesList(prev => {
      const next = prev.filter((_,i)=> i!==idx)
      syncProductImages(next)
      return next
    })
    const setCoverImage = (idx) => setImagesList(prev => {
      if (idx <= 0) return prev
      const next = [...prev]
      const [sel] = next.splice(idx,1)
      const reordered = [sel, ...next]
      syncProductImages(reordered)
      return reordered
    })

    //todo make order not protected on pickup orders

    return (
      <>
        <Modal
          open={isOpen}
          onCancel={() => setWindow(false)}
          onOk={() => {
            openType == "openNew"
              ? useCreateProductUtil(product, setWindow, setLoading)
              : useUpdateProductUtil(product, setWindow, setLoading);
          }}
          title={openType == "openNew" ? "Add product" : "Edit product"}
          okButtonProps={{ loading }}
          width={1000}
          styles={{ body: { maxHeight: '70vh', overflowY: 'auto' } }}
        >
          <div className="grid gap-3 md:grid-cols-3 grid-cols-1 p-2 grid-flow-row-dense">
            <div className="grid-item md:col-span-2 col-span-1  rounded p-3 bg-white">
              <div className="w-full my-4">
                <label className="mr-2">Active</label>
                <Switch checked={product.active} onChange={(v) => setProuduct(o => ({ ...o, active: v }))} />
              </div>
              <div className="flex TITLE-DESCRIPTION gap-4">
                <div className="p-2 h-full flex-1 min-w-0">
                  <h1 className="font-bold">title</h1>
                  <InputA
                    value={product.name}
                    onChange={(e) => setProuduct(o => ({ ...o, name: e.target.value }))}
                    placeholder="Product Name"
                    className="h-10"
                  />
                  <br />
                  <h1 className="font-bold">description</h1>
                  <TextEditor
                    value={product.description}
                    onChange={(val) => setProuduct(o => ({ ...o, description: val }))}
                  />
                </div>
              </div>
            </div>

            <div className="UPLOADER md:col-span-2 col-span-1 grid-item  rounded p-3 bg-white">
              <div className="flex items-center justify-between">
                <h1 className="font-bold">Media</h1>
                <div className="flex gap-2 items-center text-xs text-gray-500">
                  <span className="hidden md:inline">Drag to reorder</span>
                  <ButtonA type="primary" onClick={openMainImagePicker}>Add from Library</ButtonA>
                </div>
              </div>
              <Reorder.Group
                as="div"
                layout
                axis="y"
                values={imagesList}
                onReorder={(newOrder)=> { setImagesList(newOrder); syncProductImages(newOrder) }}
                className="mt-3 grid [grid-template-columns:repeat(auto-fill,minmax(6rem,1fr))] gap-3 list-none"
                style={{ gridAutoRows: '6rem', touchAction: 'none' }}
              >
                {imagesList.map((item, idx)=> (
                  <DraggableMediaItem key={item.id} item={item} idx={idx} setCoverImage={setCoverImage} removeMainImage={removeMainImage} />
                ))}
                {imagesList.length===0 && (
                  <div className="text-sm text-gray-500">No images yet. Click "Add from Library" to choose images.</div>
                )}
              </Reorder.Group>
            </div>

            <div className="PRODUCT-ORG col-span-1 md:col-start-3 md:row-start-1 self-start grid-item  rounded p-3 bg-white">
              <div>
                <h1 className="font-bold">Product organization</h1>
                <div className="mt-2">
                  <h1>Category</h1>
                  <SelectA
                    value={product.metadata.category}
                    onChange={(v) => setTextMeta(v, 'category')}
                    options={[...category, 'Addon'].map(c => ({ label: c, value: c }))}
                  />
                </div>
                <div className="mt-2">
                  <h1>Tags (comma separated)</h1>
                  <InputA
                    value={product.metadata.tags}
                    onChange={(e) => setTextMeta(e.target.value, 'tags')}
                    placeholder="e.g. summer, limited, featured"
                  />
                </div>
                <div className="mt-2">
                  <h1>Collections</h1>
                  <SelectA
                    mode="multiple"
                    value={Array.isArray(product.metadata?.collections) ? product.metadata.collections : []}
                    onChange={(vals) => setTextMeta(vals, 'collections')}
                    options={(Array.isArray(SITEINFO?.collections) ? SITEINFO.collections : []).map(c => ({ label: c?.name || '', value: c?.name || '' })).filter(o => o.value)}
                    placeholder="Select collections"
                    allowClear
                  />
                </div>

                <Divider className="my-4" />
                <h1 className="font-bold">Pricing</h1>
                <div className="p-2 grid grid-cols-2 gap-3">
                  <div>
                    <h1 className="text-sm">Price</h1>
                    <InputNumber
                      value={Number(product.metadata.price) || 0}
                      onChange={(v) => setTextMeta(Number(v || 0), 'price')}
                      min={0}
                      className="w-full"
                      addonBefore="$"
                    />
                  </div>
                  <div>
                    <h1 className="text-sm">Compare at price</h1>
                    <InputNumber
                      value={Number(product.metadata.compareAtPrice) || 0}
                      onChange={(v) => setTextMeta(Number(v || 0), 'compareAtPrice')}
                      min={0}
                      className="w-full"
                      addonBefore="$"
                    />
                  </div>
                  <div>
                    <h1 className="text-sm">Cost per item</h1>
                    <InputNumber
                      value={Number(product.metadata.costPerItem) || 0}
                      onChange={(v) => setTextMeta(Number(v || 0), 'costPerItem')}
                      min={0}
                      className="w-full"
                      addonBefore="$"
                    />
                    <div className="text-xs text-gray-500 mt-1">Profit ${profit} • Margin {margin}%</div>
                  </div>
                  <div>
                    <h1 className="text-sm">Currency</h1>
                    <SelectA
                      value={product.currency}
                      onChange={(v) => setProuduct(o => ({ ...o, currency: v }))}
                      options={[{label:'USD', value:'usd'}]}
                    />
                  </div>
                </div>

                <Divider className="my-4" />
                <h1 className="font-bold">Inventory</h1>
                <div className="p-2 grid grid-cols-2 gap-3">
                  <div>
                    <h1 className="text-sm">SKU</h1>
                    <InputA value={product.sku} onChange={(e)=> setProuduct(o=>({...o, sku: e.target.value}))} />
                  </div>
                  <div>
                    <h1 className="text-sm">Barcode</h1>
                    <InputA value={product.barcode} onChange={(e)=> setProuduct(o=>({...o, barcode: e.target.value}))} />
                  </div>
                  <div className="col-span-2 flex items-center gap-2">
                    <Switch checked={product.trackQuantity} onChange={(v)=> setProuduct(o=>({...o, trackQuantity: v}))} />
                    <span>Track quantity</span>
                  </div>
                  {product.trackQuantity && (
                    <div>
                      <h1 className="text-sm">Quantity</h1>
                      <InputNumber value={Number(product.quantity)||0} min={0} onChange={(v)=> setProuduct(o=>({...o, quantity: Number(v||0)}))} className="w-full" />
                    </div>
                  )}
                </div>

                <Divider className="my-4" />
                <h1 className="font-bold">Shipping</h1>
                <div className="p-2 grid grid-cols-2 gap-3">
                  <div className="col-span-2 flex items-center gap-2">
                    <Switch checked={product.requiresShipping} onChange={(v)=> setProuduct(o=>({...o, requiresShipping: v}))} />
                    <span>Requires shipping</span>
                  </div>
                  {product.requiresShipping && (
                    <div>
                      <h1 className="text-sm">Weight (g)</h1>
                      <InputNumber value={Number(product.weight)||0} min={0} onChange={(v)=> setProuduct(o=>({...o, weight: Number(v||0)}))} className="w-full" />
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="VARIANTS md:col-span-3 col-span-1 grid-item  rounded p-3 bg-white">
              <div className="flex items-center justify-between">
                <h1 className="font-bold">Variants</h1>
                <div className="flex items-center gap-2">
                  <span>Has variants</span>
                  <Switch checked={product.hasVariants} onChange={(v)=> setProuduct(o=>({...o, hasVariants: v }))} />
                </div>
              </div>

              {product.hasVariants && (
                <div className="mt-3">
                  <div className="grid md:grid-cols-3 grid-cols-1 gap-3">
                    {createArray(Math.max(product.options.length || 0, 1)).map((_, idx) => (
                      <div key={idx} className=" rounded p-2">
                        <h2 className="font-medium">Option {idx+1}</h2>
                        <InputA
                          placeholder="Option name (e.g., Size)"
                          value={product.options[idx]?.name || ''}
                          onChange={(e)=> {
                            const name = e.target.value
                            setProuduct(o=>{
                              const opts = [...(o.options||[])]
                              if (!opts[idx]) opts[idx] = { name: '', values: [] }
                              opts[idx].name = name
                              return { ...o, options: opts }
                            })
                          }}
                          className="mt-1"
                        />
                        <InputA
                          placeholder="Values (comma separated: S, M, L)"
                          value={(product.options[idx]?.values||[]).join(', ')}
                          onChange={(e)=> {
                            const values = e.target.value.split(',').map(s=>s.trim()).filter(Boolean)
                            setProuduct(o=>{
                              const opts = [...(o.options||[])]
                              if (!opts[idx]) opts[idx] = { name: '', values: [] }
                              opts[idx].values = values
                              return { ...o, options: opts }
                            })
                          }}
                          className="mt-2"
                        />
                      </div>
                    ))}
                  </div>
                  <div className="flex gap-2 mt-2">
                    <ButtonA onClick={()=> setProuduct(o=> ({...o, options: [...(o.options||[]), { name:'', values: [] }].slice(0,3) }))}>Add option</ButtonA>
                    <ButtonA type="primary" onClick={()=> {
                      // Generate variant combinations
                      const opts = (product.options||[]).filter(op=>op?.name && (op.values||[]).length)
                      const combine = (arrays) => arrays.reduce((acc, cur)=> acc.flatMap(a => cur.map(b => [...a, b])), [[]])
                      const arrays = opts.map(op=> op.values.map(v => ({ name: op.name, value: v })))
                      const combos = arrays.length ? combine(arrays) : []
                      const makeTitle = (combo) => combo.map(x=> `${x.name}: ${x.value}`).join(' / ')
                      const variants = combos.map((combo, i) => ({
                        id: `${Date.now()}_${i}`,
                        title: makeTitle(combo),
                        options: combo,
                        price: Number(product.metadata?.price || 0),
                        sku: '',
                        quantity: 0,
                        active: true,
                      }))
                      setProuduct(o=> ({ ...o, variants }))
                    }}>Generate variants</ButtonA>
                  </div>

                  {product.variants?.length > 0 && (
                    <div className="mt-4 overflow-x-auto">
                      <div className="grid grid-cols-6 gap-2 font-medium text-gray-600 border-b pb-1">
                        <div>Variant</div>
                        <div>Price</div>
                        <div>SKU</div>
                        <div>Qty</div>
                        <div>Status</div>
                        <div>Image</div>
                      </div>
                      {product.variants.map((v, idx)=> (
                        <div key={v.id} className="grid grid-cols-6 gap-2 items-center py-2 border-b">
                          <div className="truncate" title={v.title}>{v.title}</div>
                          <div>
                            <InputNumber value={Number(v.price)||0} min={0} onChange={(val)=> setProuduct(o=>{
                              const variants = [...o.variants]; variants[idx] = { ...variants[idx], price: Number(val||0) }; return { ...o, variants }
                            })} className="w-full" addonBefore="$" />
                          </div>
                          <div>
                            <InputA value={v.sku||''} onChange={(e)=> setProuduct(o=>{
                              const variants = [...o.variants]; variants[idx] = { ...variants[idx], sku: e.target.value }; return { ...o, variants }
                            })} />
                          </div>
                          <div>
                            <InputNumber value={Number(v.quantity)||0} min={0} onChange={(val)=> setProuduct(o=>{
                              const variants = [...o.variants]; variants[idx] = { ...variants[idx], quantity: Number(val||0) }; return { ...o, variants }
                            })} className="w-full" />
                          </div>
                          <div>
                            <Switch checked={!!v.active} onChange={(val)=> setProuduct(o=>{
                              const variants = [...o.variants]; variants[idx] = { ...variants[idx], active: val }; return { ...o, variants }
                            })} />
                          </div>
                          <div className="flex items-center gap-2 justify-end">
                            {v.image ? (
                              <img src={v.image} alt="variant" className="h-10 w-10 rounded object-cover border" />
                            ) : (
                              <div className="h-10 w-10 rounded border bg-gray-50 flex items-center justify-center text-xs text-gray-400">No img</div>
                            )}
                            <ButtonA size="small" onClick={()=> openVariantImagePicker(idx)}>Choose</ButtonA>
                            <ButtonA size="small" danger onClick={()=> setProuduct(o=>{
                              const variants = [...o.variants]; variants[idx] = { ...variants[idx], image: undefined }; return { ...o, variants }
                            })}>Clear</ButtonA>
                            <ButtonA danger onClick={()=> setProuduct(o=>{
                              const variants = o.variants.filter((_,i)=> i!==idx); return { ...o, variants }
                            })}>Remove</ButtonA>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        <MediaLibrary
          visible={mediaOpen}
          onClose={()=> { setMediaOpen(false); setMediaVariantIndex(null) }}
          onSelect={onMediaSelect}
          type="images"
          title="Select variant image"
        />
        <MediaLibrary
          visible={mediaMainOpen}
          onClose={()=> setMediaMainOpen(false)}
          onSelect={onMainMediaSelect}
          type="images"
          title="Select product images"
        />
        </Modal>
      </>
    );
}



export const VariavntPanel = ({ indexi, setter }) => {
    const [variantCount, setVariantCount] = useState({ [`variant0`]: { name: '', value: {}, valueCount: 1 } })
    const ActualPrice = Object.values(variantCount).map(item => {
        const SubVariants = Object.values(item.value)
        return SubVariants.length > 0 ? SubVariants.map(_item => {
            (`${item.name} ${_item}`)
            return (
                `${item.name}${_item ? ' ' + _item : ''}`
            )
        }) :

            item?.name
    })




    return (
        <div className='h-full'>
            {Object.keys(variantCount).map((item, index) => {
                const currentCount = variantCount[item].valueCount || 1
                const valuesCount = Object.keys(variantCount[item].value).length || 0
                const valueInLastPosition = Object.values(variantCount[item].value)[currentCount - 1]
                const countEqValue = (currentCount == valuesCount)


                useEffect(() => {
                    setter(o => ({
                        ...o, PRICES: { ...o.PRICES, [indexi]: ActualPrice[0] }
                    }))
                }, [variantCount])

                useEffect(() => {
                    if (valueInLastPosition && countEqValue)
                        setVariantCount(old => { return { ...old, [`variant${index}`]: { ...old[`variant${index}`], valueCount: old[`variant${index}`].valueCount + 1 } } })
                }, [valueInLastPosition, countEqValue])
                return (
                    <div key={item} className='h-full p-2 overflow-y-scroll hidescroll  rounded-lg w-40 shadow border-dotted border-2'>
                        <h1>Option name</h1>
                        <InputA onChange={(e) => { const value = e.target.value; setVariantCount(old => { return { ...old, [`variant${index}`]: { name: value, value: old[`variant${index}`].value, valueCount: old[`variant${index}`].valueCount } } }) }} />
                        <h1>Option values</h1>
                        <div className=' center-col gap-4 '>
                            {
                                createArray(variantCount[item].valueCount).map((item, indexi) => {
                                    return (
                                        <div key={item}>
                                            <h1>Variant option {indexi}</h1>
                                            <InputA onChange={(e) => { const value = e.target.value; setVariantCount(old => { return { ...old, [`variant${index}`]: { name: old[`variant${index}`].name, valueCount: old[`variant${index}`].valueCount, value: { ...old[`variant${index}`].value, [`option${indexi}`]: value } } } }) }} />
                                        </div>

                                    )
                                })}
                        </div>
                        <button onClick={() => { }} ></button>
                    </div>
                )
            })}

        </div>
    )
}