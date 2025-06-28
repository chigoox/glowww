'use client'

import { EditOutlined } from '@ant-design/icons';
import { Element, useNode } from "@craftjs/core";
import { Button, Divider, Input, Modal, Select, Slider, Switch } from "antd";
import { useEffect, useState } from "react";
import { FlexBox } from "../FlexBox";


// Mock Stripe Products Data
const mockStripeProducts = {
  products: [
    {
      id: 'prod_1',
      name: 'Vacay Vibes Crochet Button Up Shirt',
      price: 2400,
      originalPrice: 3999,
      images: [
        'https://via.placeholder.com/300x400/4F46E5/FFFFFF?text=Crochet+Shirt+1',
        'https://via.placeholder.com/300x400/3B82F6/FFFFFF?text=Crochet+Shirt+2',
        'https://via.placeholder.com/300x400/1E40AF/FFFFFF?text=Crochet+Shirt+3'
      ],
      category: 'clothing',
      collection: 'summer-collection',
      variants: [
        { id: 'var_1_s', size: 'S', price: 2400 },
        { id: 'var_1_m', size: 'M', price: 2400 },
        { id: 'var_1_l', size: 'L', price: 2400 },
        { id: 'var_1_xl', size: 'XL', price: 2400 },
        { id: 'var_1_xxl', size: 'XXL', price: 2400 },
        { id: 'var_1_xxxl', size: 'XXXL', price: 2400 }
      ]
    },
    {
      id: 'prod_2',
      name: 'Summer Beach Shorts',
      price: 1800,
      originalPrice: 2999,
      images: [
        'https://via.placeholder.com/300x400/10B981/FFFFFF?text=Beach+Shorts+1',
        'https://via.placeholder.com/300x400/059669/FFFFFF?text=Beach+Shorts+2'
      ],
      category: 'clothing',
      collection: 'summer-collection',
      variants: [
        { id: 'var_2_s', size: 'S', price: 1800 },
        { id: 'var_2_m', size: 'M', price: 1800 },
        { id: 'var_2_l', size: 'L', price: 1800 }
      ]
    },
    {
      id: 'prod_3',
      name: 'Vintage Sunglasses',
      price: 1200,
      images: [
        'https://via.placeholder.com/300x400/F59E0B/FFFFFF?text=Sunglasses+1',
        'https://via.placeholder.com/300x400/D97706/FFFFFF?text=Sunglasses+2',
        'https://via.placeholder.com/300x400/B45309/FFFFFF?text=Sunglasses+3'
      ],
      category: 'accessories',
      collection: 'vintage-collection',
      variants: [
        { id: 'var_3_one', size: 'One Size', price: 1200 }
      ]
    },
    {
      id: 'prod_4',
      name: 'Canvas Tote Bag',
      price: 899,
      images: [
        'https://via.placeholder.com/300x400/EF4444/FFFFFF?text=Tote+Bag'
      ],
      category: 'accessories',
      collection: 'eco-friendly',
      variants: [
        { id: 'var_4_reg', size: 'Regular', price: 899 }
      ]
    }
  ],
  categories: [
    { id: 'clothing', name: 'Clothing', count: 2 },
    { id: 'accessories', name: 'Accessories', count: 2 }
  ],
  collections: [
    { id: 'summer-collection', name: 'Summer Collection', count: 2 },
    { id: 'vintage-collection', name: 'Vintage Collection', count: 1 },
    { id: 'eco-friendly', name: 'Eco Friendly', count: 1 }
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
    <img
      ref={(ref) => ref && connect(drag(ref))}
      src={src}
      alt={alt}
      style={{
        width,
        height,
        objectFit,
        borderRadius,
        display: 'block',
        outline: selected ? '2px solid #1890ff' : 'none',
        outlineOffset: '2px',
        ...props.style
      }}
      {...props}
    />
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
    <span
      ref={(ref) => ref && connect(drag(ref))}
      style={{
        fontSize,
        fontWeight,
        color,
        textAlign,
        lineHeight,
        outline: selected ? '2px solid #1890ff' : 'none',
        outlineOffset: '2px',
        ...props.style
      }}
      {...props}
    >
      {text}
    </span>
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

// Custom Button component
export const ShopButton = ({ 
  backgroundColor = "#000",
  color = "white",
  borderRadius = "6px",
  padding = "12px 16px",
  fontSize = "14px",
  fontWeight = "500",
  width = "100%",
  border = "none",
  ...props 
}) => {
  const { connectors: { connect, drag }, selected } = useNode((state) => ({
    selected: state.events.selected,
  }));

  return (
    <button
      ref={(ref) => ref && connect(drag(ref))}
      style={{
        backgroundColor,
        color,
        borderRadius,
        padding,
        fontSize,
        fontWeight,
        width,
        border,
        cursor: 'pointer',
        outline: selected ? '2px solid #1890ff' : 'none',
        outlineOffset: '2px',
        ...props.style
      }}
      {...props}
    >
      🛒 Quick Add
    </button>
  );
};

ShopButton.craft = {
  props: {
    backgroundColor: "#000",
    color: "white",
    borderRadius: "6px",
    padding: "12px 16px",
    fontSize: "14px",
    fontWeight: "500",
    width: "100%",
    border: "none",
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
        'backgroundColor', 'color', 'borderRadius', 'padding', 
        'fontSize', 'fontWeight', 'width', 'border'
      ]
    }
  }
};

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
  
  className = "",
  children
}) => {
  const { connectors: { connect, drag }, actions: { setProp }, selected: isSelected } = useNode((node) => ({
    selected: node.events.selected,
  }));

  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState({});
  const [isVariantModalOpen, setIsVariantModalOpen] = useState(false);
  const [currentProduct, setCurrentProduct] = useState(null);


  

  // Auto-slide functionality
  useEffect(() => {
    if (!autoSlide) return;
    
    const interval = setInterval(() => {
      setCurrentImageIndex(prev => {
        const newIndex = { ...prev };
        getDisplayProducts().forEach(product => {
          if (product.images.length > 1) {
            newIndex[product.id] = ((newIndex[product.id] || 0) + 1) % product.images.length;
          }
        });
        return newIndex;
      });
    }, slideInterval);

    return () => clearInterval(interval);
  }, [autoSlide, slideInterval]);

  // Get products to display based on selections
  const getDisplayProducts = () => {
    let products = [];
    
    selectedProducts.forEach(productId => {
      const product = mockStripeProducts.products.find(p => p.id === productId);
      if (product && !products.find(p => p.id === product.id)) {
        products.push(product);
      }
    });
    
    selectedCategories.forEach(categoryId => {
      const categoryProducts = mockStripeProducts.products.filter(p => p.category === categoryId);
      categoryProducts.forEach(product => {
        if (!products.find(p => p.id === product.id)) {
          products.push(product);
        }
      });
    });
    
    selectedCollections.forEach(collectionId => {
      const collectionProducts = mockStripeProducts.products.filter(p => p.collection === collectionId);
      collectionProducts.forEach(product => {
        if (!products.find(p => p.id === product.id)) {
          products.push(product);
        }
      });
    });
    
    return products;
  };

  const formatPrice = (price) => {
    return `$${(price / 100).toFixed(2)}`;
  };

  const getProductLink = (product) => {
    const identifier = linkType === "id" ? product.id : product.name.toLowerCase().replace(/\s+/g, '-');
    return `${baseUrl}/${identifier}`;
  };

  const handleImageNav = (productId, direction) => {
    const product = mockStripeProducts.products.find(p => p.id === productId);
    if (!product || product.images.length <= 1) return;
    
    setCurrentImageIndex(prev => {
      const currentIndex = prev[productId] || 0;
      const newIndex = direction === 'prev' 
        ? (currentIndex - 1 + product.images.length) % product.images.length
        : (currentIndex + 1) % product.images.length;
      
      return { ...prev, [productId]: newIndex };
    });
  };

  const handleQuickAdd = (product) => {
    if (product.variants.length === 1) {
      console.log('Adding to cart:', product.variants[0]);
    } else {
      setCurrentProduct(product);
      setIsVariantModalOpen(true);
    }
  };

  const handleVariantSelect = (variant) => {
    console.log('Adding variant to cart:', variant);
    setIsVariantModalOpen(false);
    setCurrentProduct(null);
  };

  // Create product item using Elements
const createProductItem = (product) => {
  const currentImg = currentImageIndex[product.id] || 0;
  const hasDiscount = product.originalPrice && product.originalPrice > product.price;
  const discountPercent = hasDiscount ? Math.round(((product.originalPrice - product.price) / product.originalPrice) * 100) : 0;

  return (
    <Element
      key={product.id}
      id={`product-container-${product.id}`}
      is={FlexBox}
      flexDirection="column"
      width="280px"
      padding="16px"
      backgroundColor="white"
      borderRadius="8px"
      boxShadow="0 2px 8px rgba(0,0,0,0.1)"
      position="relative"
      canvas
    >
      {/* Product Image Container */}
      <Element
        id={`image-container-${product.id}`}
        is={FlexBox}
        width="100%"
        height="200px"
        position="relative"
        borderRadius="8px"
        overflow="hidden"
        marginBottom="12px"
        canvas
      >
        {/* Discount Badge */}
        {showDiscount && hasDiscount && (
          <div
            style={{
              position: 'absolute',
              top: 8,
              left: 8,
              background: '#ff4d4f',
              color: 'white',
              padding: '4px 8px',
              borderRadius: '4px',
              fontSize: '12px',
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
              width: 32,
              height: 32,
              borderRadius: '50%',
              background: 'rgba(255,255,255,0.9)',
              border: 'none',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 10,
              cursor: 'pointer'
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
        <Element
          id={`product-image-${product.id}`}
          is={ShopImage}
          src={product.images[currentImg]}
          alt={product.name}
          width="100%"
          height="100%"
          objectFit="cover"
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
      </Element>

      {/* Product Info */}
      <Element
        id={`product-info-${product.id}`}
        is={FlexBox}
        flexDirection="column"
        width="100%"
        gap="8px"
        canvas
      >
        {/* Product Name */}
        <Element
          id={`product-name-${product.id}`}
          is={ShopText}
          text={product.name}
          fontSize="16px"
          fontWeight="600"
          color="#333"
          lineHeight="1.4"
        />

        {/* Price Container */}
        <Element 
          id={`price-container-${product.id}`}
          is={FlexBox} 
          flexDirection="row"
          alignItems="center"
          gap="8px"
          canvas
        >
          <Element
            id={`current-price-${product.id}`}
            is={ShopText}
            text={formatPrice(product.price)}
            fontSize="18px"
            fontWeight="bold"
            color="#ff4d4f"
          />
          {hasDiscount && (
            <Element
              id={`original-price-${product.id}`}
              is={ShopText}
              text={formatPrice(product.originalPrice)}
              fontSize="14px"
              color="#999"
              textDecoration="line-through"
            />
          )}
        </Element>

        {/* Quick Add Button */}
        {showQuickAdd && (
          <Element
            id={`quick-add-${product.id}`}
            is={ShopButton}
            backgroundColor="#000"
            color="white"
            borderRadius="6px"
            padding="12px 16px"
            fontSize="14px"
            fontWeight="500"
            width="100%"
          />
        )}
      </Element>
    </Element>
  );
};

  const displayProducts = getDisplayProducts();

  return (
    <>
      <FlexBox
        ref={(ref) => ref && connect(drag(ref))}
        
      >
        {/* Edit Button */}
        {isSelected && (
          <div
            style={{
              position: "absolute",
              top: -12,
              left: -12,
              width: 24,
              height: 24,
              background: "#52c41a",
              borderRadius: "50%",
              cursor: "pointer",
              zIndex: 1000,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "white",
              fontSize: 12,
              border: "2px solid white",
              boxShadow: "0 2px 4px rgba(0,0,0,0.2)"
            }}
            onClick={() => setIsEditModalOpen(true)}
            onMouseDown={e => e.stopPropagation()}
            title="Configure shop items"
          >
            <EditOutlined />
          </div>
        )}

        {/* Products Display */}
        {displayProducts.length > 0 ? (
  displayProducts.map(product => createProductItem(product))
) : (
  <Element
    id="empty-state-container"
    is={FlexBox}
    flexDirection="column"
    alignItems="center"
    justifyContent="center"
    padding="40px"
    width="100%"
    canvas
  >
    <div style={{ fontSize: '48px', marginBottom: '16px' }}>🛍️</div>
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
        title="Configure Shop Items"
        open={isEditModalOpen}
        onCancel={() => setIsEditModalOpen(false)}
        width={800}
        footer={[
          <Button key="cancel" onClick={() => setIsEditModalOpen(false)}>
            Cancel
          </Button>,
          <Button key="save" type="primary" onClick={() => setIsEditModalOpen(false)}>
            Save Changes
          </Button>
        ]}
      >
        <div style={{ maxHeight: '60vh', overflowY: 'auto' }}>
          {/* Individual Products */}
          <div style={{ marginBottom: 24 }}>
            <h3>Individual Products</h3>
            <Select
              mode="multiple"
              style={{ width: '100%' }}
              placeholder="Select individual products"
              value={selectedProducts}
              onChange={(value) => setProp(props => props.selectedProducts = value)}
              options={mockStripeProducts.products.map(product => ({
                label: `${product.name} - ${formatPrice(product.price)}`,
                value: product.id
              }))}
            />
          </div>

          {/* Categories */}
          <div style={{ marginBottom: 24 }}>
            <h3>Categories</h3>
            <Select
              mode="multiple"
              style={{ width: '100%' }}
              placeholder="Select categories"
              value={selectedCategories}
              onChange={(value) => setProp(props => props.selectedCategories = value)}
              options={mockStripeProducts.categories.map(category => ({
                label: `${category.name} (${category.count} items)`,
                value: category.id
              }))}
            />
          </div>

          {/* Collections */}
          <div style={{ marginBottom: 24 }}>
            <h3>Collections</h3>
            <Select
              mode="multiple"
              style={{ width: '100%' }}
              placeholder="Select collections"
              value={selectedCollections}
              onChange={(value) => setProp(props => props.selectedCollections = value)}
              options={mockStripeProducts.collections.map(collection => ({
                label: `${collection.name} (${collection.count} items)`,
                value: collection.id
              }))}
            />
          </div>

          <Divider />

          {/* Link Configuration */}
          <div style={{ marginBottom: 24 }}>
            <h3>Link Configuration</h3>
            <div style={{ marginBottom: 16 }}>
              <label>Base URL:</label>
              <Input
                style={{ marginTop: 8 }}
                value={baseUrl}
                onChange={(e) => setProp(props => props.baseUrl = e.target.value)}
                placeholder="e.g., shop.com/shop"
              />
            </div>
            <div>
              <label>Link Type:</label>
              <Select
                style={{ width: '100%', marginTop: 8 }}
                value={linkType}
                onChange={(value) => setProp(props => props.linkType = value)}
                options={[
                  { label: 'Product Name (shop.com/shop/product-name)', value: 'name' },
                  { label: 'Product ID (shop.com/shop/prod_123)', value: 'id' }
                ]}
              />
            </div>
          </div>

          <Divider />

          {/* Display Options */}
          <div style={{ marginBottom: 24 }}>
            <h3>Display Options</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span>Show Discount Badges</span>
                <Switch
                  checked={showDiscount}
                  onChange={(checked) => setProp(props => props.showDiscount = checked)}
                />
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span>Show Quick Add Button</span>
                <Switch
                  checked={showQuickAdd}
                  onChange={(checked) => setProp(props => props.showQuickAdd = checked)}
                />
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span>Show Wishlist Button</span>
                <Switch
                  checked={showWishlist}
                  onChange={(checked) => setProp(props => props.showWishlist = checked)}
                />
              </div>
            </div>
          </div>

          <Divider />

          {/* Carousel Settings */}
          <div style={{ marginBottom: 24 }}>
            <h3>Carousel Settings</h3>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <span>Auto-slide Images</span>
              <Switch
                checked={autoSlide}
                onChange={(checked) => setProp(props => props.autoSlide = checked)}
              />
            </div>
            {autoSlide && (
              <div>
                <label>Slide Interval (ms):</label>
                <Slider
                  style={{ marginTop: 8 }}
                  min={1000}
                  max={10000}
                  step={500}
                  value={slideInterval}
                  onChange={(value) => setProp(props => props.slideInterval = value)}
                  marks={{ 1000: '1s', 3000: '3s', 5000: '5s', 10000: '10s' }}
                />
              </div>
            )}
          </div>
        </div>
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
    </>
  );
};

// Craft.js configuration
ShopFlexBox.craft = {
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
    width: "100%",
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
    className: ""
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