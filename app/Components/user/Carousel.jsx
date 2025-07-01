'use client'

import React, { useRef, useEffect, useState, useCallback } from "react";
import { useNode, useEditor, Element } from "@craftjs/core";
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
    { id: 1, url: 'https://sample-videos.com/zip/10/mp4/SampleVideo_1280x720_1mb.mp4', name: 'Sample Video 1', thumbnail: 'https://images.unsplash.com/photo-1574717024653-61fd2cf4d44d?w=400' },
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

// Media Library Modal
const MediaLibraryModal = ({ visible, onClose, onSelect, type = 'both' }) => {
  const [activeTab, setActiveTab] = useState('images');

  const handleSelect = (item, itemType) => {
    onSelect({
      id: Date.now(),
      type: itemType,
      url: item.url,
      name: item.name,
      caption: '',
      captionPosition: 'bottom-center'
    });
    onClose();
  };

  return (
    <Modal
      title="Media Library"
      open={visible}
      onCancel={onClose}
      footer={null}
      width={800}
    >
      <Tabs activeKey={activeTab} onChange={setActiveTab}>
        {(type === 'both' || type === 'images') && (
          <TabPane tab="Images" key="images">
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
              {MOCK_MEDIA_LIBRARY.images.map(image => (
                <div
                  key={image.id}
                  style={{
                    cursor: 'pointer',
                    border: '2px solid transparent',
                    borderRadius: 8,
                    overflow: 'hidden',
                    transition: 'border-color 0.2s'
                  }}
                  onClick={() => handleSelect(image, 'image')}
                  onMouseEnter={(e) => e.target.style.borderColor = '#1890ff'}
                  onMouseLeave={(e) => e.target.style.borderColor = 'transparent'}
                >
                  <img
                    src={image.url}
                    alt={image.name}
                    style={{ width: '100%', height: 120, objectFit: 'cover' }}
                  />
                  <div style={{ padding: 8, fontSize: 12, textAlign: 'center' }}>
                    {image.name}
                  </div>
                </div>
              ))}
            </div>
          </TabPane>
        )}
        
        {(type === 'both' || type === 'videos') && (
          <TabPane tab="Videos" key="videos">
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 16 }}>
              {MOCK_MEDIA_LIBRARY.videos.map(video => (
                <div
                  key={video.id}
                  style={{
                    cursor: 'pointer',
                    border: '2px solid transparent',
                    borderRadius: 8,
                    overflow: 'hidden',
                    transition: 'border-color 0.2s'
                  }}
                  onClick={() => handleSelect(video, 'video')}
                  onMouseEnter={(e) => e.target.style.borderColor = '#1890ff'}
                  onMouseLeave={(e) => e.target.style.borderColor = 'transparent'}
                >
                  <div style={{ position: 'relative' }}>
                    <img
                      src={video.thumbnail}
                      alt={video.name}
                      style={{ width: '100%', height: 120, objectFit: 'cover' }}
                    />
                    <PlayCircleOutlined 
                      style={{
                        position: 'absolute',
                        top: '50%',
                        left: '50%',
                        transform: 'translate(-50%, -50%)',
                        fontSize: 30,
                        color: 'white',
                        textShadow: '0 0 10px rgba(0,0,0,0.5)'
                      }}
                    />
                  </div>
                  <div style={{ padding: 8, fontSize: 12, textAlign: 'center' }}>
                    {video.name}
                  </div>
                </div>
              ))}
            </div>
          </TabPane>
        )}
      </Tabs>
    </Modal>
  );
};

// Settings Modal
const CarouselSettingsModal = ({ visible, onClose, carousel, onUpdate }) => {
  const [activeTab, setActiveTab] = useState('slides');
  const [mediaLibraryVisible, setMediaLibraryVisible] = useState(false);
  const [editingSlideIndex, setEditingSlideIndex] = useState(null);

  const addSlide = (slide) => {
    const newSlides = [...carousel.slides, slide];
    onUpdate({ ...carousel, slides: newSlides });
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

      <MediaLibraryModal
        visible={mediaLibraryVisible}
        onClose={() => setMediaLibraryVisible(false)}
        onSelect={addSlide}
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
    selected 
  } = useNode((node) => ({
    id: node.id,
    selected: node.events.selected,
  }));
  
  const carouselRef = useRef(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [internalCurrentSlide, setInternalCurrentSlide] = useState(currentSlide);

  useEffect(() => {
    if (carouselRef.current) {
      connect(drag(carouselRef.current));
    }
  }, [connect, drag]);

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
        className={`${selected ? 'ring-2 ring-blue-500' : ''} ${className}`}
        ref={carouselRef}
        style={computedStyles}
        id={id}
        title={title}
      >
        {/* Edit button */}
        {selected && (
          <div
            style={{
              position: "absolute",
              top: -12,
              right: -12,
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
            onClick={() => setModalVisible(true)}
            title="Edit carousel"
          >
            <EditOutlined />
          </div>
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
    </>
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