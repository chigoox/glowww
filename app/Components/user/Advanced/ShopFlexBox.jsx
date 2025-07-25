'use client'

import { EditOutlined } from '@ant-design/icons';
import { Element, useNode } from "@craftjs/core";
import { Button, ColorPicker, Divider, Input, Modal, Select, Slider, Switch } from "antd";
import { useEffect, useState } from "react";
import { FlexBox } from "../FlexBox";
import ContextMenu from "../../support/ContextMenu";
import { useContextMenu } from "../../support/useContextMenu";
import useEditorDisplay from "../../support/useEditorDisplay";


// Mock Stripe Products Data
const mockStripeProducts = {
    products: [
        {
            id: 'prod_brabus_1',
            name: 'BRABUS 900 Rocket Edition',
            price: 65000000,
            originalPrice: 70000000,
            images: [
                'https://www.brabus.com/_Resources/Persistent/b/c/f/7/bcf7015a266b18cecb12301757b7810b34c43773/BRABUS%20900%20Rocket%20Edition%20%20%2830%29-1170x780.jpg',
                'https://www.brabus.com/_Resources/Persistent/8/c/0/f/8c0fe66b6b89ee5d6ac52cc8197a1d10d59b963b/20210909_untitled%20shoot6327-1170x780.jpg',
                'https://www.brabus.com/_Resources/Persistent/4/3/f/0/43f066fb4f6397e3e8778cb47595cd76ac776f63/BRABUS%20900%20Rocket%20Edition%20%20%2831%29-1170x780.jpg'
            ],
            category: 'supercars',
            collection: '6x6',
            variants: [
                { id: 'var_brabus_1_standard', size: 'Standard', price: 65000000 }
            ]
        },
        {
            id: 'prod_brabus_2',
            name: 'BRABUS 900 PEETCH',
            price: 64000000,
            originalPrice: 67000000,
            images: [
                'https://www.brabus.com/_Resources/Persistent/7/9/2/4/7924bce6ed7a4463b7173059f37f793e1a8d92a2/BRABUS%20900%20PEETCH_klein%20%20%2823%29-1170x780.jpg',
                'https://www.brabus.com/_Resources/Persistent/f/8/0/b/f80bada696c97e974d2f2736a0010a06bacb3fcf/BRABUS%20900%20PEETCH_klein%20%20%2837%29-520x780.jpg',
                'https://www.brabus.com/_Resources/Persistent/7/6/3/8/7638c685bc5ef3de3c55f8242981855d15926293/BRABUS%20900%20PEETCH_klein%20%20%2868%29-520x780.jpg'
            ],
            category: 'supercars',
            collection: '6x6',
            variants: [
                { id: 'var_brabus_2_standard', size: 'Standard', price: 64000000 }
            ]
        },
        {
            id: 'prod_brabus_3',
            name: 'BRABUS 900 Crawler',
            price: 72000000,
            originalPrice: 75000000,
            images: [
                'https://www.brabus.com/_Resources/Persistent/c/7/4/3/c7437c5099d5bd7df86a8c79c5baa0c766859df2/BRABUS%20900%20Crawler_outdoor%20%2873%29-1170x780.jpg',
                'https://www.brabus.com/_Resources/Persistent/2/e/1/4/2e146b24e3d44015a0dc837031f593e6e3f3f32d/BRABUS%20900%20Crawler_outdoor%20%2853%29-1170x780.jpg',
                'https://www.brabus.com/_Resources/Persistent/1/2/0/f/120f9dbf23474cb5050c59c4a2a3e629312f6822/BRABUS%20900%20Crawler_outdoor%20%2839%29-1170x780.jpg'
            ],
            category: 'supercars',
            collection: 'rocket-edition',
            variants: [
                { id: 'var_brabus_3_standard', size: 'Standard', price: 72000000 }
            ]
        },
        {
            id: 'prod_brabus_4',
            name: 'BRABUS Crawler Supercar',
            price: 80000000,
            originalPrice: 85000000,
            images: [
                'https://www.brabus.com/f/b/19fb6a6a716ea45750c28cfa57856b2a6ad359/Crawler_Supercar-1920x1279-730x486.jpg'
            ],
            category: 'supercars',
            collection: 'crawler',
            variants: [
                { id: 'var_brabus_4_standard', size: 'Standard', price: 80000000 }
            ]
        },
        {
            id: 'prod_brabus_5',
            name: 'BRABUS Taycan',
            price: 90000000,
            originalPrice: 95000000,
            images: [
                'https://www.brabus.com/_Resources/Persistent/9/4/9/b/949b3366c639eaffe739dc71d850384c9140087b/Brabus_Taycan_004-1170x780.jpg'
            ],
            category: 'supercars',
            collection: 'supercar',
            variants: [
                { id: 'var_brabus_5_standard', size: 'Standard', price: 90000000 }
            ]
        },
        {
            id: 'prod_brabus_6',
            name: 'Mercedes-AMG GTR',
            price: 88000000,
            originalPrice: 90000000,
            images: [
                'https://www.mercedes-benz.com.au/content/dam/hq/passengercars/cars/landing-pages/amg-brand-area/amg/performance/09-2024/images/mercedes-amg-brand-area-performance-characteristics-formfunction-2176x1224-09-2024.jpg/1744718057949.jpg?im=Crop,rect=(0,0,2176,1224);Resize=(1280,720)',
                'https://www.mercedes-benz.com.au/content/dam/hq/passengercars/cars/landing-pages/amg-brand-area/amg/performance/09-2024/images/mercedes-amg-brand-area-performance-characteristics-inside-2176x1224-09-2024.jpg/1744718058451.jpg?im=Crop,rect=(0,0,2176,1224);Resize=(1280,720)',
                'https://www.mercedes-benz.com.au/content/dam/hq/passengercars/cars/landing-pages/amg-brand-area/amg/icons/09-2024/images/mercedes-amg-brand-area-icons-amg-gtr-2176x1224-09-2024.jpg/1744718060735.jpg?im=Crop,rect=(0,0,2176,1224);Resize=(1280,720)'
            ],
            category: 'supercars',
            collection: 'rocket-gts',
            variants: [
                { id: 'var_brabus_6_standard', size: 'Standard', price: 88000000 }
            ]
        },
        {
            id: 'prod_brabus_7',
            name: 'BMW M8 Coupe Fire Red',
            price: 60000000,
            originalPrice: 65000000,
            images: [
                'https://www.topgear.com/sites/default/files/cars-car/carousel/2019/10/bmw_m8_coupe_fire_red_033.jpg?w=892&h=502'
            ],
            category: 'studio',
            collection: 'dsc',
            variants: [
                { id: 'var_brabus_7_standard', size: 'Standard', price: 60000000 }
            ]
        },
        {
            id: 'prod_brabus_8',
            name: 'Fotos Website',
            price: 55000000,
            originalPrice: 57000000,
            images: [
                'https://www.brabus.com/f/8/f2f818f8086192a3d8d95a849b6e60767fae/fotos_website_16122023-24-520x780.jpg'
            ],
            category: 'website',
            collection: 'fotos',
            variants: [
                { id: 'var_brabus_8_standard', size: 'Standard', price: 55000000 }
            ]
        },
         {
            id: 'prod_Dreams_1',
            name: 'Tropical Dreams Crochet Mini Skirt Set',
            price: 650000,
            originalPrice: 700000,
            images: [
                'https://cdn.shopify.com/s/files/1/0293/9277/files/05-20-25_S6_14_25GWY1328_YellowCombo_RK_PC_09-50-16_87875_MH-Totie_BH.jpg?v=1751324952&width=600&height=900&crop=center',
                'https://cdn.shopify.com/s/files/1/0293/9277/files/05-20-25_S6_14_25GWY1328_YellowCombo_RK_PC_09-51-31_87878_MH-Totie_BH_MH.jpg?v=1749669207&width=600&height=900&crop=center',
                'https://cdn.shopify.com/s/files/1/0293/9277/files/05-20-25_S6_14_25GWY1328_YellowCombo_RK_PC_09-50-00_87867_MH-Totie_BH_MH.jpg?v=1751324952&width=600&height=900&crop=center'
            ],
            category: 'clothes',
            collection: '6x6',
            variants: [
                { id: 'var_brabus_1_standard', size: 'Standard', price: 65000000 }
            ]
        },
        {
            id: 'prod_Drems_1',
            name: 'Island Bloom Crochet Maxi Skirt Set - Yellow/combo',
            price: 65000,
            originalPrice: 70000,
            images: [
                'https://cdn.shopify.com/s/files/1/0293/9277/files/06-04-25_S3_66_KOLM5020601_Yellowcombo_TK_IM_14-09-42_1036_ES.jpg?v=1749231846&width=600&height=900&crop=center',
                'https://cdn.shopify.com/s/files/1/0293/9277/files/06-04-25_S3_66_KOLM5020601_Yellowcombo_TK_IM_14-10-33_1049_ES.jpg?v=1749231846&width=600&height=900&crop=center',
            ],
            category: 'clothes',
            collection: 'clothes',
            variants: [
                { id: 'var_brabus_6_standard', size: 'Standard', price: 65000000 }
            ]
        },
        {
            id: 'prod_Drs_1',
            name: 'Adira Hooded Sweater Top',
            price: 45000,
            originalPrice: 49000,
            images: [
                'https://cdn.shopify.com/s/files/1/0293/9277/files/03-04-25_S2_37_KLQT4111301_Olive_ZSR_KS_JS_12-52-48_51787_PXF_SG.jpg?v=1741305337&width=600&height=900&crop=center',
                'https://cdn.shopify.com/s/files/1/0293/9277/files/03-04-25_S2_37_KLQT4111301_Olive_ZSR_KS_JS_12-52-48_51790_PXF.jpg?v=1741305337&width=600&height=900&crop=center',
                'https://cdn.shopify.com/s/files/1/0293/9277/files/03-04-25_S2_37_KLQT4111301_Olive_ZSR_KS_JS_12-52-48_51805_PXF.jpg?v=1741305337&width=600&height=900&crop=center',
            ],
            category: 'clothes',
            collection: 'clothes',
            variants: [
                { id: 'var_bras_3_standard', size: 'Standard', price: 65000000 }
            ]
        },
    ],
    categories: [
        { id: 'supercars', name: 'Supercars', count: 6 },
        { id: 'studio', name: 'Studio', count: 1 },
        { id: 'website', name: 'Website', count: 1 },
        { id: 'clothes', name: 'Clothes', count: 1 }

    ],
    collections: [
        { id: '6x6', name: '6x6', count: 2 },
        { id: 'rocket-edition', name: 'Rocket Edition', count: 1 },
        { id: 'crawler', name: 'Crawler', count: 1 },
        { id: 'supercar', name: 'Supercar', count: 1 },
        { id: 'rocket-gts', name: 'Rocket GTS', count: 1 },
        { id: 'dsc', name: 'DSC', count: 1 },
        { id: 'fotos', name: 'Fotos', count: 1 },
        { id: 'clothes', name: 'clothes', count: 3 },
    ]
};

// Custom Image component that doesn't allow src editing
export const ShopImage = ({
    src,
    alt = "",
    width = "100%",
    height = "100%",
    objectFit = "cover",
    borderRadius = 0,
    ...props
}) => {
    const { connectors: { connect, drag }, selected } = useNode((state) => ({
        selected: state.events.selected,
    }));

    return (
        <div
            ref={(ref) => ref && connect(drag(ref))}
            className={selected ? "selected-shop-image" : ""}
            style={{
                position: 'relative',
                outline: selected ? '2px solid #1890ff' : 'none',
                outlineOffset: '2px'
            }}
        >
            <img
                src={src}
                alt={alt}
                style={{
                    width,
                    height,
                    objectFit,
                    borderRadius,
                    display: 'block',
                    ...props.style
                }}
                {...props}
            />
        </div>
    );
};

ShopImage.craft = {
    props: {
        width: "100%",
        height: "100%",
        objectFit: "cover",
        borderRadius: 0,
    },
    rules: {
        canDrag: () => true,
        canDrop: () => false,
        canMoveIn: () => false,
        canMoveOut: () => false,
    },
    related: {
        styleMenu: {
            supportedProps: [
                'width', 'height', 'objectFit', 'borderRadius'
            ]
        }
    }
};

// Custom Text component that doesn't allow content editing
export const ShopText = ({
    text = "",
    fontSize = "16px",
    fontWeight = "normal",
    color = "#333",
    textAlign = "left",
    lineHeight = "1.4",
    ...props
}) => {
    const { connectors: { connect, drag }, selected } = useNode((state) => ({
        selected: state.events.selected,
    }));

    return (
        <div
            ref={(ref) => ref && connect(drag(ref))}
            className={selected ? "selected-shop-text" : ""}
            style={{
                outline: selected ? '2px solid #1890ff' : 'none',
                outlineOffset: '2px'
            }}
        >
            <span
                style={{
                    fontSize,
                    fontWeight,
                    color,
                    textAlign,
                    lineHeight,
                    ...props.style
                }}
                {...props}
            >
                {text}
            </span>
        </div>
    );
};

ShopText.craft = {
    props: {
        text: "",
        fontSize: "16px",
        fontWeight: "normal",
        color: "#333",
        textAlign: "left",
        lineHeight: "1.4",
    },
    rules: {
        canDrag: () => true,
        canDrop: () => false,
        canMoveIn: () => false,
        canMoveOut: () => false,
    },
    related: {
        styleMenu: {
            supportedProps: [
                'fontSize', 'fontWeight', 'color', 'textAlign', 'lineHeight'
            ]
        }
    }
};


// Replace the entire ShopFlexBox component with this fixed version:

export const ShopFlexBox = ({
    // Shop-specific props
    selectedProducts = [],
    selectedCategories = [],
    selectedCollections = [],
    baseUrl = "shop.com/shop",
    linkType = "name",
    showDiscount = true,
    showQuickAdd = true,
    showWishlist = true,
    autoSlide = false,
    slideInterval = 3000,

    // Layout props
    width = "100%",
    height = "auto",
    display = "flex",
    flexDirection = "row",
    flexWrap = "wrap",
    justifyContent = "flex-start",
    alignItems = "stretch",
    gap = 20,
    padding = 20,
    backgroundColor = "transparent",
    borderRadius = 8,

    // Product Item Styling Props
    itemWidth = "280px",
    itemBackgroundColor = "white",
    itemBorderRadius = "8px",
    itemBoxShadow = "0 2px 8px rgba(0,0,0,0.1)",
    itemPadding = "16px",
    itemGap = "8px",
    itemBorder = "none",

    // Image Styling Props
    imageHeight = "200px",
    imageBorderRadius = "8px",
    imageObjectFit = "cover",
    imageMarginBottom = "12px",

    // Title Styling Props
    titleFontSize = "16px",
    titleFontWeight = "600",
    titleFontFamily = "Arial, sans-serif",
    titleColor = "#333",
    titleLineHeight = "1.4",
    titleMarginBottom = "8px",

    // Price Styling Props
    priceFontSize = "18px",
    priceFontFamily = "Arial, sans-serif",
    priceColor = "#ff4d4f",
    priceFontWeight = "bold",
    originalPriceFontSize = "14px",
    originalPriceFontFamily = "Arial, sans-serif",
    originalPriceColor = "#999",
    priceGap = "8px",

    // Button Styling Props
    buttonBackgroundColor = "#000",
    buttonColor = "white",
    buttonFontFamily = "Arial, sans-serif",
    buttonBorderRadius = "6px",
    buttonPadding = "12px 16px",
    buttonFontSize = "14px",
    buttonFontWeight = "500",
    buttonBorder = "none",
    buttonMarginTop = "8px",

    // Badge Styling Props
    badgeBackgroundColor = "#ff4d4f",
    badgeColor = "white",
    badgeFontSize = "12px",
    badgeFontFamily = "Arial, sans-serif",
    badgePadding = "4px 8px",
    badgeBorderRadius = "4px",

    // Wishlist Button Styling Props
    wishlistBackgroundColor = "rgba(255,255,255,0.9)",
    wishlistSize = "32px",
    wishlistColor = "#333",

    className = "",
    children
}) => {
    const { connectors: { connect, drag }, actions: { setProp }, selected: isSelected, id: nodeId } = useNode((node) => ({
        selected: node.events.selected,
        id: node.id,
    }));

    // Context menu functionality
    const { contextMenu, handleContextMenu, closeContextMenu } = useContextMenu();
    const { hideEditorUI } = useEditorDisplay();

    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [currentImageIndex, setCurrentImageIndex] = useState({});
    const [isVariantModalOpen, setIsVariantModalOpen] = useState(false);
    const [currentProduct, setCurrentProduct] = useState(null);
    const [selectedElement, setSelectedElement] = useState('container');
    const [isAdjusting, setIsAdjusting] = useState(false);

    // Local editing state to prevent re-renders during adjustments
    const [editingState, setEditingState] = useState({
        activeSlider: null,
        tempValues: {}
    });

    const formatPrice = (price) => {
        return `$${(price / 100).toFixed(2)}`;
    };

    // Helper function to get products to display
    const getDisplayProducts = () => {
        let products = [];

        if (selectedProducts.length > 0) {
            const individualProducts = mockStripeProducts.products.filter(product => 
                selectedProducts.includes(product.id)
            );
            products = [...products, ...individualProducts];
        }

        if (selectedCategories.length > 0) {
            const categoryProducts = mockStripeProducts.products.filter(product =>
                selectedCategories.includes(product.category)
            );
            products = [...products, ...categoryProducts];
        }

        if (selectedCollections.length > 0) {
            const collectionProducts = mockStripeProducts.products.filter(product =>
                selectedCollections.includes(product.collection)
            );
            products = [...products, ...collectionProducts];
        }

        const uniqueProducts = products.filter((product, index, self) =>
            index === self.findIndex(p => p.id === product.id)
        );

        return uniqueProducts;
    };

    // Helper functions
    const handleImageNav = (productId, direction) => {
        const product = mockStripeProducts.products.find(p => p.id === productId);
        if (!product) return;

        const currentIndex = currentImageIndex[productId] || 0;
        let newIndex;

        if (direction === 'next') {
            newIndex = (currentIndex + 1) % product.images.length;
        } else {
            newIndex = currentIndex === 0 ? product.images.length - 1 : currentIndex - 1;
        }

        setCurrentImageIndex(prev => ({ ...prev, [productId]: newIndex }));
    };

    const handleQuickAdd = (product) => {
        if (product.variants && product.variants.length > 1) {
            setCurrentProduct(product);
            setIsVariantModalOpen(true);
        } else {
            console.log('Adding to cart:', product.id);
        }
    };

    const handleVariantSelect = (variant) => {
        console.log('Adding variant to cart:', variant);
        setIsVariantModalOpen(false);
        setCurrentProduct(null);
    };

    // Auto-slide effect
    useEffect(() => {
        if (!autoSlide) return;

        const interval = setInterval(() => {
            const displayProducts = getDisplayProducts();
            displayProducts.forEach(product => {
                if (product.images.length > 1) {
                    handleImageNav(product.id, 'next');
                }
            });
        }, slideInterval);

        return () => clearInterval(interval);
    }, [autoSlide, slideInterval, currentImageIndex]);

    // Create product item
    const createProductItem = (product) => {
        const currentImg = currentImageIndex[product.id] || 0;
        const hasDiscount = product.originalPrice && product.originalPrice > product.price;
        const discountPercent = hasDiscount ? Math.round(((product.originalPrice - product.price) / product.originalPrice) * 100) : 0;

        return (
            <div
                key={product.id}
                style={{
                    display: 'flex',
                    flexDirection: 'column',
                    width: itemWidth,
                    padding: itemPadding,
                    backgroundColor: itemBackgroundColor,
                    borderRadius: itemBorderRadius,
                    boxShadow: itemBoxShadow,
                    border: itemBorder,
                    position: 'relative',
                    marginBottom: '16px',
                    gap: itemGap
                }}
            >
                {/* Image Container */}
                <div
                    style={{
                        width: '100%',
                        height: imageHeight,
                        position: 'relative',
                        borderRadius: imageBorderRadius,
                        overflow: 'hidden',
                        marginBottom: imageMarginBottom
                    }}
                >
                    {/* Discount Badge */}
                    {showDiscount && hasDiscount && (
                        <div
                            style={{
                                position: 'absolute',
                                top: 8,
                                left: 8,
                                background: badgeBackgroundColor,
                                color: badgeColor,
                                padding: badgePadding,
                                borderRadius: badgeBorderRadius,
                                fontSize: badgeFontSize,
                                fontFamily: badgeFontFamily,
                                fontWeight: 'bold',
                                zIndex: 10
                            }}
                        >
                            {discountPercent}% OFF
                        </div>
                    )}

                    {/* Wishlist Button */}
                    {showWishlist && (
                        <button
                            style={{
                                position: 'absolute',
                                top: 8,
                                right: 8,
                                width: wishlistSize,
                                height: wishlistSize,
                                borderRadius: '50%',
                                background: wishlistBackgroundColor,
                                border: 'none',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                zIndex: 10,
                                cursor: 'pointer',
                                color: wishlistColor
                            }}
                            onClick={(e) => {
                                e.preventDefault();
                                console.log('Add to wishlist:', product.id);
                            }}
                        >
                            ♡
                        </button>
                    )}

                    {/* Product Image */}
                    <img
                        src={product.images[currentImg]}
                        alt={product.name}
                        style={{
                            width: '100%',
                            height: '100%',
                            objectFit: imageObjectFit
                        }}
                    />

                    {/* Image Navigation */}
                    {product.images.length > 1 && (
                        <>
                            <button
                                style={{
                                    position: 'absolute',
                                    left: 8,
                                    top: '50%',
                                    transform: 'translateY(-50%)',
                                    width: 28,
                                    height: 28,
                                    borderRadius: '50%',
                                    background: 'rgba(0,0,0,0.5)',
                                    color: 'white',
                                    border: 'none',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    cursor: 'pointer',
                                    zIndex: 10,
                                    fontSize: '12px'
                                }}
                                onClick={(e) => {
                                    e.preventDefault();
                                    handleImageNav(product.id, 'prev');
                                }}
                            >
                                ‹
                            </button>

                            <button
                                style={{
                                    position: 'absolute',
                                    right: 8,
                                    top: '50%',
                                    transform: 'translateY(-50%)',
                                    width: 28,
                                    height: 28,
                                    borderRadius: '50%',
                                    background: 'rgba(0,0,0,0.5)',
                                    color: 'white',
                                    border: 'none',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    cursor: 'pointer',
                                    zIndex: 10,
                                    fontSize: '12px'
                                }}
                                onClick={(e) => {
                                    e.preventDefault();
                                    handleImageNav(product.id, 'next');
                                }}
                            >
                                ›
                            </button>

                            {/* Image Dots */}
                            <div
                                style={{
                                    position: 'absolute',
                                    bottom: 8,
                                    left: '50%',
                                    transform: 'translateX(-50%)',
                                    display: 'flex',
                                    gap: '4px',
                                    zIndex: 10
                                }}
                            >
                                {product.images.map((_, index) => (
                                    <div
                                        key={index}
                                        style={{
                                            width: 6,
                                            height: 6,
                                            borderRadius: '50%',
                                            background: index === currentImg ? 'white' : 'rgba(255,255,255,0.5)',
                                            cursor: 'pointer'
                                        }}
                                        onClick={(e) => {
                                            e.preventDefault();
                                            setCurrentImageIndex(prev => ({ ...prev, [product.id]: index }));
                                        }}
                                    />
                                ))}
                            </div>
                        </>
                    )}
                </div>

                {/* Product Info */}
                <div style={{ display: 'flex', flexDirection: 'column', width: '100%' }}>
                    {/* Product Name */}
                    <span
                        style={{
                            fontSize: titleFontSize,
                            fontFamily: titleFontFamily,
                            fontWeight: titleFontWeight,
                            color: titleColor,
                            lineHeight: titleLineHeight,
                            marginBottom: titleMarginBottom
                        }}
                    >
                        {product.name}
                    </span>

                    {/* Price Container */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: priceGap }}>
                        <span
                            style={{
                                fontSize: priceFontSize,
                                fontFamily: priceFontFamily,
                                fontWeight: priceFontWeight,
                                color: priceColor
                            }}
                        >
                            {formatPrice(product.price)}
                        </span>
                        {hasDiscount && (
                            <span
                                style={{
                                    fontSize: originalPriceFontSize,
                                    fontFamily: originalPriceFontFamily,
                                    color: originalPriceColor,
                                    textDecoration: 'line-through'
                                }}
                            >
                                {formatPrice(product.originalPrice)}
                            </span>
                        )}
                    </div>

                    {/* Quick Add Button */}
                    {showQuickAdd && (
                        <button
                            style={{
                                backgroundColor: buttonBackgroundColor,
                                color: buttonColor,
                                fontFamily: buttonFontFamily,
                                borderRadius: buttonBorderRadius,
                                padding: buttonPadding,
                                fontSize: buttonFontSize,
                                fontWeight: buttonFontWeight,
                                width: '100%',
                                border: buttonBorder,
                                cursor: 'pointer',
                                marginTop: buttonMarginTop
                            }}
                            onClick={(e) => {
                                e.preventDefault();
                                handleQuickAdd(product);
                            }}
                        >
                            🛒 Quick Add
                        </button>
                    )}
                </div>
            </div>
        );
    };

    const displayProducts = getDisplayProducts();

    return (
        <>
            <FlexBox
                ref={(ref) => ref && connect(drag(ref))}
                width={width}
                height={height}
                display={display}
                flexDirection={flexDirection}
                flexWrap={flexWrap}
                justifyContent={justifyContent}
                alignItems={alignItems}
                gap={gap}
                padding={padding}
                backgroundColor={backgroundColor}
                borderRadius={borderRadius}
                className={`${isSelected ? 'ring-2 ring-blue-500' : ''} ${className} shop-flexbox`}
                style={{
                    position: 'relative',
                    minHeight: displayProducts.length === 0 ? '200px' : 'auto'
                }}
                onContextMenu={hideEditorUI ? undefined : handleContextMenu}
            >
                {/* Edit Button */}
                {isSelected && !hideEditorUI && (
                    <div
                        style={{
                            position: "absolute",
                            top: -28,
                            left: "50%",
                            transform: "translateX(-50%)",
                            background: "#722ed1",
                            color: "white",
                            padding: "4px 8px",
                            borderRadius: "12px",
                            cursor: "pointer",
                            fontSize: "9px",
                            fontWeight: "bold",
                            userSelect: "none",
                            boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
                            zIndex: 1000,
                            display: "flex",
                            alignItems: "center",
                            gap: "2px",
                            minWidth: "48px",
                            justifyContent: "center",
                            border: "2px solid #d9d9d9"
                        }}
                        onClick={() => setIsEditModalOpen(true)}
                        onMouseDown={e => e.stopPropagation()}
                        title="Configure shop items"
                    >
                        ⚙️ EDIT
                    </div>
                )}

                {/* Products Display */}
                {displayProducts.length > 0 ? (
                    displayProducts.map(product => createProductItem(product))
                ) : (
                    <Element
                        id="empty-state-container"
                        is={FlexBox}
                        width="100%"
                        height="200px"
                        display="flex"
                        alignItems="center"
                        justifyContent="center"
                        flexDirection="column"
                        gap={8}
                        color="#999"
                        backgroundColor="#f9f9f9"
                        borderRadius={8}
                        border="2px dashed #ddd"
                        canvas
                    >
                        <div style={{ fontSize: '48px' }}>🛍️</div>
                        <Element
                            id="empty-state-text-1"
                            is={ShopText}
                            text="No products selected"
                            fontSize="16px"
                            color="#999"
                        />
                        <Element
                            id="empty-state-text-2"
                            is={ShopText}
                            text="Click edit to configure your shop"
                            fontSize="14px"
                            color="#ccc"
                        />
                    </Element>
                )}

                {children}
            </FlexBox>

            {/* Edit Modal */}
            <Modal
                title="Configure Shop Items & Styling"
                open={isEditModalOpen}
                onCancel={() => setIsEditModalOpen(false)}
                width={1400}
                style={{ top: 20 }}
                footer={[
                    <Button key="cancel" onClick={() => setIsEditModalOpen(false)}>
                        Cancel
                    </Button>,
                    <Button key="save" type="primary" onClick={() => setIsEditModalOpen(false)}>
                        Save Changes
                    </Button>
                ]}
            >
                <StyleEditorModal 
                    selectedElement={selectedElement}
                    setSelectedElement={setSelectedElement}
                    setProp={setProp}
                    editingState={editingState}
                    setEditingState={setEditingState}
                    setIsAdjusting={setIsAdjusting}
                    isAdjusting={isAdjusting}
                    createProductItem={createProductItem}
                    formatPrice={formatPrice}
                    // Pass all style props
                    itemWidth={itemWidth}
                    itemPadding={itemPadding}
                    itemGap={itemGap}
                    itemBackgroundColor={itemBackgroundColor}
                    itemBorderRadius={itemBorderRadius}
                    itemBoxShadow={itemBoxShadow}
                    imageHeight={imageHeight}
                    imageBorderRadius={imageBorderRadius}
                    imageMarginBottom={imageMarginBottom}
                    imageObjectFit={imageObjectFit}
                    titleFontSize={titleFontSize}
                    titleFontFamily={titleFontFamily}
                    titleLineHeight={titleLineHeight}
                    titleColor={titleColor}
                    titleMarginBottom={titleMarginBottom}
                    titleFontWeight={titleFontWeight}
                    priceFontSize={priceFontSize}
                    priceFontFamily={priceFontFamily}
                    priceColor={priceColor}
                    priceGap={priceGap}
                    originalPriceFontSize={originalPriceFontSize}
                    originalPriceFontFamily={originalPriceFontFamily}
                    originalPriceColor={originalPriceColor}
                    priceFontWeight={priceFontWeight}
                    buttonBackgroundColor={buttonBackgroundColor}
                    buttonBorderRadius={buttonBorderRadius}
                    buttonFontSize={buttonFontSize}
                    buttonFontFamily={buttonFontFamily}
                    buttonColor={buttonColor}
                    buttonMarginTop={buttonMarginTop}
                    buttonPadding={buttonPadding}
                    buttonFontWeight={buttonFontWeight}
                    badgeBackgroundColor={badgeBackgroundColor}
                    badgeFontSize={badgeFontSize}
                    badgeFontFamily={badgeFontFamily}
                    badgeColor={badgeColor}
                    badgeBorderRadius={badgeBorderRadius}
                    badgePadding={badgePadding}
                    wishlistBackgroundColor={wishlistBackgroundColor}
                    wishlistSize={wishlistSize}
                    wishlistColor={wishlistColor}
                    selectedProducts={selectedProducts}
                    selectedCategories={selectedCategories}
                    selectedCollections={selectedCollections}
                />
            </Modal>

            {/* Variant Selection Modal */}
            <Modal
                title="Select Size"
                open={isVariantModalOpen}
                onCancel={() => setIsVariantModalOpen(false)}
                footer={null}
                width={400}
            >
                {currentProduct && (
                    <div>
                        <div style={{ marginBottom: 16, textAlign: 'center' }}>
                            <ShopText text={currentProduct.name} fontSize="16px" fontWeight="600" />
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
                            {currentProduct.variants.map(variant => (
                                <Button
                                    key={variant.id}
                                    style={{
                                        height: 40,
                                        border: '1px solid #d9d9d9',
                                        borderRadius: 4
                                    }}
                                    onClick={() => handleVariantSelect(variant)}
                                >
                                    {variant.size}
                                </Button>
                            ))}
                        </div>
                    </div>
                )}
            </Modal>
            
            {/* Context Menu */}
            {!hideEditorUI && (
                <ContextMenu
                    visible={contextMenu.visible}
                    position={{ x: contextMenu.x, y: contextMenu.y }}
                    onClose={closeContextMenu}
                    targetNodeId={nodeId}
                />
            )}
        </>
    );
};

// Separate StyleEditor component to prevent recreation
const StyleEditorModal = ({ 
    selectedElement, 
    setSelectedElement, 
    setProp, 
    editingState, 
    setEditingState, 
    setIsAdjusting,
    isAdjusting,
    createProductItem,
    formatPrice,
    // All style props passed as props
    ...styleProps
}) => {
    // Get current value for any prop
    const getCurrentValue = (prop) => {
        return editingState.tempValues[prop] !== undefined 
            ? editingState.tempValues[prop] 
            : styleProps[prop];
    };

    const parsePixelValue = (value) => {
        if (typeof value === 'string' && value.endsWith('px')) {
            return parseInt(value.slice(0, -2)) || 0;
        }
        return parseInt(value) || 0;
    };

    const fontOptions = [
        { label: 'Arial', value: 'Arial, sans-serif' },
        { label: 'Helvetica', value: 'Helvetica, sans-serif' },
        { label: 'Times New Roman', value: 'Times New Roman, serif' },
        { label: 'Georgia', value: 'Georgia, serif' },
        { label: 'Courier New', value: 'Courier New, monospace' },
        { label: 'Verdana', value: 'Verdana, sans-serif' },
        { label: 'Trebuchet MS', value: 'Trebuchet MS, sans-serif' },
        { label: 'Impact', value: 'Impact, sans-serif' },
        { label: 'Comic Sans MS', value: 'Comic Sans MS, cursive' },
        { label: 'Palatino', value: 'Palatino, serif' },
        { label: 'Lucida Console', value: 'Lucida Console, monospace' },
        { label: 'Tahoma', value: 'Tahoma, sans-serif' }
    ];

    const handleSliderStart = (prop) => {
        setEditingState(prev => ({
            ...prev,
            activeSlider: prop
        }));
        setIsAdjusting(true);
    };

    const handleSliderChange = (prop, value) => {
        setEditingState(prev => ({
            ...prev,
            tempValues: {
                ...prev.tempValues,
                [prop]: value
            }
        }));
    };

    const handleSliderEnd = (prop, value) => {
        setProp(props => props[prop] = value);
        setEditingState(prev => ({
            ...prev,
            activeSlider: null,
            tempValues: {
                ...prev.tempValues,
                [prop]: undefined
            }
        }));
        setIsAdjusting(false);
    };

    const handleColorChange = (prop, value) => {
        setProp(props => props[prop] = value);
    };

    const renderSlider = (label, prop, min = 0, max = 500, step = 1, suffix = 'px') => {
        const currentValue = getCurrentValue(prop);
        const numericValue = parsePixelValue(currentValue);

        return (
            <div style={{ marginBottom: 16 }} key={`slider-${prop}`}>
                <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: 8
                }}>
                    <label style={{ fontSize: '13px', fontWeight: '500', color: '#333' }}>
                        {label}
                    </label>
                    <span style={{
                        fontSize: '12px',
                        color: '#666',
                        backgroundColor: '#f5f5f5',
                        padding: '2px 6px',
                        borderRadius: '4px',
                        minWidth: '50px',
                        textAlign: 'center'
                    }}>
                        {numericValue}{suffix}
                    </span>
                </div>
                <div onMouseDown={(e) => e.stopPropagation()}>
                    <Slider
                        min={min}
                        max={max}
                        step={step}
                        value={numericValue}
                        onChangeStart={() => handleSliderStart(prop)}
                        onChange={(value) => handleSliderChange(prop, `${value}${suffix}`)}
                        onChangeComplete={(value) => handleSliderEnd(prop, `${value}${suffix}`)}
                        tooltip={{ formatter: (value) => `${value}${suffix}` }}
                        style={{ margin: '0 4px' }}
                    />
                </div>
            </div>
        );
    };

    const renderColorPicker = (label, prop) => {
        const currentValue = getCurrentValue(prop);

        return (
            <div style={{ marginBottom: 16 }} key={`color-${prop}`}>
                <label style={{
                    display: 'block',
                    fontSize: '13px',
                    fontWeight: '500',
                    color: '#333',
                    marginBottom: 8
                }}>
                    {label}
                </label>
                <div 
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8,
                        padding: '6px',
                        border: '1px solid #d9d9d9',
                        borderRadius: '6px',
                        backgroundColor: '#fff'
                    }}
                    onMouseDown={(e) => e.stopPropagation()}
                >
                    <input
                        type="color"
                        value={currentValue}
                        onChange={(e) => handleColorChange(prop, e.target.value)}
                        style={{
                            width: 32,
                            height: 32,
                            border: 'none',
                            borderRadius: '4px',
                            cursor: 'pointer'
                        }}
                    />
                    <span style={{
                        fontSize: '12px',
                        color: '#666',
                        fontFamily: 'monospace'
                    }}>
                        {currentValue}
                    </span>
                </div>
            </div>
        );
    };

    const renderFontDropdown = (label, prop) => {
        const currentValue = getCurrentValue(prop);

        return (
            <div style={{ marginBottom: 16 }} key={`font-${prop}`}>
                <label style={{
                    display: 'block',
                    fontSize: '13px',
                    fontWeight: '500',
                    color: '#333',
                    marginBottom: 8
                }}>
                    {label}
                </label>
                <div onMouseDown={(e) => e.stopPropagation()}>
                    <Select
                        size="middle"
                        style={{ width: '100%' }}
                        value={currentValue}
                        onChange={(value) => setProp(props => props[prop] = value)}
                        options={fontOptions}
                        getPopupContainer={(trigger) => trigger.parentElement}
                    />
                </div>
            </div>
        );
    };

    const renderDropdown = (label, prop, options) => {
        const currentValue = getCurrentValue(prop);

        return (
            <div style={{ marginBottom: 16 }} key={`dropdown-${prop}`}>
                <label style={{
                    display: 'block',
                    fontSize: '13px',
                    fontWeight: '500',
                    color: '#333',
                    marginBottom: 8
                }}>
                    {label}
                </label>
                <div onMouseDown={(e) => e.stopPropagation()}>
                    <Select
                        size="middle"
                        style={{ width: '100%' }}
                        value={currentValue}
                        onChange={(value) => setProp(props => props[prop] = value)}
                        options={options}
                        getPopupContainer={(trigger) => trigger.parentElement}
                    />
                </div>
            </div>
        );
    };

    const renderButtonGroup = (label, prop, options) => {
        const currentValue = getCurrentValue(prop);

        return (
            <div style={{ marginBottom: 16 }} key={`buttongroup-${prop}`}>
                <label style={{
                    display: 'block',
                    fontSize: '13px',
                    fontWeight: '500',
                    color: '#333',
                    marginBottom: 8
                }}>
                    {label}
                </label>
                <div 
                    style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fit, minmax(80px, 1fr))',
                        gap: 6
                    }}
                    onMouseDown={(e) => e.stopPropagation()}
                >
                    {options.map(option => (
                        <Button
                            key={option.value}
                            size="small"
                            type={currentValue === option.value ? 'primary' : 'default'}
                            onClick={() => setProp(props => props[prop] = option.value)}
                            onMouseDown={(e) => e.stopPropagation()}
                            style={{
                                fontSize: '11px',
                                height: '28px'
                            }}
                        >
                            {option.label}
                        </Button>
                    ))}
                </div>
            </div>
        );
    };

    return (
        <div style={{ display: 'grid', gridTemplateColumns: '400px 1fr 350px', gap: 24, height: '70vh' }}>
            {/* Left Panel - Configuration */}
            <div style={{ borderRight: '1px solid #e8e8e8', paddingRight: 24 }}>
                <div style={{ height: '100%', overflowY: 'auto', paddingRight: 8 }}>
                    {/* Products Selection */}
                    <div style={{ marginBottom: 24 }}>
                        <h3 style={{ margin: '0 0 12px 0', fontSize: '16px', fontWeight: '600' }}>
                            Products
                        </h3>
                        <Select
                            mode="multiple"
                            style={{ width: '100%' }}
                            placeholder="Select individual products"
                            value={styleProps.selectedProducts}
                            onChange={(value) => setProp(props => props.selectedProducts = value)}
                            options={mockStripeProducts.products.map(product => ({
                                label: `${product.name} - ${formatPrice(product.price)}`,
                                value: product.id
                            }))}
                        />
                    </div>

                    {/* Categories */}
                    <div style={{ marginBottom: 24 }}>
                        <h3 style={{ margin: '0 0 12px 0', fontSize: '16px', fontWeight: '600' }}>
                            Categories
                        </h3>
                        <Select
                            mode="multiple"
                            style={{ width: '100%' }}
                            placeholder="Select categories"
                            value={styleProps.selectedCategories}
                            onChange={(value) => setProp(props => props.selectedCategories = value)}
                            options={mockStripeProducts.categories.map(category => ({
                                label: `${category.name} (${category.count} items)`,
                                value: category.id
                            }))}
                        />
                    </div>

                    {/* Collections */}
                    <div style={{ marginBottom: 24 }}>
                        <h3 style={{ margin: '0 0 12px 0', fontSize: '16px', fontWeight: '600' }}>
                            Collections
                        </h3>
                        <Select
                            mode="multiple"
                            style={{ width: '100%' }}
                            placeholder="Select collections"
                            value={styleProps.selectedCollections}
                            onChange={(value) => setProp(props => props.selectedCollections = value)}
                            options={mockStripeProducts.collections.map(collection => ({
                                label: `${collection.name} (${collection.count} items)`,
                                value: collection.id
                            }))}
                        />
                    </div>
                </div>
            </div>

            {/* Center Panel - Live Preview */}
            <div style={{
                display: 'flex',
                flexDirection: 'column',
                borderRight: '1px solid #e8e8e8',
                paddingRight: 24
            }}>
                <h3 style={{
                    margin: '0 0 16px 0',
                    fontSize: '16px',
                    fontWeight: '600',
                    textAlign: 'center'
                }}>
                    Live Preview
                </h3>
                <div style={{
                    flex: 1,
                    border: '1px solid #e8e8e8',
                    borderRadius: '12px',
                    padding: '24px',
                    backgroundColor: '#f9f9f9',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    overflow: 'auto'
                }}>
                    <div style={{ transform: 'scale(0.8)', transformOrigin: 'center' }}>
                        {!isAdjusting && createProductItem(mockStripeProducts.products[0])}
                        {isAdjusting && (
                            <div style={{
                                width: styleProps.itemWidth,
                                height: '400px',
                                backgroundColor: '#f0f0f0',
                                borderRadius: styleProps.itemBorderRadius,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: '14px',
                                color: '#666'
                            }}>
                                Adjusting...
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Right Panel - Style Editor */}
            <div>
                <h3 style={{
                    margin: '0 0 16px 0',
                    fontSize: '16px',
                    fontWeight: '600'
                }}>
                    Style Controls
                </h3>
                <div style={{ height: '100%', overflowY: 'auto', padding: '0 4px' }}>
                    {/* Element Selector */}
                    <div style={{ marginBottom: 24 }}>
                        <h3 style={{ margin: '0 0 12px 0', fontSize: '16px', fontWeight: '600' }}>
                            Edit Element
                        </h3>
                        <div onMouseDown={(e) => e.stopPropagation()}>
                            <Select
                                style={{ width: '100%' }}
                                size="large"
                                value={selectedElement}
                                onChange={setSelectedElement}
                                getPopupContainer={(trigger) => trigger.parentElement}
                                options={[
                                    { label: '📦 Container', value: 'container' },
                                    { label: '🖼️ Image', value: 'image' },
                                    { label: '📝 Title', value: 'title' },
                                    { label: '💰 Price', value: 'price' },
                                    { label: '🛒 Button', value: 'button' },
                                    { label: '🏷️ Badge', value: 'badge' },
                                    { label: '♡ Wishlist', value: 'wishlist' }
                                ]}
                            />
                        </div>
                    </div>

                    {/* Style Sections */}
                    {selectedElement === 'container' && (
                        <div style={{ backgroundColor: '#fff', padding: '20px', borderRadius: '8px', border: '1px solid #e8e8e8' }}>
                            <h4 style={{ margin: '0 0 16px 0', fontSize: '14px', fontWeight: '600', color: '#333' }}>
                                📦 Container Styles
                            </h4>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                                <div>
                                    {renderSlider('Width', 'itemWidth', 200, 500, 10)}
                                    {renderSlider('Padding', 'itemPadding', 0, 50, 2)}
                                    {renderSlider('Gap', 'itemGap', 0, 30, 2)}
                                </div>
                                <div>
                                    {renderColorPicker('Background', 'itemBackgroundColor')}
                                    {renderSlider('Border Radius', 'itemBorderRadius', 0, 50, 1)}
                                </div>
                            </div>
                        </div>
                    )}

                    {selectedElement === 'image' && (
                        <div style={{ backgroundColor: '#fff', padding: '20px', borderRadius: '8px', border: '1px solid #e8e8e8' }}>
                            <h4 style={{ margin: '0 0 16px 0', fontSize: '14px', fontWeight: '600', color: '#333' }}>
                                🖼️ Image Styles
                            </h4>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                                <div>
                                    {renderSlider('Height', 'imageHeight', 150, 400, 10)}
                                    {renderSlider('Border Radius', 'imageBorderRadius', 0, 50, 1)}
                                </div>
                                <div>
                                    {renderSlider('Margin Bottom', 'imageMarginBottom', 0, 30, 2)}
                                    {renderDropdown('Object Fit', 'imageObjectFit', [
                                        { label: 'Cover', value: 'cover' },
                                        { label: 'Contain', value: 'contain' },
                                        { label: 'Fill', value: 'fill' },
                                        { label: 'Scale Down', value: 'scale-down' }
                                    ])}
                                </div>
                            </div>
                        </div>
                    )}

                    {selectedElement === 'title' && (
                        <div style={{ backgroundColor: '#fff', padding: '20px', borderRadius: '8px', border: '1px solid #e8e8e8' }}>
                            <h4 style={{ margin: '0 0 16px 0', fontSize: '14px', fontWeight: '600', color: '#333' }}>
                                📝 Title Styles
                            </h4>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                                <div>
                                    {renderSlider('Font Size', 'titleFontSize', 10, 32, 1)}
                                    {renderSlider('Line Height', 'titleLineHeight', 1, 3, 0.1, '')}
                                    {renderColorPicker('Color', 'titleColor')}
                                </div>
                                <div>
                                    {renderFontDropdown('Font Family', 'titleFontFamily')}
                                    {renderSlider('Margin Bottom', 'titleMarginBottom', 0, 20, 1)}
                                </div>
                            </div>
                            {renderButtonGroup('Font Weight', 'titleFontWeight', [
                                { label: '300', value: '300' },
                                { label: '400', value: '400' },
                                { label: '500', value: '500' },
                                { label: '600', value: '600' },
                                { label: '700', value: '700' },
                                { label: 'Bold', value: 'bold' }
                            ])}
                        </div>
                    )}

                    {selectedElement === 'price' && (
                        <div style={{ backgroundColor: '#fff', padding: '20px', borderRadius: '8px', border: '1px solid #e8e8e8' }}>
                            <h4 style={{ margin: '0 0 16px 0', fontSize: '14px', fontWeight: '600', color: '#333' }}>
                                💰 Price Styles
                            </h4>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                                <div>
                                    <h5 style={{ margin: '0 0 12px 0', fontSize: '13px', fontWeight: '600', color: '#555' }}>
                                        Current Price
                                    </h5>
                                    {renderSlider('Font Size', 'priceFontSize', 12, 28, 1)}
                                    {renderFontDropdown('Font Family', 'priceFontFamily')}
                                    {renderColorPicker('Color', 'priceColor')}
                                    {renderSlider('Gap', 'priceGap', 4, 20, 1)}
                                </div>
                                <div>
                                    <h5 style={{ margin: '0 0 12px 0', fontSize: '13px', fontWeight: '600', color: '#555' }}>
                                        Original Price
                                    </h5>
                                    {renderSlider('Font Size', 'originalPriceFontSize', 10, 20, 1)}
                                    {renderFontDropdown('Font Family', 'originalPriceFontFamily')}
                                    {renderColorPicker('Color', 'originalPriceColor')}
                                </div>
                            </div>
                            {renderButtonGroup('Font Weight', 'priceFontWeight', [
                                { label: 'Normal', value: 'normal' },
                                { label: '500', value: '500' },
                                { label: '600', value: '600' },
                                { label: '700', value: '700' },
                                { label: 'Bold', value: 'bold' }
                            ])}
                        </div>
                    )}

                    {selectedElement === 'button' && (
                        <div style={{ backgroundColor: '#fff', padding: '20px', borderRadius: '8px', border: '1px solid #e8e8e8' }}>
                            <h4 style={{ margin: '0 0 16px 0', fontSize: '14px', fontWeight: '600', color: '#333' }}>
                                🛒 Button Styles
                            </h4>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                                <div>
                                    {renderColorPicker('Background', 'buttonBackgroundColor')}
                                    {renderSlider('Border Radius', 'buttonBorderRadius', 0, 25, 1)}
                                    {renderSlider('Font Size', 'buttonFontSize', 10, 20, 1)}
                                    {renderSlider('Margin Top', 'buttonMarginTop', 0, 20, 1)}
                                </div>
                                <div>
                                    {renderColorPicker('Text Color', 'buttonColor')}
                                    {renderFontDropdown('Font Family', 'buttonFontFamily')}
                                </div>
                            </div>
                            <div>
                                <label style={{
                                    display: 'block',
                                    fontSize: '13px',
                                    fontWeight: '500',
                                    color: '#333',
                                    marginBottom: 8
                                }}>
                                    Padding
                                </label>
                                <div 
                                    style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 6 }}
                                    onMouseDown={(e) => e.stopPropagation()}
                                >
                                    {[
                                        { label: 'XS', value: '8px 12px' },
                                        { label: 'SM', value: '10px 14px' },
                                        { label: 'MD', value: '12px 16px' },
                                        { label: 'LG', value: '14px 20px' }
                                    ].map(option => (
                                        <Button
                                            key={option.value}
                                            size="small"
                                            type={styleProps.buttonPadding === option.value ? 'primary' : 'default'}
                                            onClick={() => setProp(props => props.buttonPadding = option.value)}
                                            onMouseDown={(e) => e.stopPropagation()}
                                            style={{ fontSize: '10px', height: '28px' }}
                                        >
                                            {option.label}
                                        </Button>
                                    ))}
                                </div>
                            </div>
                            {renderButtonGroup('Font Weight', 'buttonFontWeight', [
                                { label: 'Normal', value: 'normal' },
                                { label: '500', value: '500' },
                                { label: '600', value: '600' },
                                { label: 'Bold', value: 'bold' }
                            ])}
                        </div>
                    )}

                    {selectedElement === 'badge' && (
                        <div style={{ backgroundColor: '#fff', padding: '20px', borderRadius: '8px', border: '1px solid #e8e8e8' }}>
                            <h4 style={{ margin: '0 0 16px 0', fontSize: '14px', fontWeight: '600', color: '#333' }}>
                                🏷️ Badge Styles
                            </h4>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                                <div>
                                    {renderColorPicker('Background', 'badgeBackgroundColor')}
                                    {renderSlider('Font Size', 'badgeFontSize', 8, 16, 1)}
                                    {renderSlider('Border Radius', 'badgeBorderRadius', 0, 15, 1)}
                                </div>
                                <div>
                                    {renderColorPicker('Text Color', 'badgeColor')}
                                    {renderFontDropdown('Font Family', 'badgeFontFamily')}
                                </div>
                            </div>
                            <div>
                                <label style={{
                                    display: 'block',
                                    fontSize: '13px',
                                    fontWeight: '500',
                                    color: '#333',
                                    marginBottom: 8
                                }}>
                                    Padding
                                </label>
                                <div 
                                    style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6 }}
                                    onMouseDown={(e) => e.stopPropagation()}
                                >
                                    {[
                                        { label: 'XS', value: '2px 6px' },
                                        { label: 'SM', value: '4px 8px' },
                                        { label: 'MD', value: '6px 10px' }
                                    ].map(option => (
                                        <Button
                                            key={option.value}
                                            size="small"
                                            type={styleProps.badgePadding === option.value ? 'primary' : 'default'}
                                            onClick={() => setProp(props => props.badgePadding = option.value)}
                                            onMouseDown={(e) => e.stopPropagation()}
                                            style={{ fontSize: '10px', height: '28px' }}
                                        >
                                            {option.label}
                                        </Button>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}

                    {selectedElement === 'wishlist' && (
                        <div style={{ backgroundColor: '#fff', padding: '20px', borderRadius: '8px', border: '1px solid #e8e8e8' }}>
                            <h4 style={{ margin: '0 0 16px 0', fontSize: '14px', fontWeight: '600', color: '#333' }}>
                                ♡ Wishlist Button
                            </h4>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                                <div>
                                    {renderColorPicker('Background', 'wishlistBackgroundColor')}
                                    {renderSlider('Size', 'wishlistSize', 24, 48, 2)}
                                </div>
                                <div>
                                    {renderColorPicker('Icon Color', 'wishlistColor')}
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

// Craft.js configuration
ShopFlexBox.craft = {
    displayName: "ShopBox",
    props: {
        selectedProducts: [],
        selectedCategories: [],
        selectedCollections: [],
        baseUrl: "shop.com/shop",
        linkType: "name",
        showDiscount: true,
        showQuickAdd: true,
        showWishlist: true,
        autoSlide: false,
        slideInterval: 3000,
        width: "auto",
        height: "auto",
        display: "flex",
        flexDirection: "row",
        flexWrap: "wrap",
        justifyContent: "flex-start",
        alignItems: "stretch",
        gap: 20,
        padding: 20,
        backgroundColor: "transparent",
        borderRadius: 8,
        className: "",

        // Product Item Styling
        itemWidth: "280px",
        itemBackgroundColor: "white",
        itemBorderRadius: "8px",
        itemBoxShadow: "0 2px 8px rgba(0,0,0,0.1)",
        itemPadding: "16px",
        itemGap: "8px",
        itemBorder: "none",

        // Image Styling
        imageHeight: "200px",
        imageBorderRadius: "8px",
        imageObjectFit: "cover",
        imageMarginBottom: "12px",

        // Title Styling
        titleFontSize: "16px",
        titleFontWeight: "600",
        titleFontFamily: "Arial, sans-serif",
        titleColor: "#333",
        titleLineHeight: "1.4",
        titleMarginBottom: "8px",

        // Price Styling
        priceFontSize: "18px",
        priceFontFamily: "Arial, sans-serif",
        priceColor: "#ff4d4f",
        priceFontWeight: "bold",
        originalPriceFontSize: "14px",
        originalPriceFontFamily: "Arial, sans-serif",
        originalPriceColor: "#999",
        priceGap: "8px",

        // Button Styling
        buttonBackgroundColor: "#000",
        buttonColor: "white",
        buttonFontFamily: "Arial, sans-serif",
        buttonBorderRadius: "6px",
        buttonPadding: "12px 16px",
        buttonFontSize: "14px",
        buttonFontWeight: "500",
        buttonBorder: "none",
        buttonMarginTop: "8px",

        // Badge Styling
        badgeBackgroundColor: "#ff4d4f",
        badgeColor: "white",
        badgeFontSize: "12px",
        badgeFontFamily: "Arial, sans-serif",
        badgePadding: "4px 8px",
        badgeBorderRadius: "4px",

        // Wishlist Styling
        wishlistBackgroundColor: "rgba(255,255,255,0.9)",
        wishlistSize: "32px",
        wishlistColor: "#333"
    },
    rules: {
        canDrag: () => true,
        canDrop: () => true,
        canMoveIn: () => false,
        canMoveOut: () => true,
    },
    related: {
        styleMenu: {
            supportedProps: [
                'width', 'height', 'display', 'flexDirection', 'flexWrap',
                'justifyContent', 'alignItems', 'gap', 'padding',
                'backgroundColor', 'borderRadius', 'className'
            ]
        }
    }
};