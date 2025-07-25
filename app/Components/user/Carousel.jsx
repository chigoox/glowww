'use client'

import React, { useRef, useEffect, useState, useCallback } from "react";
import { useNode, useEditor, Element } from "@craftjs/core";
import { createPortal } from 'react-dom';
import ContextMenu from "../support/ContextMenu";
import { useContextMenu } from "../support/useContextMenu";
import useEditorDisplay from "../support/useEditorDisplay";
import { useMultiSelect } from '../support/MultiSelectContext';
import { useCraftSnap } from '../support/useCraftSnap';
import SnapPositionHandle from '../support/SnapPositionHandle';
import { snapGridSystem } from '../support/SnapGridSystem';
import { 
  EditOutlined, 
  PlusOutlined, 
  DeleteOutlined, 
  LeftOutlined, 
  RightOutlined,
  PlayCircleOutlined,
  PictureOutlined,
  VideoCameraOutlined,
  UploadOutlined,
  EyeOutlined,
  FontSizeOutlined,
  BgColorsOutlined,
  AlignLeftOutlined,
  AlignCenterOutlined,
  AlignRightOutlined,
  VerticalAlignTopOutlined,
  VerticalAlignMiddleOutlined,
  VerticalAlignBottomOutlined
} from '@ant-design/icons';
import { 
  Modal, 
  Input, 
  Select, 
  Switch, 
  Button as AntButton, 
  Upload, 
  Tabs,
  Slider,
  Radio,
  ColorPicker,
  InputNumber,
  message,
  Tooltip,
  Divider
} from 'antd';
import { Paragraph } from "./Paragraph";
import MediaLibrary from '../support/MediaLibrary';

const { TabPane } = Tabs;

// Mock data for firebase media library
const MOCK_MEDIA_LIBRARY = {
  images: [
    { id: 1, url: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800', name: 'Mountain Lake' },
    { id: 2, url: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800', name: 'Ocean Sunset' },
    { id: 3, url: 'https://images.unsplash.com/photo-1469474968028-56623f02e42e?w=800', name: 'Forest Path' },
    { id: 4, url: 'https://images.unsplash.com/photo-1501436513145-30f24e19fcc4?w=800', name: 'Desert Dunes' },
    { id: 5, url: 'https://images.unsplash.com/photo-1476820865390-c52aeebb9891?w=800', name: 'City Lights' }
  ],
  videos: [
    { id: 1, url: 'https://www.youtube.com/watch?v=oASwMQDJPAw&ab_channel=MEDCARS', name: 'Sample Video 1', thumbnail: 'https://images.unsplash.com/photo-1574717024653-61fd2cf4d44d?w=400' },
    { id: 2, url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ', name: 'YouTube Video', thumbnail: 'https://images.unsplash.com/photo-1611162617474-5b21e879e113?w=400' }
  ]
};

// Caption position options
const CAPTION_POSITIONS = [
  { value: 'top-left', label: 'Top Left' },
  { value: 'top-center', label: 'Top Center' },
  { value: 'top-right', label: 'Top Right' },
  { value: 'center-left', label: 'Center Left' },
  { value: 'center-center', label: 'Center Center' },
  { value: 'center-right', label: 'Center Right' },
  { value: 'bottom-left', label: 'Bottom Left' },
  { value: 'bottom-center', label: 'Bottom Center' },
  { value: 'bottom-right', label: 'Bottom Right' }
];

// Get position styles for caption
const getCaptionPositionStyles = (position) => {
  const positions = {
    'top-left': { top: '20px', left: '20px', right: 'auto', bottom: 'auto' },
    'top-center': { top: '20px', left: '50%', transform: 'translateX(-50%)', right: 'auto', bottom: 'auto' },
    'top-right': { top: '20px', right: '20px', left: 'auto', bottom: 'auto' },
    'center-left': { top: '50%', left: '20px', transform: 'translateY(-50%)', right: 'auto', bottom: 'auto' },
    'center-center': { top: '50%', left: '50%', transform: 'translate(-50%, -50%)', right: 'auto', bottom: 'auto' },
    'center-right': { top: '50%', right: '20px', transform: 'translateY(-50%)', left: 'auto', bottom: 'auto' },
    'bottom-left': { bottom: '20px', left: '20px', top: 'auto', right: 'auto' },
    'bottom-center': { bottom: '20px', left: '50%', transform: 'translateX(-50%)', top: 'auto', right: 'auto' },
    'bottom-right': { bottom: '20px', right: '20px', top: 'auto', left: 'auto' }
  };
  return positions[position] || positions['bottom-center'];
};

// Slide component
const CarouselSlide = ({ slide, isActive, imageStyles, videoStyles, captionStyles, onSlideUpdate }) => {
  const renderMedia = () => {
    if (slide.type === 'image') {
      return (
        <img
          src={slide.url}
          alt={slide.alt || 'Carousel slide'}
          style={{
            width: '100%',
            height: '100%',
            objectFit: imageStyles.objectFit,
            objectPosition: imageStyles.objectPosition,
            borderRadius: imageStyles.borderRadius,
            filter: imageStyles.filter,
            opacity: imageStyles.opacity,
            transition: 'all 0.3s ease'
          }}
        />
      );
    } else if (slide.type === 'video') {
      if (slide.url.includes('youtube.com') || slide.url.includes('youtu.be')) {
        const videoId = slide.url.includes('youtu.be') 
          ? slide.url.split('/').pop()
          : slide.url.split('v=')[1]?.split('&')[0];
        
        return (
          <iframe
            src={`https://www.youtube.com/embed/${videoId}?autoplay=${videoStyles.autoplay ? 1 : 0}&controls=${videoStyles.controls ? 1 : 0}&loop=${videoStyles.loop ? 1 : 0}&mute=${videoStyles.muted ? 1 : 0}`}
            style={{
              width: '100%',
              height: '100%',
              border: 'none',
              borderRadius: videoStyles.borderRadius,
              opacity: videoStyles.opacity
            }}
            allow="autoplay; fullscreen; picture-in-picture"
            allowFullScreen
          />
        );
      } else {
        return (
          <video
            src={slide.url}
            autoPlay={videoStyles.autoplay}
            controls={videoStyles.controls}
            loop={videoStyles.loop}
            muted={videoStyles.muted}
            style={{
              width: '100%',
              height: '100%',
              objectFit: videoStyles.objectFit,
              objectPosition: videoStyles.objectPosition,
              borderRadius: videoStyles.borderRadius,
              opacity: videoStyles.opacity
            }}
          />
        );
      }
    }
    return null;
  };

  return (
    <div
      style={{
        position: 'relative',
        width: '100%',
        height: '100%',
        display: isActive ? 'block' : 'none'
      }}
    >
      {renderMedia()}
      
      {/* Caption */}
      {slide.caption && (
        <div
          style={{
            position: 'absolute',
            ...getCaptionPositionStyles(slide.captionPosition || 'bottom-center'),
            maxWidth: '80%',
            zIndex: 2
          }}
        >
          <div
            style={{
              background: captionStyles.backgroundColor,
              color: captionStyles.color,
              fontSize: captionStyles.fontSize,
              fontFamily: captionStyles.fontFamily,
              fontWeight: captionStyles.fontWeight,
              padding: captionStyles.padding,
              borderRadius: captionStyles.borderRadius,
              backdropFilter: captionStyles.backdropFilter,
              border: captionStyles.border,
              boxShadow: captionStyles.boxShadow,
              textAlign: captionStyles.textAlign,
              lineHeight: captionStyles.lineHeight
            }}
            dangerouslySetInnerHTML={{ __html: slide.caption }}
          />
        </div>
      )}
    </div>
  );
};


// Settings Modal
const CarouselSettingsModal = ({ visible, onClose, carousel, onUpdate }) => {
  const [activeTab, setActiveTab] = useState('slides');
  const [mediaLibraryVisible, setMediaLibraryVisible] = useState(false);
  const [editingSlideIndex, setEditingSlideIndex] = useState(null);

  // Add one or more slides from MediaLibrary
  const handleMediaSelect = (item, itemType) => {
    // Support both single and array selection (future-proof)
    const items = Array.isArray(item) ? item : [item];
    const newSlides = [
      ...carousel.slides,
      ...items.map((media) => ({
        ...media,
        type: itemType,
        name: media.name || (itemType === 'image' ? 'Image' : 'Video'),
        caption: '',
        captionPosition: 'bottom-center',
      }))
    ];
    onUpdate({ ...carousel, slides: newSlides });
    setMediaLibraryVisible(false);
  };

  const updateSlide = (index, updates) => {
    const newSlides = carousel.slides.map((slide, i) => 
      i === index ? { ...slide, ...updates } : slide
    );
    onUpdate({ ...carousel, slides: newSlides });
  };

  const removeSlide = (index) => {
    const newSlides = carousel.slides.filter((_, i) => i !== index);
    onUpdate({ ...carousel, slides: newSlides });
  };

  const updateCarouselSetting = (key, value) => {
    onUpdate({ ...carousel, [key]: value });
  };

  return (
    <>
      <Modal
        title="Carousel Settings"
        open={visible}
        onCancel={onClose}
        footer={[
          <AntButton key="close" onClick={onClose}>Close</AntButton>
        ]}
        width={1000}
        style={{ top: 20 }}
      >
        <Tabs activeKey={activeTab} onChange={setActiveTab}>
          {/* Slides Management */}
          <TabPane tab="Slides" key="slides">
            <div style={{ marginBottom: 16 }}>
              <AntButton
                type="primary"
                icon={<PlusOutlined />}
                onClick={() => setMediaLibraryVisible(true)}
              >
                Add Slide
              </AntButton>
            </div>
            
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
              {carousel.slides.map((slide, index) => (
                <div
                  key={index}
                  style={{
                    border: '1px solid #e8e8e8',
                    borderRadius: 8,
                    overflow: 'hidden',
                    position: 'relative'
                  }}
                >
                  <div style={{ height: 120, position: 'relative' }}>
                    {slide.type === 'image' ? (
                      <img
                        src={slide.url}
                        alt={slide.name}
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      />
                    ) : (
                      <div style={{
                        width: '100%',
                        height: '100%',
                        background: '#000',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: 'white'
                      }}>
                        <PlayCircleOutlined style={{ fontSize: 30 }} />
                      </div>
                    )}
                    
                    <div style={{
                      position: 'absolute',
                      top: 4,
                      right: 4,
                      display: 'flex',
                      gap: 4
                    }}>
                      <AntButton
                        size="small"
                        icon={<EditOutlined />}
                        onClick={() => setEditingSlideIndex(index)}
                      />
                      <AntButton
                        size="small"
                        danger
                        icon={<DeleteOutlined />}
                        onClick={() => removeSlide(index)}
                      />
                    </div>
                  </div>
                  
                  <div style={{ padding: 8 }}>
                    <div style={{ fontSize: 12, fontWeight: 500 }}>{slide.name}</div>
                    <Input
                      size="small"
                      placeholder="Caption..."
                      value={slide.caption}
                      onChange={(e) => updateSlide(index, { caption: e.target.value })}
                      style={{ marginTop: 4 }}
                    />
                    <Select
                      size="small"
                      value={slide.captionPosition}
                      onChange={(value) => updateSlide(index, { captionPosition: value })}
                      options={CAPTION_POSITIONS}
                      style={{ width: '100%', marginTop: 4 }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </TabPane>

          {/* Carousel Settings */}
          <TabPane tab="Carousel" key="carousel">
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
              <div>
                <h4>Autoplay Settings</h4>
                <div style={{ marginBottom: 16 }}>
                  <Switch
                    checked={carousel.autoplay}
                    onChange={(checked) => updateCarouselSetting('autoplay', checked)}
                  />
                  <span style={{ marginLeft: 8 }}>Autoplay</span>
                </div>
                
                {carousel.autoplay && (
                  <div style={{ marginBottom: 16 }}>
                    <label>Autoplay Interval (ms)</label>
                    <Slider
                      min={1000}
                      max={10000}
                      step={500}
                      value={carousel.autoplayInterval}
                      onChange={(value) => updateCarouselSetting('autoplayInterval', value)}
                      tooltip={{ formatter: (val) => `${val}ms` }}
                    />
                  </div>
                )}

                <h4>Navigation</h4>
                <div style={{ marginBottom: 16 }}>
                  <Switch
                    checked={carousel.showArrows}
                    onChange={(checked) => updateCarouselSetting('showArrows', checked)}
                  />
                  <span style={{ marginLeft: 8 }}>Show Navigation Arrows</span>
                </div>
                
                <div style={{ marginBottom: 16 }}>
                  <Switch
                    checked={carousel.showDots}
                    onChange={(checked) => updateCarouselSetting('showDots', checked)}
                  />
                  <span style={{ marginLeft: 8 }}>Show Dots Indicator</span>
                </div>

                <div style={{ marginBottom: 16 }}>
                  <Switch
                    checked={carousel.infinite}
                    onChange={(checked) => updateCarouselSetting('infinite', checked)}
                  />
                  <span style={{ marginLeft: 8 }}>Infinite Loop</span>
                </div>
              </div>

              <div>
                <h4>Transitions</h4>
                <div style={{ marginBottom: 16 }}>
                  <label>Transition Effect</label>
                  <Select
                    value={carousel.transition}
                    onChange={(value) => updateCarouselSetting('transition', value)}
                    style={{ width: '100%' }}
                    options={[
                      { value: 'slide', label: 'Slide' },
                      { value: 'fade', label: 'Fade' },
                      { value: 'zoom', label: 'Zoom' },
                      { value: 'flip', label: 'Flip' }
                    ]}
                  />
                </div>

                <div style={{ marginBottom: 16 }}>
                  <label>Transition Duration (ms)</label>
                  <Slider
                    min={200}
                    max={2000}
                    step={100}
                    value={carousel.transitionDuration}
                    onChange={(value) => updateCarouselSetting('transitionDuration', value)}
                    tooltip={{ formatter: (val) => `${val}ms` }}
                  />
                </div>

                <h4>Touch/Swipe</h4>
                <div style={{ marginBottom: 16 }}>
                  <Switch
                    checked={carousel.swipeToSlide}
                    onChange={(checked) => updateCarouselSetting('swipeToSlide', checked)}
                  />
                  <span style={{ marginLeft: 8 }}>Enable Swipe</span>
                </div>
              </div>
            </div>
          </TabPane>

          {/* Image Styles */}
          <TabPane tab="Image Styles" key="imageStyles">
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
              <div>
                <h4>Display Properties</h4>
                <div style={{ marginBottom: 16 }}>
                  <label>Object Fit</label>
                  <Select
                    value={carousel.imageStyles.objectFit}
                    onChange={(value) => updateCarouselSetting('imageStyles', {
                      ...carousel.imageStyles,
                      objectFit: value
                    })}
                    style={{ width: '100%' }}
                    options={[
                      { value: 'cover', label: 'Cover' },
                      { value: 'contain', label: 'Contain' },
                      { value: 'fill', label: 'Fill' },
                      { value: 'scale-down', label: 'Scale Down' },
                      { value: 'none', label: 'None' }
                    ]}
                  />
                </div>

                <div style={{ marginBottom: 16 }}>
                  <label>Object Position</label>
                  <Select
                    value={carousel.imageStyles.objectPosition}
                    onChange={(value) => updateCarouselSetting('imageStyles', {
                      ...carousel.imageStyles,
                      objectPosition: value
                    })}
                    style={{ width: '100%' }}
                    options={[
                      { value: 'center', label: 'Center' },
                      { value: 'top', label: 'Top' },
                      { value: 'bottom', label: 'Bottom' },
                      { value: 'left', label: 'Left' },
                      { value: 'right', label: 'Right' },
                      { value: 'top left', label: 'Top Left' },
                      { value: 'top right', label: 'Top Right' },
                      { value: 'bottom left', label: 'Bottom Left' },
                      { value: 'bottom right', label: 'Bottom Right' }
                    ]}
                  />
                </div>
              </div>

              <div>
                <h4>Visual Effects</h4>
                <div style={{ marginBottom: 16 }}>
                  <label>Border Radius</label>
                  <Slider
                    min={0}
                    max={50}
                    value={carousel.imageStyles.borderRadius}
                    onChange={(value) => updateCarouselSetting('imageStyles', {
                      ...carousel.imageStyles,
                      borderRadius: value
                    })}
                    tooltip={{ formatter: (val) => `${val}px` }}
                  />
                </div>

                <div style={{ marginBottom: 16 }}>
                  <label>Opacity</label>
                  <Slider
                    min={0}
                    max={1}
                    step={0.1}
                    value={carousel.imageStyles.opacity}
                    onChange={(value) => updateCarouselSetting('imageStyles', {
                      ...carousel.imageStyles,
                      opacity: value
                    })}
                    tooltip={{ formatter: (val) => `${(val * 100).toFixed(0)}%` }}
                  />
                </div>

                <div style={{ marginBottom: 16 }}>
                  <label>Filter</label>
                  <Input
                    value={carousel.imageStyles.filter}
                    onChange={(e) => updateCarouselSetting('imageStyles', {
                      ...carousel.imageStyles,
                      filter: e.target.value
                    })}
                    placeholder="e.g. blur(5px), brightness(1.2)"
                  />
                </div>
              </div>
            </div>
          </TabPane>

          {/* Video Styles */}
          <TabPane tab="Video Styles" key="videoStyles">
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
              <div>
                <h4>Video Settings</h4>
                <div style={{ marginBottom: 16 }}>
                  <Switch
                    checked={carousel.videoStyles.autoplay}
                    onChange={(checked) => updateCarouselSetting('videoStyles', {
                      ...carousel.videoStyles,
                      autoplay: checked
                    })}
                  />
                  <span style={{ marginLeft: 8 }}>Autoplay</span>
                </div>

                <div style={{ marginBottom: 16 }}>
                  <Switch
                    checked={carousel.videoStyles.controls}
                    onChange={(checked) => updateCarouselSetting('videoStyles', {
                      ...carousel.videoStyles,
                      controls: checked
                    })}
                  />
                  <span style={{ marginLeft: 8 }}>Show Controls</span>
                </div>

                <div style={{ marginBottom: 16 }}>
                  <Switch
                    checked={carousel.videoStyles.loop}
                    onChange={(checked) => updateCarouselSetting('videoStyles', {
                      ...carousel.videoStyles,
                      loop: checked
                    })}
                  />
                  <span style={{ marginLeft: 8 }}>Loop</span>
                </div>

                <div style={{ marginBottom: 16 }}>
                  <Switch
                    checked={carousel.videoStyles.muted}
                    onChange={(checked) => updateCarouselSetting('videoStyles', {
                      ...carousel.videoStyles,
                      muted: checked
                    })}
                  />
                  <span style={{ marginLeft: 8 }}>Muted</span>
                </div>
              </div>

              <div>
                <h4>Visual Properties</h4>
                <div style={{ marginBottom: 16 }}>
                  <label>Object Fit</label>
                  <Select
                    value={carousel.videoStyles.objectFit}
                    onChange={(value) => updateCarouselSetting('videoStyles', {
                      ...carousel.videoStyles,
                      objectFit: value
                    })}
                    style={{ width: '100%' }}
                    options={[
                      { value: 'cover', label: 'Cover' },
                      { value: 'contain', label: 'Contain' },
                      { value: 'fill', label: 'Fill' },
                      { value: 'scale-down', label: 'Scale Down' },
                      { value: 'none', label: 'None' }
                    ]}
                  />
                </div>

                <div style={{ marginBottom: 16 }}>
                  <label>Border Radius</label>
                  <Slider
                    min={0}
                    max={50}
                    value={carousel.videoStyles.borderRadius}
                    onChange={(value) => updateCarouselSetting('videoStyles', {
                      ...carousel.videoStyles,
                      borderRadius: value
                    })}
                    tooltip={{ formatter: (val) => `${val}px` }}
                  />
                </div>

                <div style={{ marginBottom: 16 }}>
                  <label>Opacity</label>
                  <Slider
                    min={0}
                    max={1}
                    step={0.1}
                    value={carousel.videoStyles.opacity}
                    onChange={(value) => updateCarouselSetting('videoStyles', {
                      ...carousel.videoStyles,
                      opacity: value
                    })}
                    tooltip={{ formatter: (val) => `${(val * 100).toFixed(0)}%` }}
                  />
                </div>
              </div>
            </div>
          </TabPane>

          {/* Caption Styles */}
          <TabPane tab="Caption Styles" key="captionStyles">
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
              <div>
                <h4>Typography</h4>
                <div style={{ marginBottom: 16 }}>
                  <label>Font Family</label>
                  <Select
                    value={carousel.captionStyles.fontFamily}
                    onChange={(value) => updateCarouselSetting('captionStyles', {
                      ...carousel.captionStyles,
                      fontFamily: value
                    })}
                    style={{ width: '100%' }}
                    options={[
                      { value: 'Arial, sans-serif', label: 'Arial' },
                      { value: 'Helvetica, sans-serif', label: 'Helvetica' },
                      { value: 'Times New Roman, serif', label: 'Times New Roman' },
                      { value: 'Georgia, serif', label: 'Georgia' },
                      { value: 'Verdana, sans-serif', label: 'Verdana' },
                      { value: 'Courier New, monospace', label: 'Courier New' }
                    ]}
                  />
                </div>

                <div style={{ marginBottom: 16 }}>
                  <label>Font Size</label>
                  <Slider
                    min={10}
                    max={48}
                    value={carousel.captionStyles.fontSize}
                    onChange={(value) => updateCarouselSetting('captionStyles', {
                      ...carousel.captionStyles,
                      fontSize: value
                    })}
                    tooltip={{ formatter: (val) => `${val}px` }}
                  />
                </div>

                <div style={{ marginBottom: 16 }}>
                  <label>Font Weight</label>
                  <Select
                    value={carousel.captionStyles.fontWeight}
                    onChange={(value) => updateCarouselSetting('captionStyles', {
                      ...carousel.captionStyles,
                      fontWeight: value
                    })}
                    style={{ width: '100%' }}
                    options={[
                      { value: 'normal', label: 'Normal' },
                      { value: 'bold', label: 'Bold' },
                      { value: '300', label: 'Light' },
                      { value: '500', label: 'Medium' },
                      { value: '600', label: 'Semi Bold' },
                      { value: '700', label: 'Bold' },
                      { value: '800', label: 'Extra Bold' }
                    ]}
                  />
                </div>

                <div style={{ marginBottom: 16 }}>
                  <label>Text Align</label>
                  <Radio.Group
                    value={carousel.captionStyles.textAlign}
                    onChange={(e) => updateCarouselSetting('captionStyles', {
                      ...carousel.captionStyles,
                      textAlign: e.target.value
                    })}
                  >
                    <Radio.Button value="left"><AlignLeftOutlined /></Radio.Button>
                    <Radio.Button value="center"><AlignCenterOutlined /></Radio.Button>
                    <Radio.Button value="right"><AlignRightOutlined /></Radio.Button>
                  </Radio.Group>
                </div>
              </div>

              <div>
                <h4>Background & Effects</h4>
                <div style={{ marginBottom: 16 }}>
                  <label>Text Color</label>
                  <ColorPicker
                    value={carousel.captionStyles.color}
                    onChange={(color) => updateCarouselSetting('captionStyles', {
                      ...carousel.captionStyles,
                      color: color.toHexString()
                    })}
                    showText
                  />
                </div>

                <div style={{ marginBottom: 16 }}>
                  <label>Background Color</label>
                  <ColorPicker
                    value={carousel.captionStyles.backgroundColor}
                    onChange={(color) => updateCarouselSetting('captionStyles', {
                      ...carousel.captionStyles,
                      backgroundColor: color.toRgbString()
                    })}
                    showText
                  />
                </div>

                <div style={{ marginBottom: 16 }}>
                  <label>Padding</label>
                  <Input
                    value={carousel.captionStyles.padding}
                    onChange={(e) => updateCarouselSetting('captionStyles', {
                      ...carousel.captionStyles,
                      padding: e.target.value
                    })}
                    placeholder="e.g. 12px 16px"
                  />
                </div>

                <div style={{ marginBottom: 16 }}>
                  <label>Border Radius</label>
                  <Slider
                    min={0}
                    max={25}
                    value={carousel.captionStyles.borderRadius}
                    onChange={(value) => updateCarouselSetting('captionStyles', {
                      ...carousel.captionStyles,
                      borderRadius: value
                    })}
                    tooltip={{ formatter: (val) => `${val}px` }}
                  />
                </div>

                <div style={{ marginBottom: 16 }}>
                  <label>Box Shadow</label>
                  <Input
                    value={carousel.captionStyles.boxShadow}
                    onChange={(e) => updateCarouselSetting('captionStyles', {
                      ...carousel.captionStyles,
                      boxShadow: e.target.value
                    })}
                    placeholder="e.g. 0 2px 8px rgba(0,0,0,0.3)"
                  />
                </div>
              </div>
            </div>
          </TabPane>
        </Tabs>
      </Modal>

      <MediaLibrary
        visible={mediaLibraryVisible}
        onClose={() => setMediaLibraryVisible(false)}
        onSelect={handleMediaSelect}
        type="both"
        title="Select Images or Videos for Carousel"
      />
    </>
  );
};

// Main Carousel Component
export const Carousel = ({
  // Layout & Position
  width = "100%",
  height = 400,
  minWidth = 200,
  maxWidth,
  minHeight = 200,
  maxHeight,
  position = "relative",
  top,
  left,
  right,
  bottom,
  zIndex = 1,
  
  // Spacing
  margin = "10px 0",
  padding = 0,
  
  // Border & Background
  borderRadius = 8,
  backgroundColor = "#000000",
  border = "none",
  boxShadow = "0 4px 12px rgba(0,0,0,0.1)",
  
  // Carousel Data
  slides = [],
  currentSlide = 0,
  
  // Carousel Settings
  autoplay = false,
  autoplayInterval = 3000,
  showArrows = true,
  showDots = true,
  infinite = true,
  transition = 'slide',
  transitionDuration = 500,
  swipeToSlide = true,
  
  // Style Objects
  imageStyles = {
    objectFit: 'cover',
    objectPosition: 'center',
    borderRadius: 0,
    opacity: 1,
    filter: ''
  },
  videoStyles = {
    autoplay: false,
    controls: true,
    loop: false,
    muted: true,
    objectFit: 'cover',
    objectPosition: 'center',
    borderRadius: 0,
    opacity: 1
  },
  captionStyles = {
    fontFamily: 'Arial, sans-serif',
    fontSize: 16,
    fontWeight: 'normal',
    color: '#ffffff',
    backgroundColor: 'rgba(0,0,0,0.7)',
    padding: '12px 16px',
    borderRadius: 4,
    textAlign: 'center',
    lineHeight: 1.4,
    boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
    backdropFilter: 'blur(5px)',
    border: 'none'
  },
  
  // HTML Attributes
  className = "",
  id = "",
  title = "",
  
  children
}) => {
  const { 
    id: nodeId, 
    connectors: { connect, drag }, 
    actions: { setProp }, 
    selected,
    parent
  } = useNode((node) => ({
    id: node.id,
    selected: node.events.selected,
    parent: node.data.parent,
  }));
  
  // Track parent changes to reset position properties
  const prevParentRef = useRef(parent);

  useEffect(() => {
    if (prevParentRef.current !== parent) {
      console.log('Carousel: Parent changed, resetting position properties');
      setProp(props => {
        props.top = undefined;
        props.left = undefined;
        props.right = undefined;
        props.bottom = undefined;
        props.position = "relative";
      });
      prevParentRef.current = parent;
    }
  }, [parent, setProp]);
  
  const carouselRef = useRef(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [internalCurrentSlide, setInternalCurrentSlide] = useState(currentSlide);
  const [isClient, setIsClient] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [boxPosition, setBoxPosition] = useState({ top: 0, left: 0, width: 0, height: 0 });

  // Context menu functionality
  const { contextMenu, handleContextMenu, closeContextMenu } = useContextMenu();
  const { hideEditorUI } = useEditorDisplay();

  // Multi-selection hook
  const { isSelected: isMultiSelected, toggleSelection } = useMultiSelect();

  // Snap functionality
  const { connectors: { connect: snapConnect, drag: snapDrag } } = useCraftSnap(nodeId);

  // Use shared editor functionality
  const { actions: editorActions, query } = useEditor();

  // Function to update box position for portal positioning
  const updateBoxPosition = () => {
    if (carouselRef.current) {
      const rect = carouselRef.current.getBoundingClientRect();
      setBoxPosition({
        top: rect.top + window.scrollY,
        left: rect.left + window.scrollX,
        width: rect.width,
        height: rect.height
      });
    }
  };

  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    const connectElements = () => {
      if (carouselRef.current) {
        // Chain all connections properly
        connect(drag(snapConnect(snapDrag(carouselRef.current))));
      }
    };

    connectElements();
    const timer = setTimeout(connectElements, 50);
    return () => clearTimeout(timer);
  }, [connect, drag, snapConnect, snapDrag]);

  // Update box position when selected or hovered changes
  useEffect(() => {
    if (selected || isHovered) {
      updateBoxPosition();
      
      const handleScroll = () => updateBoxPosition();
      const handleResize = () => updateBoxPosition();
      
      window.addEventListener('scroll', handleScroll);
      window.addEventListener('resize', handleResize);
      
      return () => {
        window.removeEventListener('scroll', handleScroll);
        window.removeEventListener('resize', handleResize);
      };
    }
  }, [selected, isHovered]);

  // Handle resize start
  const handleResizeStart = (e, direction) => {
    e.stopPropagation();
    e.preventDefault();
    
    const startX = e.clientX;
    const startY = e.clientY;
    const rect = carouselRef.current.getBoundingClientRect();
    const startWidth = rect.width;
    const startHeight = rect.height;
    
    setIsResizing(true);

    // Register all elements for snapping during resize
    const nodes = query.getNodes();
    Object.entries(nodes).forEach(([id, node]) => {
      if (id !== nodeId && node.dom) {
        const elementRect = node.dom.getBoundingClientRect();
        const editorRoot = document.querySelector('[data-editor="true"]');
        if (editorRoot) {
          const editorRect = editorRoot.getBoundingClientRect();
          const computedStyle = window.getComputedStyle(node.dom);
          
          // Get border widths for reference
          const borderLeft = parseFloat(computedStyle.borderLeftWidth) || 0;
          const borderRight = parseFloat(computedStyle.borderRightWidth) || 0;
          const borderTop = parseFloat(computedStyle.borderTopWidth) || 0;
          const borderBottom = parseFloat(computedStyle.borderBottomWidth) || 0;
          
          // For visual alignment, we want to align to the full visual bounds (border box)
          // This includes padding and borders as users expect visual alignment to the actual edge
          const registrationBounds = {
            x: elementRect.left - editorRect.left,
            y: elementRect.top - editorRect.top,
            width: elementRect.width,
            height: elementRect.height,
          };
          
          console.log('📝 Registering element with border box bounds:', {
            id,
            elementRect: {
              left: elementRect.left - editorRect.left,
              top: elementRect.top - editorRect.top,
              width: elementRect.width,
              height: elementRect.height,
              right: (elementRect.left - editorRect.left) + elementRect.width,
              bottom: (elementRect.top - editorRect.top) + elementRect.height
            },
            borders: { borderLeft, borderRight, borderTop, borderBottom }
          });
          
          snapGridSystem.registerElement(id, node.dom, registrationBounds);
        }
      }
    });
    
    const handleMouseMove = (moveEvent) => {
      const deltaX = moveEvent.clientX - startX;
      const deltaY = moveEvent.clientY - startY;
      
      let newWidth = startWidth;
      let newHeight = startHeight;
      
      // Calculate new dimensions based on resize direction
      switch (direction) {
        case 'se': // bottom-right
          newWidth = startWidth + deltaX;
          newHeight = startHeight + deltaY;
          break;
        case 'sw': // bottom-left
          newWidth = startWidth - deltaX;
          newHeight = startHeight + deltaY;
          break;
        case 'ne': // top-right
          newWidth = startWidth + deltaX;
          newHeight = startHeight - deltaY;
          break;
        case 'nw': // top-left
          newWidth = startWidth - deltaX;
          newHeight = startHeight - deltaY;
          break;
        case 'e': // right edge
          newWidth = startWidth + deltaX;
          break;
        case 'w': // left edge
          newWidth = startWidth - deltaX;
          break;
        case 's': // bottom edge
          newHeight = startHeight + deltaY;
          break;
        case 'n': // top edge
          newHeight = startHeight - deltaY;
          break;
      }
      
      // Apply minimum constraints
      newWidth = Math.max(newWidth, minWidth || 200);
      newHeight = Math.max(newHeight, minHeight || 200);

      // Apply maximum constraints
      if (maxWidth) newWidth = Math.min(newWidth, maxWidth);
      if (maxHeight) newHeight = Math.min(newHeight, maxHeight);

      // Get current position for snap calculations
      const currentRect = carouselRef.current.getBoundingClientRect();
      const editorRoot = document.querySelector('[data-editor="true"]');
      if (editorRoot) {
        const editorRect = editorRoot.getBoundingClientRect();
        
        // Calculate the intended bounds based on resize direction
        let intendedBounds = {
          left: currentRect.left - editorRect.left,
          top: currentRect.top - editorRect.top,
          width: newWidth,
          height: newHeight
        };

        // Adjust position for edges that move the element's origin
        if (direction.includes('w')) {
          // Left edge resize - element position changes
          const widthDelta = newWidth - currentRect.width;
          intendedBounds.left = (currentRect.left - editorRect.left) - widthDelta;
        }
        
        if (direction.includes('n')) {
          // Top edge resize - element position changes
          const heightDelta = newHeight - currentRect.height;
          intendedBounds.top = (currentRect.top - editorRect.top) - heightDelta;
        }

        // Calculate all edge positions with the new dimensions
        intendedBounds.right = intendedBounds.left + intendedBounds.width;
        intendedBounds.bottom = intendedBounds.top + intendedBounds.height;
        intendedBounds.centerX = intendedBounds.left + intendedBounds.width / 2;
        intendedBounds.centerY = intendedBounds.top + intendedBounds.height / 2;

        console.log('🔧 Resize bounds:', { 
          direction, 
          currentBounds: {
            left: currentRect.left - editorRect.left,
            top: currentRect.top - editorRect.top,
            width: currentRect.width,
            height: currentRect.height
          },
          intendedBounds,
          newDimensions: { newWidth, newHeight }
        });

        // Use resize-specific snap method
        const snapResult = snapGridSystem.getResizeSnapPosition(
          nodeId,
          direction,
          intendedBounds,
          newWidth,
          newHeight
        );

        if (snapResult.snapped) {
          newWidth = snapResult.bounds.width;
          newHeight = snapResult.bounds.height;
          
          console.log('🔧 Applied snap result:', { 
            snappedWidth: newWidth, 
            snappedHeight: newHeight,
            originalDimensions: { width: newWidth, height: newHeight }
          });
        }
      }
      
      // Update dimensions using Craft.js throttled setProp for smooth history
      editorActions.history.throttle(500).setProp(nodeId, (props) => {
        props.width = Math.round(newWidth);
        props.height = Math.round(newHeight);
      });
    };
    
    const handleMouseUp = () => {
      setIsResizing(false);
      
      // Clear snap indicators and cleanup tracked elements
      snapGridSystem.clearSnapIndicators();
      setTimeout(() => {
        snapGridSystem.cleanupTrackedElements();
      }, 100);
      
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
    
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  // Handle custom drag for position changes - REPLACED by SnapPositionHandle
  // const handleDragStart = (e) => {
  //   e.stopPropagation();
  //   e.preventDefault();
  //   
  //   const startX = e.clientX;
  //   const startY = e.clientY;
  //   const currentTop = parseInt(top) || 0;
  //   const currentLeft = parseInt(left) || 0;
  //   
  //   setIsDragging(true);
  //   
  //   const handleMouseMove = (moveEvent) => {
  //     const deltaX = moveEvent.clientX - startX;
  //     const deltaY = moveEvent.clientY - startY;
  //     
  //     setProp(props => {
  //       props.left = currentLeft + deltaX;
  //       props.top = currentTop + deltaY;
  //     });
  //   };
  //   
  //   const handleMouseUp = () => {
  //     setIsDragging(false);
  //     document.removeEventListener('mousemove', handleMouseMove);
  //     document.removeEventListener('mouseup', handleMouseUp);
  //   };
  //   
  //   document.addEventListener('mousemove', handleMouseMove);
  //   document.addEventListener('mouseup', handleMouseUp);
  // };

  // Auto-play functionality
  useEffect(() => {
    if (!autoplay || slides.length <= 1) return;

    const interval = setInterval(() => {
      setInternalCurrentSlide(prev => {
        const next = infinite ? (prev + 1) % slides.length : Math.min(prev + 1, slides.length - 1);
        setProp(props => props.currentSlide = next);
        return next;
      });
    }, autoplayInterval);

    return () => clearInterval(interval);
  }, [autoplay, autoplayInterval, slides.length, infinite, setProp]);

  // Helper function to process values
  const processValue = (value, property) => {
    if (value === undefined || value === null || value === "") return undefined;
    if (typeof value === 'number' && !['opacity', 'zIndex'].includes(property)) {
      return `${value}px`;
    }
    return value;
  };

  // Build computed styles
  const computedStyles = {
    width: processValue(width, 'width'),
    height: processValue(height, 'height'),
    minWidth: processValue(minWidth, 'minWidth'),
    maxWidth: processValue(maxWidth, 'maxWidth'),
    minHeight: processValue(minHeight, 'minHeight'),
    maxHeight: processValue(maxHeight, 'maxHeight'),
    position,
    top: processValue(top, 'top'),
    left: processValue(left, 'left'),
    right: processValue(right, 'right'),
    bottom: processValue(bottom, 'bottom'),
    zIndex,
    margin: processValue(margin, 'margin'),
    padding: processValue(padding, 'padding'),
    borderRadius: processValue(borderRadius, 'borderRadius'),
    backgroundColor,
    border,
    boxShadow,
    overflow: 'hidden',
    cursor: selected ? 'grab' : 'default'
  };

  // Navigation functions
  const goToSlide = (index) => {
    setInternalCurrentSlide(index);
    setProp(props => props.currentSlide = index);
  };

  const nextSlide = () => {
    const next = infinite 
      ? (internalCurrentSlide + 1) % slides.length 
      : Math.min(internalCurrentSlide + 1, slides.length - 1);
    goToSlide(next);
  };

  const prevSlide = () => {
    const prev = infinite 
      ? internalCurrentSlide === 0 ? slides.length - 1 : internalCurrentSlide - 1
      : Math.max(internalCurrentSlide - 1, 0);
    goToSlide(prev);
  };

  const updateCarousel = (updates) => {
    setProp(props => {
      Object.assign(props, updates);
    });
  };

  const getCurrentCarouselData = () => ({
    slides,
    currentSlide: internalCurrentSlide,
    autoplay,
    autoplayInterval,
    showArrows,
    showDots,
    infinite,
    transition,
    transitionDuration,
    swipeToSlide,
    imageStyles,
    videoStyles,
    captionStyles
  });

  return (
    <>
      <div
        className={`${selected && !hideEditorUI ? 'ring-2 ring-blue-500' : ''} ${isHovered && !hideEditorUI ? 'ring-1 ring-gray-300' : ''} ${isMultiSelected ? 'ring-2 ring-purple-500' : ''} ${className}`}
        ref={(el) => {
          carouselRef.current = el;
          if (el) {
            connect(drag(snapConnect(snapDrag(el))));
          }
        }}
        style={{
          position: 'relative',
          cursor: 'default',
          userSelect: 'none',
          pointerEvents: 'auto',
          ...computedStyles
        }}
        id={id}
        title={title}
        onClick={(e) => {
          if (e.ctrlKey || e.metaKey) {
            e.stopPropagation();
            toggleSelection(nodeId);
          }
        }}
        onMouseEnter={hideEditorUI ? undefined : () => {
          setIsHovered(true);
          updateBoxPosition();
        }}
        onMouseLeave={hideEditorUI ? undefined : () => setIsHovered(false)}
        onContextMenu={hideEditorUI ? undefined : handleContextMenu}
      >
        {/* Portal controls rendered outside this container to avoid overflow clipping */}
        {isClient && selected && !hideEditorUI && (
          <PortalControls
            boxPosition={boxPosition}
            handleResizeStart={handleResizeStart}
            handleEditClick={() => setModalVisible(true)}
            nodeId={nodeId}
            isDragging={isDragging}
            setIsDragging={setIsDragging}
          />
        )}

        {/* Slides Container */}
        <div style={{ position: 'relative', width: '100%', height: '100%' }}>
          {slides.length > 0 ? (
            slides.map((slide, index) => (
              <CarouselSlide
                key={index}
                slide={slide}
                isActive={index === internalCurrentSlide}
                imageStyles={imageStyles}
                videoStyles={videoStyles}
                captionStyles={captionStyles}
              />
            ))
          ) : (
            <div style={{
              width: '100%',
              height: '100%',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#999',
              fontSize: '18px',
              textAlign: 'center'
            }}>
              <PictureOutlined style={{ fontSize: 48, marginBottom: 16 }} />
              <div>No slides added</div>
              <div style={{ fontSize: 14, marginTop: 8 }}>
                Click the edit button to add images or videos
              </div>
            </div>
          )}

          {/* Navigation Arrows */}
          {showArrows && slides.length > 1 && (
            <>
              <button
                style={{
                  position: 'absolute',
                  left: 16,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'rgba(0,0,0,0.5)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '50%',
                  width: 40,
                  height: 40,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  zIndex: 10,
                  transition: 'background 0.2s'
                }}
                onClick={prevSlide}
                onMouseEnter={(e) => e.target.style.background = 'rgba(0,0,0,0.7)'}
                onMouseLeave={(e) => e.target.style.background = 'rgba(0,0,0,0.5)'}
              >
                <LeftOutlined />
              </button>
              
              <button
                style={{
                  position: 'absolute',
                  right: 16,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'rgba(0,0,0,0.5)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '50%',
                  width: 40,
                  height: 40,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  zIndex: 10,
                  transition: 'background 0.2s'
                }}
                onClick={nextSlide}
                onMouseEnter={(e) => e.target.style.background = 'rgba(0,0,0,0.7)'}
                onMouseLeave={(e) => e.target.style.background = 'rgba(0,0,0,0.5)'}
              >
                <RightOutlined />
              </button>
            </>
          )}

          {/* Dots Indicator */}
          {showDots && slides.length > 1 && (
            <div style={{
              position: 'absolute',
              bottom: 16,
              left: '50%',
              transform: 'translateX(-50%)',
              display: 'flex',
              gap: 8,
              zIndex: 10
            }}>
              {slides.map((_, index) => (
                <button
                  key={index}
                  style={{
                    width: 12,
                    height: 12,
                    borderRadius: '50%',
                    border: 'none',
                    background: index === internalCurrentSlide 
                      ? 'rgba(255,255,255,0.9)' 
                      : 'rgba(255,255,255,0.4)',
                    cursor: 'pointer',
                    transition: 'background 0.2s'
                  }}
                  onClick={() => goToSlide(index)}
                />
              ))}
            </div>
          )}
        </div>

        {children}
      </div>

      {/* Settings Modal */}
      <CarouselSettingsModal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        carousel={getCurrentCarouselData()}
        onUpdate={updateCarousel}
      />
      
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

// Portal Controls Component - renders outside of the Carousel to avoid overflow clipping
const PortalControls = ({ 
  boxPosition, 
  handleResizeStart,
  handleEditClick,
  nodeId,
  isDragging,
  setIsDragging
}) => {
  if (typeof window === 'undefined') return null; // SSR check

  return createPortal(
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        pointerEvents: 'none', // Allow clicks to pass through
        zIndex: 999999
      }}
    >
      {/* Combined pill-shaped drag controls with EDIT in center */}
      <div
        style={{
          position: 'absolute',
          top: boxPosition.top - 28,
          left: boxPosition.left + boxPosition.width / 2,
          transform: 'translateX(-50%)',
          display: 'flex',
          background: 'white',
          borderRadius: '16px',
          border: '2px solid #d9d9d9',
          fontSize: '9px',
          fontWeight: 'bold',
          userSelect: 'none',
          boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
          pointerEvents: 'auto', // Re-enable pointer events for this element
          zIndex: 10000
        }}
      >
        {/* Left section - MOVE (Craft.js drag) */}
        <div
          style={{
            background: '#52c41a',
            color: 'white',
            padding: '4px',
            borderRadius: '14px 0 0 14px',
            cursor: 'grab',
            display: 'flex',
            alignItems: 'center',
            gap: '2px',
            minWidth: '48px',
            justifyContent: 'center',
            transition: 'background 0.2s ease'
          }}
          title="Drag to move between containers"
        >
          📦 MOVE
        </div>
        
        {/* Center section - EDIT (Purple) */}
        <div
          style={{
            background: '#722ed1',
            color: 'white',
            padding: '4px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '2px',
            minWidth: '48px',
            justifyContent: 'center',
            transition: 'background 0.2s ease'
          }}
          onClick={handleEditClick}
          title="Edit carousel settings"
        >
          🎠 EDIT
        </div>
        
        {/* Right section - POS (Custom position drag with snapping) */}
        <SnapPositionHandle
          nodeId={nodeId}
          style={{
            background: '#1890ff',
            color: 'white',
            padding: '4px',
            borderRadius: '0 14px 14px 0',
            cursor: 'move',
            display: 'flex',
            alignItems: 'center',
            gap: '2px',
            minWidth: '48px',
            justifyContent: 'center',
            transition: 'background 0.2s ease'
          }}
          onDragStart={(e) => {
            setIsDragging(true);
          }}
          onDragMove={(e, { x, y, snapped }) => {
            // Optional: Add visual feedback for snapping
            console.log(`Element moved to ${x}, ${y}, snapped: ${snapped}`);
          }}
          onDragEnd={(e) => {
            setIsDragging(false);
          }}
        >
          ↕↔ POS
        </SnapPositionHandle>
      </div>

      {/* Resize handles */}
      {[
        { position: 'nw', cursor: 'nw-resize', top: -4, left: -4 },
        { position: 'ne', cursor: 'ne-resize', top: -4, left: boxPosition.width - 4 },
        { position: 'sw', cursor: 'sw-resize', top: boxPosition.height - 4, left: -4 },
        { position: 'se', cursor: 'se-resize', top: boxPosition.height - 4, left: boxPosition.width - 4 },
        { position: 'n', cursor: 'n-resize', top: -4, left: boxPosition.width / 2 - 4 },
        { position: 's', cursor: 's-resize', top: boxPosition.height - 4, left: boxPosition.width / 2 - 4 },
        { position: 'w', cursor: 'w-resize', top: boxPosition.height / 2 - 4, left: -4 },
        { position: 'e', cursor: 'e-resize', top: boxPosition.height / 2 - 4, left: boxPosition.width - 4 }
      ].map(handle => (
        <div
          key={handle.position}
          style={{
            position: 'absolute',
            top: boxPosition.top + handle.top,
            left: boxPosition.left + handle.left,
            width: 8,
            height: 8,
            background: 'white',
            border: '2px solid #1890ff',
            borderRadius: '2px',
            cursor: handle.cursor,
            zIndex: 10001,
            pointerEvents: 'auto'
          }}
          onMouseDown={(e) => handleResizeStart(e, handle.position)}
          title="Resize"
        />
      ))}
    </div>,
    document.body
  );
};

// CraftJS configuration
Carousel.craft = {
  displayName: "Carousel",
  props: {
    width: "100%",
    height: 400,
    minWidth: 200,
    maxWidth: "",
    minHeight: 200,
    maxHeight: "",
    position: "relative",
    top: "",
    left: "",
    right: "",
    bottom: "",
    zIndex: 1,
    margin: "10px 0",
    padding: 0,
    borderRadius: 8,
    backgroundColor: "#000000",
    border: "none",
    boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
    slides: [],
    currentSlide: 0,
    autoplay: false,
    autoplayInterval: 3000,
    showArrows: true,
    showDots: true,
    infinite: true,
    transition: 'slide',
    transitionDuration: 500,
    swipeToSlide: true,
    imageStyles: {
      objectFit: 'cover',
      objectPosition: 'center',
      borderRadius: 0,
      opacity: 1,
      filter: ''
    },
    videoStyles: {
      autoplay: false,
      controls: true,
      loop: false,
      muted: true,
      objectFit: 'cover',
      objectPosition: 'center',
      borderRadius: 0,
      opacity: 1
    },
    captionStyles: {
      fontFamily: 'Arial, sans-serif',
      fontSize: 16,
      fontWeight: 'normal',
      color: '#ffffff',
      backgroundColor: 'rgba(0,0,0,0.7)',
      padding: '12px 16px',
      borderRadius: 4,
      textAlign: 'center',
      lineHeight: 1.4,
      boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
      backdropFilter: 'blur(5px)',
      border: 'none'
    },
    className: "",
    id: "",
    title: "",
  },
  rules: {
    canDrag: () => true,
    canDrop: () => true,
    canMoveIn: () => true,
    canMoveOut: () => true,
  },
  custom: {
    styleMenu: {
      supportedProps: [
        // Layout & Position
        "width", "height", "minWidth", "maxWidth", "minHeight", "maxHeight",
        "position", "top", "left", "right", "bottom", "zIndex",
        
        // Spacing
        "margin", "padding",
        
        // Visual
        "borderRadius", "backgroundColor", "border", "boxShadow",
        
        // Carousel Settings
        "autoplay", "autoplayInterval", "showArrows", "showDots", 
        "infinite", "transition", "transitionDuration", "swipeToSlide",
        
        // HTML Attributes
        "className", "id", "title"
      ]
    }
  }
};