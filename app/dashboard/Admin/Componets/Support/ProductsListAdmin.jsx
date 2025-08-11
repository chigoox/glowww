import { AUTH } from '@/Firebase'
import { onAuthStateChanged } from 'firebase/auth'
import { useRouter } from 'next/navigation'
import { useEffect, useMemo, useState } from 'react'
import { collection, onSnapshot, orderBy, query, where } from 'firebase/firestore'
import { db as DATABASE } from '@/lib/firebase'
import { Select, InputNumber } from 'antd'
import { Search, X } from 'lucide-react'

function ProductsListAdmin({ sortBy, window, setWidow, setSelectedProductData }) {
    const [products, setProducts] = useState([])
    // Filters & sorting
    const [search, setSearch] = useState('')
    const [status, setStatus] = useState('all') // all | active | draft
    const [stock, setStock] = useState('all')   // all | in | out
    const [category, setCategory] = useState('all')
    const [tags, setTags] = useState([])        // array of tag strings
    const [priceMin, setPriceMin] = useState()
    const [priceMax, setPriceMax] = useState()
    const [sort, setSort] = useState('newest')  // newest | oldest | name-asc | name-desc | stock-desc | stock-asc | price-asc | price-desc
    const [page, setPage] = useState(1)
    const [pageSize, setPageSize] = useState(20)
    const router = useRouter();

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(AUTH, async (currentUser) => {
            if (!currentUser) return;
            const q = query(
                collection(DATABASE, 'products'),
                where('userId', '==', currentUser.uid),
                orderBy('created', 'desc')
            );
            const off = onSnapshot(q, (snap) => {
                const rows = snap.docs.map(d => {
                    const i = d.data();
                    const ts = i.created;
                    const ms = ts?.toMillis ? ts.toMillis() : (ts?.seconds ? (ts.seconds * 1000 + (ts.nanoseconds || 0) / 1e6) : Date.now());
                    return ({ id: d.id, ...i, created: ms });
                });
                setProducts(rows);

                // Deep-link: if a product id was requested, open it once when available
                try {
                    const openId = localStorage.getItem('admin.product.openId');
                    if (openId) {
                        const found = rows.find(r => r.id === openId);
                        if (found) {
                            setSelectedProductData(found);
                            setWidow('openEdit');
                            localStorage.removeItem('admin.product.openId');
                        }
                    }
                } catch {}
            });
            return () => off();
        });
        return () => unsubscribe();
    }, [router])

    const categories = useMemo(() => {
        const set = new Set()
        products.forEach(p => { const c = p?.metadata?.category; if (c) set.add(c) })
        return ['all', ...Array.from(set)]
    }, [products])

    const allTags = useMemo(() => {
        const set = new Set()
        products.forEach(p => {
            const t = p?.metadata?.tags
            if (Array.isArray(t)) t.forEach(x => typeof x === 'string' && set.add(x))
        })
        return Array.from(set)
    }, [products])

    const getStock = (item) => {
        if (item?.trackQuantity) return Number(item.quantity || 0)
        const inv = Number(item?.metadata?.inventory)
        return isNaN(inv) ? 0 : inv
    }

    const getPrice = (item) => {
        const p = item?.price ?? item?.metadata?.price ?? item?.metadata?.amount
        const n = Number(p)
        return Number.isFinite(n) ? n : 0
    }

    const formatMoney = (amount, currency = 'USD') => {
        try {
            return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(amount)
        } catch {
            return `$${amount}`
        }
    }

    const filtered = useMemo(() => {
        let rows = [...products]
        // status filter
        if (status !== 'all') rows = rows.filter(r => status === 'active' ? !!r.active : !r.active)
        // category filter
        if (category !== 'all') rows = rows.filter(r => (r?.metadata?.category || '') === category)
        // tags filter (OR match)
        if (Array.isArray(tags) && tags.length > 0) {
            rows = rows.filter(r => {
                const t = Array.isArray(r?.metadata?.tags) ? r.metadata.tags : []
                return t.some(x => tags.includes(x))
            })
        }
        // stock filter
        if (stock !== 'all') rows = rows.filter(r => {
            const s = getStock(r)
            return stock === 'in' ? s > 0 : s <= 0
        })
        // price range
        rows = rows.filter(r => {
            const price = getPrice(r)
            if (typeof priceMin === 'number' && price < priceMin) return false
            if (typeof priceMax === 'number' && price > priceMax) return false
            return true
        })
        // search
        if (search.trim()) {
            const q = search.trim().toLowerCase()
            rows = rows.filter(r => {
                const name = (r.name || '').toLowerCase()
                const cat = (r?.metadata?.category || '').toLowerCase()
                return name.includes(q) || cat.includes(q)
            })
        }
        // sort
        rows.sort((a, b) => {
            switch (sort) {
                case 'oldest': return (a.created || 0) - (b.created || 0)
                case 'name-asc': return (a.name || '').localeCompare(b.name || '')
                case 'name-desc': return (b.name || '').localeCompare(a.name || '')
                case 'stock-asc': return getStock(a) - getStock(b)
                case 'stock-desc': return getStock(b) - getStock(a)
                case 'price-asc': return getPrice(a) - getPrice(b)
                case 'price-desc': return getPrice(b) - getPrice(a)
                case 'newest':
                default: return (b.created || 0) - (a.created || 0)
            }
        })
        return rows
    }, [products, search, status, stock, category, tags, priceMin, priceMax, sort])

    // Pagination
    const total = filtered.length
    const totalPages = Math.max(1, Math.ceil(total / pageSize))
    const currentPage = Math.min(page, totalPages)
    const start = (currentPage - 1) * pageSize
    const end = start + pageSize
    const pageRows = filtered.slice(start, end)

    return (
        <div className='overflow-hidden h-96 sm:left-0 lg:left-0 md:left-2 relative'>
            {/* Toolbar */}
            <div className='mb-2 flex flex-wrap items-center gap-2 justify-between'>
                <div className='relative w-60 md:w-72'>
                    <Search size={16} className='absolute left-2 top-1/2 -translate-y-1/2 text-white/60 pointer-events-none' />
                    <input
                        type='text'
                        value={search}
                        onChange={(e)=> setSearch(e.target.value)}
                        onKeyDown={(e)=> { if (e.key === 'Escape') setSearch('') }}
                        placeholder='Search products…'
                        aria-label='Search products'
                        className='w-full h-8 pl-8 pr-8 rounded-md bg-white/5 text-white placeholder-white/50 border border-white/10 hover:border-white/20 focus:outline-none focus:ring-2 focus:ring-blue-400/20 focus:border-blue-400/40 transition'
                    />
                    {search && (
                        <button
                            type='button'
                            aria-label='Clear search'
                            onClick={()=> setSearch('')}
                            className='absolute right-1.5 top-1/2 -translate-y-1/2 w-6 h-6 inline-flex items-center justify-center rounded hover:bg-white/10 text-white/70'
                        >
                            <X size={14} />
                        </button>
                    )}
                </div>
                <div className='flex flex-wrap items-center gap-2'>
                    <Select
                        size='small'
                        value={status}
                        onChange={setStatus}
                        options={[
                            { label: 'All status', value: 'all' },
                            { label: 'Active', value: 'active' },
                            { label: 'Draft', value: 'draft' },
                        ]}
                        className='w-28'
                    />
                    <Select
                        size='small'
                        value={stock}
                        onChange={setStock}
                        options={[
                            { label: 'All stock', value: 'all' },
                            { label: 'In stock', value: 'in' },
                            { label: 'Out of stock', value: 'out' },
                        ]}
                        className='w-28'
                    />
                    <Select
                        size='small'
                        value={category}
                        onChange={setCategory}
                        options={categories.map(c => ({ label: c === 'all' ? 'All categories' : c, value: c }))}
                        className='w-36'
                    />
                    <Select
                        mode='multiple'
                        size='small'
                        value={tags}
                        onChange={setTags}
                        placeholder='Tags'
                        options={allTags.map(t => ({ label: t, value: t }))}
                        className='min-w-[8rem] max-w-[14rem]'
                    />
                    <div className='flex items-center gap-1 text-white/70'>
                        <span className='text-xs'>Price</span>
                        <InputNumber
                            size='small'
                            min={0}
                            placeholder='min'
                            value={priceMin}
                            onChange={setPriceMin}
                            className='w-20 [&_.ant-input-number-input]:text-xs'
                        />
                        <span className='text-xs'>–</span>
                        <InputNumber
                            size='small'
                            min={0}
                            placeholder='max'
                            value={priceMax}
                            onChange={setPriceMax}
                            className='w-20 [&_.ant-input-number-input]:text-xs'
                        />
                    </div>
                    <Select
                        size='small'
                        value={sort}
                        onChange={setSort}
                        options={[
                            { label: 'Newest', value: 'newest' },
                            { label: 'Oldest', value: 'oldest' },
                            { label: 'Name A–Z', value: 'name-asc' },
                            { label: 'Name Z–A', value: 'name-desc' },
                            { label: 'Stock high→low', value: 'stock-desc' },
                            { label: 'Stock low→high', value: 'stock-asc' },
                            { label: 'Price low→high', value: 'price-asc' },
                            { label: 'Price high→low', value: 'price-desc' },
                        ]}
                        className='w-40'
                    />
                    <button
                        type='button'
                        onClick={() => { setSearch(''); setStatus('all'); setStock('all'); setCategory('all'); setTags([]); setPriceMin(); setPriceMax(); setSort('newest'); setPage(1); }}
                        className='h-7 px-3 rounded-md text-xs bg-white/5 hover:bg-white/10 text-white/80 border border-white/10'
                        aria-label='Clear all filters'
                    >
                        Clear
                    </button>
                </div>
            </div>

            <div className='h-[calc(24rem-2.5rem)] overflow-y-auto hidescroll pr-1'>
            {pageRows.map(item => {
                                const active = item.active
                                const name = item.name
                                const inventory = item?.trackQuantity ? (item.quantity || 0) : (item?.metadata?.inventory)
                                const variantThumb = Array.isArray(item.variants) && item.variants.find(v => v?.image)?.image
                                const image = variantThumb || item.images?.[0] || 'https://plus.unsplash.com/premium_photo-1677249227771-43a86c13eb76?q=80&w=1287&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D'
                                const variants = Array.isArray(item.variants) ? item.variants : []
                                const variantCount = variants.length
                                const variantPreview = variantCount ? variants.slice(0, 2).map(v => v.title || 'Variant').join(' · ') : null
                                const price = getPrice(item)
                                const currency = item?.currency || 'USD'
                                const priceDisplay = price > 0 ? formatMoney(price, currency) : null

                return (
                    <button
                        key={item.id}
                        onClick={() => { setWidow('openEdit'); setSelectedProductData(item) }}
                        className='group grid grid-cols-[1fr_auto_auto] items-center mt-2 w-full text-left bg-white/5 hover:bg-white/10 border border-white/10 rounded px-3 py-2 transition'
                    >
                        <div className='PRODUCT flex items-center gap-3 min-w-0'>
                            <img className='rounded-full object-cover h-12 w-12 ring-1 ring-white/20' src={image} alt="" />
                            <div className='flex flex-col min-w-0'>
                                <p className='font-medium truncate'>{name}</p>
                                {variantCount > 0 && (
                                    <span className='text-xs text-white/70 truncate'>{variantCount} variants{variantPreview ? ` — ${variantPreview}` : ''}</span>
                                )}
                                <div className='flex gap-2 mt-1'>
                                    {item.trackQuantity && (
                                        <span className='text-[10px] px-2 py-0.5 rounded-full bg-blue-500/15 text-blue-300 ring-1 ring-blue-400/30'>Tracked</span>
                                    )}
                                    {item.requiresShipping && (
                                        <span className='text-[10px] px-2 py-0.5 rounded-full bg-green-500/15 text-green-300 ring-1 ring-green-400/30'>Ships</span>
                                    )}
                                    {variantCount > 0 && (
                                        <span className='text-[10px] px-2 py-0.5 rounded-full bg-purple-500/15 text-purple-300 ring-1 ring-purple-400/30'>Variants</span>
                                    )}
                                </div>
                            </div>
                        </div>
                        <div className='STATUS h-full w-fit pl-3'>
                            <span className={`inline-flex items-center justify-center rounded-full h-7 px-3 text-xs font-medium ${active ? 'bg-green-500/20 text-green-300 ring-1 ring-green-400/30' : 'bg-white/10 text-white/70 ring-1 ring-white/20'}`}>
                                {active ? 'Active' : 'Draft'}
                            </span>
                        </div>
                        <div className='INVENTOR h-full w-32 text-right text-white/80 text-sm'>
                            <div>{Number(inventory || 0)} in stock</div>
                            {priceDisplay && <div className='text-xs text-white/60 mt-0.5'>{priceDisplay}</div>}
                        </div>
                    </button>
                )
            })}
            {filtered.length === 0 && (
                <div className='mt-8 text-center text-white/60 text-sm'>No products match your filters.</div>
            )}
            </div>

            {/* Pagination footer */}
            <div className='mt-2 flex items-center justify-between text-xs text-white/70'>
                <div>
                    {total > 0 ? (
                        <span>Showing {Math.min(total, start + 1)}–{Math.min(total, end)} of {total}</span>
                    ) : (
                        <span>Showing 0 of 0</span>
                    )}
                </div>
                <div className='flex items-center gap-2'>
                    <Select
                        size='small'
                        value={pageSize}
                        onChange={(v) => { setPageSize(v); setPage(1); }}
                        options={[10, 20, 50, 100].map(n => ({ label: `${n}/page`, value: n }))}
                        className='w-24'
                    />
                    <button
                        type='button'
                        onClick={() => setPage(p => Math.max(1, p - 1))}
                        disabled={currentPage <= 1}
                        className='h-7 px-3 rounded-md bg-white/5 enabled:hover:bg-white/10 disabled:opacity-40 border border-white/10'
                    >
                        Prev
                    </button>
                    <span className='min-w-[3.5rem] text-center'>{currentPage} / {totalPages}</span>
                    <button
                        type='button'
                        onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                        disabled={currentPage >= totalPages}
                        className='h-7 px-3 rounded-md bg-white/5 enabled:hover:bg-white/10 disabled:opacity-40 border border-white/10'
                    >
                        Next
                    </button>
                </div>
            </div>
        </div>
    )
}

export default ProductsListAdmin