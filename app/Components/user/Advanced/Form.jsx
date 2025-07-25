'use client'

import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { useNode, useEditor, Element } from "@craftjs/core";
import ContextMenu from "../../support/ContextMenu";
import { useContextMenu } from "../../support/useContextMenu";
import useEditorDisplay from "../../support/useEditorDisplay";
import { useCraftSnap } from "../../support/useCraftSnap";
import SnapPositionHandle from "../../support/SnapPositionHandle";
import { snapGridSystem } from "../../support/SnapGridSystem";
import { useMultiSelect } from '../../support/MultiSelectContext';
import { 
  EditOutlined, 
  DatabaseOutlined, 
  PlusOutlined,
  FormOutlined,
  DragOutlined,
  BorderOuterOutlined
} from '@ant-design/icons';
import { 
  Button, 
  Modal, 
  Input, 
  Select, 
  Switch, 
  message, 
  Divider, 
  Typography,
  Card,
  Tag,
  Alert,
  Tabs,
  ColorPicker,
  Slider,
  InputNumber,
  Space
} from 'antd';
import { FormInput } from '../Input';

const { Text, Title } = Typography;
const { TextArea } = Input;

export const Form = ({
  // Form Configuration
  formTitle = "Contact Form",
  formDescription = "Please fill out the form below",
  submitButtonText = "Submit",
  successMessage = "Form submitted successfully!",
  
  // Database Configuration
  databaseName = "",
  keyField = "",
  
  // Form Behavior
  resetAfterSubmit = true,
  showSuccessMessage = true,
  redirectAfterSubmit = false,
  redirectUrl = "",
  
  // Styling Options
  linkStyles = false,
  
  // Layout & Position
  position = "relative",
  top = "auto",
  left = "auto",
  right = "auto",
  bottom = "auto",
  zIndex = "auto",
  
  // Size & Spacing
  width = "100%",
  minWidth = "auto",
  maxWidth = "600px",
  height = "auto",
  minHeight = "auto",
  maxHeight = "none",
  padding = "24px",
  paddingTop = "",
  paddingRight = "",
  paddingBottom = "",
  paddingLeft = "",
  margin = "0",
  marginTop = "",
  marginRight = "",
  marginBottom = "",
  marginLeft = "",
  
  // Background
  backgroundColor = "#ffffff",
  backgroundImage = "",
  backgroundSize = "cover",
  backgroundPosition = "center",
  backgroundRepeat = "no-repeat",
  backgroundAttachment = "scroll",
  
  // Border
  border = "1px solid #e8e8e8",
  borderTop = "",
  borderRight = "",
  borderBottom = "",
  borderLeft = "",
  borderRadius = "8px",
  borderTopLeftRadius = "",
  borderTopRightRadius = "",
  borderBottomLeftRadius = "",
  borderBottomRightRadius = "",
  borderColor = "#e8e8e8",
  borderStyle = "solid",
  borderWidth = "1px",
  
  // Shadow & Effects
  boxShadow = "0 4px 12px rgba(0, 0, 0, 0.1)",
  filter = "none",
  backdropFilter = "none",
  opacity = 1,
  
  // Transform
  transform = "none",
  transformOrigin = "center",
  scale = 1,
  rotate = 0,
  translateX = 0,
  translateY = 0,
  skewX = 0,
  skewY = 0,
  
  // Transition
  transition = "all 0.3s ease",
  transitionProperty = "all",
  transitionDuration = "0.3s",
  transitionTimingFunction = "ease",
  transitionDelay = "0s",
  
  // Layout
  display = "block",
  flexDirection = "column",
  justifyContent = "flex-start",
  alignItems = "stretch",
  gap = "0px",
  flexWrap = "nowrap",
  overflow = "visible",
  overflowX = "visible",
  overflowY = "visible",
  
  // Submit Button Styling
  submitButtonColor = "#1890ff",
  submitButtonSize = "large",
  submitButtonWidth = "100%",
  
  // Additional
  className = "",
  children
}) => {
  // Craft.js hooks
  const { 
    connectors: { connect, drag }, 
    actions: { setProp }, 
    selected: isSelected, 
    hovered: isHovered,
    id: nodeId,
    parent
  } = useNode((node) => ({
    selected: node.events.selected,
    hovered: node.events.hovered,
    id: node.id,
    parent: node.data.parent,
  }));

  const { actions: editorActions } = useEditor();
  
  // Use snap functionality
  const { connectors: { connect: snapConnect, drag: snapDrag } } = useCraftSnap(nodeId);
  
  // Use multi-selection functionality
  const { isSelected: isMultiSelected, toggleSelection } = useMultiSelect();

  // Track parent changes to reset position properties
  const prevParentRef = useRef(parent);

  useEffect(() => {
    if (prevParentRef.current !== parent) {
      console.log('Form: Parent changed, resetting position properties');
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

  // Component state
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [formData, setFormData] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formPosition, setFormPosition] = useState({ x: 0, y: 0, width: 0, height: 0 });
  const [isPositionTracked, setIsPositionTracked] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);

  // Context menu functionality
  const { contextMenu, handleContextMenu, closeContextMenu } = useContextMenu();
  const { hideEditorUI } = useEditorDisplay();

  // Refs
  const formRef = useRef(null);
  const dragRef = useRef(null);

  // Use the correct Craft.js way to get descendants and detect FormInputs
  const { inputFields, descendants } = useEditor((state, query) => {
    try {
      // Check if nodeId exists
      if (!nodeId || !state.nodes[nodeId]) {
        return { inputFields: [], descendants: [] };
      }
      
      const currentNode = query.node(nodeId);
      const nodeDescendants = currentNode.descendants();
      
      if (nodeDescendants.length === 0) {
        return { inputFields: [], descendants: [] };
      }
      
      const formDescendants = query.node(nodeDescendants[0]).descendants();
    
    const formInputs = formDescendants
      .map(nodeId => {
        try {
          const currentNodeState = state.nodes[nodeId];
          if (!currentNodeState) return null;
          
          const nodeData = currentNodeState.data;
          if (!nodeData) return null;
          
          // Check if it's a FormInput component
          const isFormInput = 
            nodeData.type?.craft?.displayName === 'FormInput' ||
            nodeData.displayName === 'FormInput' ||
            (typeof nodeData.type === 'function' && nodeData.type.name === 'FormInput') ||
            nodeData.type?.resolvedName === 'FormInput' ||
            (nodeData.type === FormInput);
          
          if (!isFormInput) return null;
          
          // Get the current props (including inputValue)
          const props = nodeData.props || {};
          
          // Check if this FormInput has a Text child and sync the labelText
          const formInputNode = query.node(nodeId);
          const textChildren = formInputNode.descendants().filter(childId => {
            const childNode = state.nodes[childId];
            return childNode?.data?.type?.craft?.displayName === 'Text' ||
                   childNode?.data?.displayName === 'Text';
          });
          
          // If there's a Text child, use its text as labelText
          let actualLabelText = props.labelText;
          if (textChildren.length > 0) {
            const textNode = state.nodes[textChildren[0]];
            const textProps = textNode?.data?.props || {};
            // Remove the " *" suffix if it exists
            actualLabelText = textProps.text?.replace(' *', '') || props.labelText;
          }
          
          const fieldName = actualLabelText?.toLowerCase().replace(/[^a-z0-9]/g, '') || `field_${nodeId.slice(-6)}`;
          
          return {
            id: nodeId,
            fieldName,
            labelText: actualLabelText || 'Untitled Field',
            inputType: props.inputType || 'text',
            required: props.required || false,
            placeholder: props.placeholder || '',
            disabled: props.disabled || false,
            // IMPORTANT: Get the actual input value from Craft.js state
            value: props.inputValue || '',
            lastUpdated: Date.now()
          };
        } catch (error) {
          console.warn(`Error processing node ${nodeId}:`, error);
          return null;
        }
      })
      .filter(Boolean);
    
    return {
      inputFields: formInputs,
      descendants: formDescendants
    };
  } catch (error) {
    console.warn('Error detecting form inputs:', error);
    return {
      inputFields: [],
      descendants: []
    };
  }
});

// Update the formData to sync with Craft.js state
useEffect(() => {
  const newFormData = {};
  inputFields.forEach(field => {
    if (field.value !== undefined && field.value !== '') {
      newFormData[field.fieldName] = field.value;
    }
  });
  
  // Only update if there are actual changes
  const hasChanges = Object.keys(newFormData).length > 0 || Object.keys(formData).length > 0;
  if (hasChanges && JSON.stringify(newFormData) !== JSON.stringify(formData)) {
    setFormData(newFormData);
  }
}, [inputFields]);

// Enhanced debugging
useEffect(() => {
  console.log(`📊 Form ${nodeId} - Input fields with values:`, {
    fieldCount: inputFields.length,
    fields: inputFields.map(f => ({
      labelText: f.labelText,
      fieldName: f.fieldName,
      inputType: f.inputType,
      value: f.value,
      hasValue: !!f.value
    })),
    formData
  });
}, [inputFields, formData, nodeId]);

  
  
  // Static database list
  const databases = useMemo(() => [
    { id: 'contacts', name: 'Contacts Database' },
    { id: 'leads', name: 'Sales Leads' },
    { id: 'feedback', name: 'Customer Feedback' }
  ], []);

  // Connect form element and setup drag
  useEffect(() => {
    if (formRef.current) {
      const element = formRef.current;
      connect(drag(element));
    }
  }, [connect, drag]);

  // Connect snap functionality when selected
  useEffect(() => {
    if (formRef.current && isSelected) {
      const element = formRef.current;
      snapConnect(snapDrag(element));
    }
  }, [snapConnect, snapDrag, isSelected]);

  // Position tracking for portal controls
  const updateFormPosition = useCallback(() => {
    if (formRef.current) {
      const rect = formRef.current.getBoundingClientRect();
      const scrollLeft = window.pageXOffset || document.documentElement.scrollLeft;
      const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
      
      setFormPosition({
        x: rect.left + scrollLeft,
        y: rect.top + scrollTop,
        width: rect.width,
        height: rect.height
      });
    }
  }, []);

  // Track position when selected/hovered
  useEffect(() => {
    if ((isSelected || isHovered) && !isPositionTracked) {
      updateFormPosition();
      setIsPositionTracked(true);
      
      const handleResize = () => updateFormPosition();
      const handleScroll = () => updateFormPosition();
      
      window.addEventListener('resize', handleResize);
      window.addEventListener('scroll', handleScroll);
      
      return () => {
        window.removeEventListener('resize', handleResize);
        window.removeEventListener('scroll', handleScroll);
      };
    } else if (!isSelected && !isHovered && isPositionTracked) {
      setIsPositionTracked(false);
    }
  }, [isSelected, isHovered, isPositionTracked, updateFormPosition]);

  // Update position when component updates
  useEffect(() => {
    if (isPositionTracked) {
      const timeoutId = setTimeout(updateFormPosition, 10);
      return () => clearTimeout(timeoutId);
    }
  }, [isPositionTracked, updateFormPosition, width, height, padding, margin]);

  // Log input detection for debugging
  useEffect(() => {
    console.log(`📊 Form ${nodeId} - Input fields detected:`, inputFields.length);
    if (inputFields.length > 0) {
      console.log('Fields:', inputFields.map(f => ({ label: f.labelText, type: f.inputType })));
    }
  }, [inputFields.length, nodeId]);

  // Form submission handler
  const handleSubmit = useCallback(async (e) => {
    e.preventDefault();
    e.stopPropagation();
    
    setIsSubmitting(true);

    try {
      // Validate required fields
      const requiredFields = inputFields.filter(field => field.required);
      const missingFields = requiredFields.filter(field => !formData[field.fieldName]);
      
      if (missingFields.length > 0) {
        message.error(`Please fill in required fields: ${missingFields.map(f => f.labelText).join(', ')}`);
        return;
      }

      // Prepare submission data
      const submissionData = {
        ...formData,
        timestamp: new Date().toISOString(),
        formId: id,
        formTitle
      };

      console.log('Submitting to database:', databaseName);
      console.log('Data:', submissionData);

      // Simulate submission
      await new Promise(resolve => setTimeout(resolve, 1000));

      if (showSuccessMessage) {
        message.success(successMessage);
      }

      if (resetAfterSubmit) {
        setFormData({});
      }

      if (redirectAfterSubmit && redirectUrl) {
        window.location.href = redirectUrl;
      }

    } catch (error) {
      console.error('Form submission error:', error);
      message.error('Failed to submit form. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  }, [inputFields, formData, databaseName, showSuccessMessage, successMessage, resetAfterSubmit, redirectAfterSubmit, redirectUrl, nodeId, formTitle]);

  // Create new database
  const createNewDatabase = useCallback((name) => {
    const newDb = {
      id: name.toLowerCase().replace(/[^a-z0-9]/g, ''),
      name: name
    };
    setProp(props => props.databaseName = newDb.id);
    message.success(`Database "${name}" created successfully!`);
  }, [setProp]);

  // Manual refresh for debugging (now just shows current count)
  const handleManualRefresh = useCallback(() => {
    message.info(`Current fields: ${inputFields.length}`);
  }, [inputFields.length]);

  // Event handlers
  const handleFormEvent = useCallback((e) => {
    // Only stop propagation for form submission, not for drag events
    if (e.type === 'submit') {
      e.stopPropagation();
    }
  }, []);

  const handleEditClick = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsEditModalOpen(true);
  }, []);

  // Create dynamic styles object
  const dynamicStyles = useMemo(() => {
    const paddingValue = paddingTop || paddingRight || paddingBottom || paddingLeft
      ? `${paddingTop || padding} ${paddingRight || padding} ${paddingBottom || padding} ${paddingLeft || padding}`
      : padding;
      
    const marginValue = marginTop || marginRight || marginBottom || marginLeft
      ? `${marginTop || margin} ${marginRight || margin} ${marginBottom || margin} ${marginLeft || margin}`
      : margin;
      
    const borderRadiusValue = borderTopLeftRadius || borderTopRightRadius || borderBottomLeftRadius || borderBottomRightRadius
      ? `${borderTopLeftRadius || borderRadius} ${borderTopRightRadius || borderRadius} ${borderBottomRightRadius || borderRadius} ${borderBottomLeftRadius || borderRadius}`
      : borderRadius;
      
    const borderValue = borderTop || borderRight || borderBottom || borderLeft
      ? `${borderTop || border} ${borderRight || border} ${borderBottom || border} ${borderLeft || border}`
      : border;
      
    const transformValue = transform !== "none" ? transform : 
      `translate(${translateX}px, ${translateY}px) scale(${scale}) rotate(${rotate}deg) skew(${skewX}deg, ${skewY}deg)`;
      
    const transitionValue = transitionProperty !== "all" || transitionDuration !== "0.3s" || transitionTimingFunction !== "ease" || transitionDelay !== "0s"
      ? `${transitionProperty} ${transitionDuration} ${transitionTimingFunction} ${transitionDelay}`
      : transition;

    return {
      // Position & Layout
      position,
      top: top !== "auto" ? top : undefined,
      left: left !== "auto" ? left : undefined,
      right: right !== "auto" ? right : undefined,
      bottom: bottom !== "auto" ? bottom : undefined,
      zIndex: zIndex !== "auto" ? zIndex : undefined,
      display,
      
      // Size & Spacing
      width,
      minWidth: minWidth !== "auto" ? minWidth : undefined,
      maxWidth,
      height: height !== "auto" ? height : undefined,
      minHeight: minHeight !== "auto" ? minHeight : undefined,
      maxHeight: maxHeight !== "none" ? maxHeight : undefined,
      padding: paddingValue,
      margin: marginValue,
      
      // Background
      backgroundColor,
      backgroundImage: backgroundImage ? `url(${backgroundImage})` : undefined,
      backgroundSize,
      backgroundPosition,
      backgroundRepeat,
      backgroundAttachment,
      
      // Border
      border: borderValue,
      borderRadius: borderRadiusValue,
      borderColor,
      borderStyle,
      borderWidth,
      
      // Shadow & Effects
      boxShadow,
      filter: filter !== "none" ? filter : undefined,
      backdropFilter: backdropFilter !== "none" ? backdropFilter : undefined,
      opacity,
      
      // Transform
      transform: transformValue,
      transformOrigin,
      
      // Transition
      transition: transitionValue,
      
      // Layout (Flex)
      flexDirection: display.includes('flex') ? flexDirection : undefined,
      justifyContent: display.includes('flex') ? justifyContent : undefined,
      alignItems: display.includes('flex') ? alignItems : undefined,
      gap: display.includes('flex') ? gap : undefined,
      flexWrap: display.includes('flex') ? flexWrap : undefined,
      
      // Overflow
      overflow: overflow !== "visible" ? overflow : undefined,
      overflowX: overflowX !== "visible" ? overflowX : undefined,
      overflowY: overflowY !== "visible" ? overflowY : undefined,
    };
  }, [
    position, top, left, right, bottom, zIndex, display,
    width, minWidth, maxWidth, height, minHeight, maxHeight,
    padding, paddingTop, paddingRight, paddingBottom, paddingLeft,
    margin, marginTop, marginRight, marginBottom, marginLeft,
    backgroundColor, backgroundImage, backgroundSize, backgroundPosition, backgroundRepeat, backgroundAttachment,
    border, borderTop, borderRight, borderBottom, borderLeft, borderRadius, borderTopLeftRadius, borderTopRightRadius, borderBottomLeftRadius, borderBottomRightRadius,
    borderColor, borderStyle, borderWidth, boxShadow, filter, backdropFilter, opacity,
    transform, transformOrigin, scale, rotate, translateX, translateY, skewX, skewY,
    transition, transitionProperty, transitionDuration, transitionTimingFunction, transitionDelay,
    flexDirection, justifyContent, alignItems, gap, flexWrap, overflow, overflowX, overflowY
  ]);

  // Handle input value changes
  const handleInputChange = useCallback((fieldName, value) => {
    setFormData(prev => ({
      ...prev,
      [fieldName]: value
    }));
  }, []);

  return (
    <>
      <form
        ref={formRef}
        className={`${isSelected ? 'craft-selected' : ''} ${isHovered ? 'craft-hovered' : ''} ${className}`}
        style={{
          ...dynamicStyles,
          position: 'relative',
          outline: (isSelected && !hideEditorUI) ? '2px solid #1890ff' : (isHovered && !hideEditorUI) ? '2px solid #40a9ff' : 'none',
          outlineOffset: ((isSelected || isHovered) && !hideEditorUI) ? '2px' : '0',
        }}
        onSubmit={handleSubmit}
        onContextMenu={hideEditorUI ? undefined : handleContextMenu}
      >
        {/* Form Header */}
        <div style={{ marginBottom: 24 }}>
          <Title level={3} style={{ margin: 0, marginBottom: 8 }}>
            {formTitle}
          </Title>
          {formDescription && (
            <Text type="secondary">{formDescription}</Text>
          )}
          {databaseName && (
            <div style={{ marginTop: 8 }}>
              <Tag icon={<DatabaseOutlined />} color="blue">
                {databases.find(db => db.id === databaseName)?.name || databaseName}
              </Tag>
              {keyField && (
                <Tag icon={<FormOutlined />} color="green">
                  Key: {inputFields.find(f => f.fieldName === keyField)?.labelText || keyField}
                </Tag>
              )}
            </div>
          )}
        </div>

        {/* Debug info (only show when selected) */}
        {isSelected && (
          <div style={{ marginBottom: 16, display: 'flex', gap: 8, alignItems: 'center' }}>
            <Button 
              size="small" 
              onClick={handleManualRefresh}
            >
              📊 Fields: {inputFields.length}
            </Button>
            {descendants.length > 0 && (
              <Tag color="blue">Descendants: {descendants.length}</Tag>
            )}
          </div>
        )}

        {/* Form Content Area */}
        <Element 
          canvas 
          is={FormInputDropArea}
          id={`${nodeId}_drop_area`}
          style={{ 
            marginBottom: 24,
            minHeight: '100px'
          }}
        />

        {/* Submit Button */}
        <Button
          type="primary"
          htmlType="submit"
          size={submitButtonSize}
          loading={isSubmitting}
          style={{
            width: submitButtonWidth,
            backgroundColor: submitButtonColor,
            borderColor: submitButtonColor
          }}
          disabled={!databaseName || inputFields.length === 0}
        >
          {submitButtonText}
        </Button>

        {/* Status Alerts */}
        {!databaseName && (
          <Alert
            message="Database not configured"
            description="Please configure a database to store form submissions."
            type="warning"
            showIcon
            style={{ marginTop: 16 }}
          />
        )}

        {inputFields.length === 0 && (
          <Alert
            message="No input fields found"
            description="Add input components to this form to collect data."
            type="info"
            showIcon
            style={{ marginTop: 16 }}
          />
        )}

        {/* Data Preview - ONLY when selected */}
        {isSelected && inputFields.length > 0 && (
          <FormDataPreview 
            inputFields={inputFields}
            formData={formData}
          />
        )}
      </form>

      {/* Portal Controls */}
      {(isSelected || isHovered) && isPositionTracked && typeof document !== 'undefined' && 
        createPortal(
          <FormPortalControls
            formPosition={formPosition}
            isSelected={isSelected}
            isHovered={isHovered}
            onEdit={handleEditClick}
            setProp={setProp}
            updateFormPosition={updateFormPosition}
            nodeId={nodeId}
            dragRef={dragRef}
            isDragging={isDragging}
            setIsDragging={setIsDragging}
            editorActions={editorActions}
            formRef={formRef}
          />,
          document.body
        )
      }

      {/* Configuration Modal */}
      <Modal
        title="Form Configuration"
        open={isEditModalOpen}
        onCancel={() => setIsEditModalOpen(false)}
        width={1200}
        zIndex={99000}
        footer={[
          <Button key="cancel" onClick={() => setIsEditModalOpen(false)}>
            Cancel
          </Button>,
          <Button key="save" type="primary" onClick={() => setIsEditModalOpen(false)}>
            Save Changes
          </Button>
        ]}
      >
        <FormConfigModal 
          setProp={setProp}
          databases={databases}
          createNewDatabase={createNewDatabase}
          inputFields={inputFields}
          formData={formData}
          formTitle={formTitle}
          formDescription={formDescription}
          submitButtonText={submitButtonText}
          successMessage={successMessage}
          databaseName={databaseName}
          keyField={keyField}
          resetAfterSubmit={resetAfterSubmit}
          showSuccessMessage={showSuccessMessage}
          redirectAfterSubmit={redirectAfterSubmit}
          redirectUrl={redirectUrl}
          linkStyles={linkStyles}
          submitButtonColor={submitButtonColor}
          submitButtonSize={submitButtonSize}
          submitButtonWidth={submitButtonWidth}
          // Pass all styling props
          position={position}
          top={top}
          left={left}
          right={right}
          bottom={bottom}
          zIndex={zIndex}
          width={width}
          minWidth={minWidth}
          maxWidth={maxWidth}
          height={height}
          minHeight={minHeight}
          maxHeight={maxHeight}
          padding={padding}
          paddingTop={paddingTop}
          paddingRight={paddingRight}
          paddingBottom={paddingBottom}
          paddingLeft={paddingLeft}
          margin={margin}
          marginTop={marginTop}
          marginRight={marginRight}
          marginBottom={marginBottom}
          marginLeft={marginLeft}
          backgroundColor={backgroundColor}
          backgroundImage={backgroundImage}
          backgroundSize={backgroundSize}
          backgroundPosition={backgroundPosition}
          backgroundRepeat={backgroundRepeat}
          backgroundAttachment={backgroundAttachment}
          border={border}
          borderTop={borderTop}
          borderRight={borderRight}
          borderBottom={borderBottom}
          borderLeft={borderLeft}
          borderRadius={borderRadius}
          borderTopLeftRadius={borderTopLeftRadius}
          borderTopRightRadius={borderTopRightRadius}
          borderBottomLeftRadius={borderBottomLeftRadius}
          borderBottomRightRadius={borderBottomRightRadius}
          borderColor={borderColor}
          borderStyle={borderStyle}
          borderWidth={borderWidth}
          boxShadow={boxShadow}
          filter={filter}
          backdropFilter={backdropFilter}
          opacity={opacity}
          transform={transform}
          transformOrigin={transformOrigin}
          scale={scale}
          rotate={rotate}
          translateX={translateX}
          translateY={translateY}
          skewX={skewX}
          skewY={skewY}
          transition={transition}
          transitionProperty={transitionProperty}
          transitionDuration={transitionDuration}
          transitionTimingFunction={transitionTimingFunction}
          transitionDelay={transitionDelay}
          display={display}
          flexDirection={flexDirection}
          justifyContent={justifyContent}
          alignItems={alignItems}
          gap={gap}
          flexWrap={flexWrap}
          overflow={overflow}
          overflowX={overflowX}
          overflowY={overflowY}
        />
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

// Portal Controls Component
const FormPortalControls = ({ 
  formPosition, 
  isSelected, 
  isHovered, 
  onEdit, 
  setProp, 
  updateFormPosition, 
  nodeId, 
  dragRef, 
  isDragging, 
  setIsDragging,
  editorActions,
  formRef
}) => {
  const [isResizing, setIsResizing] = useState(false);

  if (typeof window === 'undefined') return null; // SSR check

  // Handle resize start with snap functionality (from Box component)
  const handleResizeStart = useCallback((e, direction) => {
    e.stopPropagation();
    e.preventDefault();
    
    const startX = e.clientX;
    const startY = e.clientY;
    
    if (!formRef.current) return;
    
    const rect = formRef.current.getBoundingClientRect();
    const startWidth = rect.width;
    const startHeight = rect.height;
    
    setIsResizing(true);

    const handleMouseMove = (e) => {
      const deltaX = e.clientX - startX;
      const deltaY = e.clientY - startY;
      
      let newWidth = startWidth;
      let newHeight = startHeight;
      
      // Calculate new dimensions based on direction
      switch (direction) {
        case 'nw': // top-left
          newWidth = startWidth - deltaX;
          newHeight = startHeight - deltaY;
          break;
        case 'ne': // top-right
          newWidth = startWidth + deltaX;
          newHeight = startHeight - deltaY;
          break;
        case 'sw': // bottom-left
          newWidth = startWidth - deltaX;
          newHeight = startHeight + deltaY;
          break;
        case 'se': // bottom-right
          newWidth = startWidth + deltaX;
          newHeight = startHeight + deltaY;
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
      newWidth = Math.max(newWidth, 100);
      newHeight = Math.max(newHeight, 50);
      
      // Get current position for snap calculations
      const currentRect = formRef.current.getBoundingClientRect();
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
  }, [nodeId, editorActions, setProp]);

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
      {/* Combined pill-shaped drag controls */}
      <div
        style={{
          position: 'absolute',
          top: formPosition.y - 28,
          left: formPosition.x + formPosition.width / 2,
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
        {/* Left - MOVE (Craft.js drag) */}
        <div
          ref={dragRef}
          style={{
            background: '#52c41a',
            color: 'white',
            padding: '2px',
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
        
        {/* Center - POS (Custom position drag with snapping) */}
        <SnapPositionHandle
          nodeId={nodeId}
          style={{
            background: '#1890ff',
            color: 'white',
            padding: '4px',
            borderRadius: '0',
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
            console.log(`Form moved to ${x}, ${y}, snapped: ${snapped}`);
          }}
          onDragEnd={(e) => {
            setIsDragging(false);
          }}
        >
          ↕↔ POS
        </SnapPositionHandle>

        {/* Right - EDIT */}
        <div
          style={{
            background: '#722ed1',
            color: 'white',
            padding: '4px 8px',
            borderRadius: '0 14px 14px 0',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '2px',
            minWidth: '48px',
            justifyContent: 'center',
            transition: 'background 0.2s ease'
          }}
          onClick={onEdit}
          onMouseDown={(e) => e.stopPropagation()}
          title="Edit form settings"
        >
          ⚙️ EDIT
        </div>
      </div>

      {/* Resize handles - similar to Box component */}
      {isSelected && (
        <>
          {/* Corner handles */}
          <div
            style={{
              position: 'absolute',
              top: formPosition.y - 4,
              left: formPosition.x - 4,
              width: 8,
              height: 8,
              background: 'white',
              border: '2px solid #1890ff',
              borderRadius: '2px',
              cursor: 'nw-resize',
              zIndex: 10001,
              pointerEvents: 'auto'
            }}
            onMouseDown={(e) => handleResizeStart(e, 'nw')}
            title="Resize"
          />
          <div
            style={{
              position: 'absolute',
              top: formPosition.y - 4,
              left: formPosition.x + formPosition.width - 4,
              width: 8,
              height: 8,
              background: 'white',
              border: '2px solid #1890ff',
              borderRadius: '2px',
              cursor: 'ne-resize',
              zIndex: 10001,
              pointerEvents: 'auto'
            }}
            onMouseDown={(e) => handleResizeStart(e, 'ne')}
            title="Resize"
          />
          <div
            style={{
              position: 'absolute',
              top: formPosition.y + formPosition.height - 4,
              left: formPosition.x - 4,
              width: 8,
              height: 8,
              background: 'white',
              border: '2px solid #1890ff',
              borderRadius: '2px',
              cursor: 'sw-resize',
              zIndex: 10001,
              pointerEvents: 'auto'
            }}
            onMouseDown={(e) => handleResizeStart(e, 'sw')}
            title="Resize"
          />
          <div
            style={{
              position: 'absolute',
              top: formPosition.y + formPosition.height - 4,
              left: formPosition.x + formPosition.width - 4,
              width: 8,
              height: 8,
              background: 'white',
              border: '2px solid #1890ff',
              borderRadius: '2px',
              cursor: 'se-resize',
              zIndex: 10001,
              pointerEvents: 'auto'
            }}
            onMouseDown={(e) => handleResizeStart(e, 'se')}
            title="Resize"
          />

          {/* Edge resize handles - beautiful semi-transparent style */}
          {/* Top edge */}
          <div
            style={{
              position: 'absolute',
              top: formPosition.y - 4,
              left: formPosition.x + formPosition.width / 2 - 10,
              width: 20,
              height: 8,
              background: 'rgba(24, 144, 255, 0.3)',
              cursor: 'n-resize',
              zIndex: 9999,
              borderRadius: '4px',
              pointerEvents: 'auto'
            }}
            onMouseDown={(e) => handleResizeStart(e, 'n')}
            title="Resize height"
          />

          {/* Bottom edge */}
          <div
            style={{
              position: 'absolute',
              top: formPosition.y + formPosition.height - 4,
              left: formPosition.x + formPosition.width / 2 - 10,
              width: 20,
              height: 8,
              background: 'rgba(24, 144, 255, 0.3)',
              cursor: 's-resize',
              zIndex: 9999,
              borderRadius: '4px',
              pointerEvents: 'auto'
            }}
            onMouseDown={(e) => handleResizeStart(e, 's')}
            title="Resize height"
          />

          {/* Left edge */}
          <div
            style={{
              position: 'absolute',
              top: formPosition.y + formPosition.height / 2 - 10,
              left: formPosition.x - 4,
              width: 8,
              height: 20,
              background: 'rgba(24, 144, 255, 0.3)',
              cursor: 'w-resize',
              zIndex: 9999,
              borderRadius: '4px',
              pointerEvents: 'auto'
            }}
            onMouseDown={(e) => handleResizeStart(e, 'w')}
            title="Resize width"
          />

          {/* Right edge */}
          <div
            style={{
              position: 'absolute',
              top: formPosition.y + formPosition.height / 2 - 10,
              left: formPosition.x + formPosition.width - 4,
              width: 8,
              height: 20,
              background: 'rgba(24, 144, 255, 0.3)',
              cursor: 'e-resize',
              zIndex: 9999,
              borderRadius: '4px',
              pointerEvents: 'auto'
            }}
            onMouseDown={(e) => handleResizeStart(e, 'e')}
            title="Resize width"
          />
        </>
      )}
    </div>,
    document.body
  );
};

// Drop area component
export const FormInputDropArea = ({ children }) => {
  const dropRef = useRef(null);
  
  const { connectors } = useNode((node) => ({
    connectors: node.connectors
  }));

  useEffect(() => {
    if (dropRef.current && connectors?.connect && connectors?.drag) {
      try {
        const element = dropRef.current;
        connectors.connect(connectors.drag(element));
        
        return () => {
          // Cleanup is handled by Craft.js automatically
        };
      } catch (error) {
        console.warn('Error connecting drop area:', error);
      }
    }
  }, [connectors]);

  const handleEvent = useCallback((e) => {
    e.stopPropagation();
  }, []);

  const hasChildren = children && React.Children.count(children) > 0;

  return (
    <div
      ref={dropRef}
      style={{
        width: '100%',
        minHeight: '100px',
        border: !hasChildren ? '2px dashed #d9d9d9' : 'none',
        borderRadius: '4px',
        padding: !hasChildren ? '20px' : '0',
        display: 'flex',
        flexDirection: 'column',
        gap: '16px',
        position: 'relative'
      }}
      onClick={handleEvent}
      onMouseDown={handleEvent}
    >
      {!hasChildren && (
        <div style={{
          textAlign: 'center',
          color: '#999',
          fontSize: '14px',
          pointerEvents: 'none'
        }}>
          Drop input components here
        </div>
      )}
      {children}
    </div>
  );
};

// Data Preview Component
const FormDataPreview = ({ inputFields, formData }) => {
  const sampleData = useMemo(() => {
    const sample = {};
    
    inputFields.forEach(field => {
      // Use the actual value from the field if it exists
      const actualValue = field.value || formData[field.fieldName];
      
      if (actualValue !== undefined && actualValue !== '') {
        sample[field.fieldName] = actualValue;
      } else {
        // Generate sample data based on input type
        switch (field.inputType) {
          case 'email':
            sample[field.fieldName] = 'user@example.com';
            break;
          case 'tel':
            sample[field.fieldName] = '+1 (555) 123-4567';
            break;
          case 'number':
            sample[field.fieldName] = 42;
            break;
          case 'date':
            sample[field.fieldName] = '2024-01-15';
            break;
          case 'textarea':
            sample[field.fieldName] = 'Sample message text here...';
            break;
          default:
            sample[field.fieldName] = field.labelText?.toLowerCase().includes('name') ? 'John Doe' : 'Sample value';
        }
      }
    });
    
    sample.timestamp = new Date().toISOString();
    sample.formId = 'form_12345';
    
    return sample;
  }, [inputFields, formData]);

  if (inputFields.length === 0) {
    return null;
  }

  return (
    <Card 
      size="small" 
      title="📊 Data Structure Preview" 
      style={{ marginTop: 16 }}
      extra={
        <div style={{ display: 'flex', gap: 8 }}>
          <Tag color="blue">{Object.keys(sampleData).length} fields</Tag>
          <Tag color="green">
            {inputFields.filter(f => f.value && f.value !== '').length} filled
          </Tag>
        </div>
      }
    >
      <pre style={{ 
        margin: 0, 
        padding: 8, 
        fontSize: '11px',
        fontFamily: 'monospace',
        whiteSpace: 'pre-wrap',
        backgroundColor: '#f9f9f9',
        borderRadius: '4px',
        border: '1px solid #e8e8e8',
        maxHeight: '200px',
        overflowY: 'auto'
      }}>
        {JSON.stringify(sampleData, null, 2)}
      </pre>
    </Card>
  );
};

// Configuration Modal Component
const FormConfigModal = ({ 
  setProp,
  databases,
  createNewDatabase,
  inputFields,
  formTitle,
  formData,
  formDescription,
  submitButtonText,
  successMessage,
  databaseName,
  keyField,
  resetAfterSubmit,
  showSuccessMessage,
  redirectAfterSubmit,
  redirectUrl,
  linkStyles,
  submitButtonColor,
  submitButtonSize,
  submitButtonWidth,
  // Styling props
  position,
  top,
  left,
  right,
  bottom,
  zIndex,
  width,
  minWidth,
  maxWidth,
  height,
  minHeight,
  maxHeight,
  padding,
  paddingTop,
  paddingRight,
  paddingBottom,
  paddingLeft,
  margin,
  marginTop,
  marginRight,
  marginBottom,
  marginLeft,
  backgroundColor,
  backgroundImage,
  backgroundSize,
  backgroundPosition,
  backgroundRepeat,
  backgroundAttachment,
  border,
  borderTop,
  borderRight,
  borderBottom,
  borderLeft,
  borderRadius,
  borderTopLeftRadius,
  borderTopRightRadius,
  borderBottomLeftRadius,
  borderBottomRightRadius,
  borderColor,
  borderStyle,
  borderWidth,
  boxShadow,
  filter,
  backdropFilter,
  opacity,
  transform,
  transformOrigin,
  scale,
  rotate,
  translateX,
  translateY,
  skewX,
  skewY,
  transition,
  transitionProperty,
  transitionDuration,
  transitionTimingFunction,
  transitionDelay,
  display,
  flexDirection,
  justifyContent,
  alignItems,
  gap,
  flexWrap,
  overflow,
  overflowX,
  overflowY
}) => {
  const [activeTab, setActiveTab] = useState('general');
  const [newDatabaseName, setNewDatabaseName] = useState('');
  const [showCreateDatabase, setShowCreateDatabase] = useState(false);

  const handleCreateDatabase = useCallback(() => {
    if (newDatabaseName.trim()) {
      createNewDatabase(newDatabaseName.trim());
      setNewDatabaseName('');
      setShowCreateDatabase(false);
    }
  }, [newDatabaseName, createNewDatabase]);

  const tabItems = [
    {
      key: 'general',
      label: (
        <span>
          <FormOutlined />
          General
        </span>
      ),
      children: (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
          <div>
            <h4>Form Information</h4>
            
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', marginBottom: 8, fontWeight: 500 }}>
                Form Title
              </label>
              <Input
                value={formTitle}
                onChange={(e) => setProp(props => props.formTitle = e.target.value)}
                placeholder="Enter form title"
              />
            </div>

            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', marginBottom: 8, fontWeight: 500 }}>
                Form Description
              </label>
              <Input.TextArea
                value={formDescription}
                onChange={(e) => setProp(props => props.formDescription = e.target.value)}
                placeholder="Enter form description"
                rows={3}
              />
            </div>

            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', marginBottom: 8, fontWeight: 500 }}>
                Submit Button Text
              </label>
              <Input
                value={submitButtonText}
                onChange={(e) => setProp(props => props.submitButtonText = e.target.value)}
                placeholder="Submit"
              />
            </div>

            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', marginBottom: 8, fontWeight: 500 }}>
                Success Message
              </label>
              <Input
                value={successMessage}
                onChange={(e) => setProp(props => props.successMessage = e.target.value)}
                placeholder="Form submitted successfully!"
              />
            </div>
          </div>

          <div>
            <h4>Form Fields ({inputFields.length})</h4>
            
            {inputFields.length === 0 ? (
              <Alert
                message="No input fields found"
                description="Add input components inside this form to see them here."
                type="info"
                showIcon
              />
            ) : (
              <div style={{ maxHeight: 400, overflowY: 'auto' }}>
                {inputFields.map(field => (
                  <Card key={`${field.id}-${field.lastUpdated}`} size="small" style={{ marginBottom: 8 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <Text strong>{field.labelText}</Text>
                        <br />
                        <Text type="secondary" style={{ fontSize: '12px' }}>
                          {field.inputType} {field.required && <Tag size="small" color="red">Required</Tag>}
                        </Text>
                      </div>
                      <Text code style={{ fontSize: '11px' }}>
                        {field.fieldName}
                      </Text>
                    </div>
                  </Card>
                ))}
                
                {/* Data Preview in Modal */}
                <FormDataPreview 
                  inputFields={inputFields}
                  formData={formData || {}}
                />
              </div>
            )}
          </div>
        </div>
      ),
    },
    {
      key: 'database',
      label: (
        <span>
          <DatabaseOutlined />
          Database
        </span>
      ),
      children: (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
          <div>
            <h4>Database Configuration</h4>
            
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', marginBottom: 8, fontWeight: 500 }}>
                Select Database
              </label>
              <Select
                style={{ width: '100%' }}
                value={databaseName}
                onChange={(value) => setProp(props => props.databaseName = value)}
                placeholder="Select a database"
                dropdownRender={(menu) => (
                  <>
                    {menu}
                    <Divider style={{ margin: '8px 0' }} />
                    <div style={{ padding: '0 8px 4px' }}>
                      <Button
                        type="text"
                        icon={<PlusOutlined />}
                        onClick={() => setShowCreateDatabase(true)}
                        style={{ width: '100%' }}
                      >
                        Create New Database
                      </Button>
                    </div>
                  </>
                )}
              >
                {databases.map(db => (
                  <Select.Option key={db.id} value={db.id}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <DatabaseOutlined />
                      {db.name}
                    </div>
                  </Select.Option>
                ))}
              </Select>
            </div>

            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', marginBottom: 8, fontWeight: 500 }}>
                Key Field
              </label>
              <Select
                style={{ width: '100%' }}
                value={keyField}
                onChange={(value) => setProp(props => props.keyField = value)}
                placeholder="Select a field to use as key"
                allowClear
              >
                {inputFields.map(field => (
                  <Select.Option key={field.fieldName} value={field.fieldName}>
                    {field.labelText} ({field.fieldName})
                  </Select.Option>
                ))}
              </Select>
            </div>

            {showCreateDatabase && (
              <Card size="small" style={{ backgroundColor: '#f8f9fa' }}>
                <div style={{ marginBottom: 12 }}>
                  <Text strong>Create New Database</Text>
                </div>
                <Input
                  value={newDatabaseName}
                  onChange={(e) => setNewDatabaseName(e.target.value)}
                  placeholder="Enter database name"
                  onPressEnter={handleCreateDatabase}
                />
                <div style={{ marginTop: 8, display: 'flex', gap: 8 }}>
                  <Button size="small" type="primary" onClick={handleCreateDatabase}>
                    Create
                  </Button>
                  <Button size="small" onClick={() => setShowCreateDatabase(false)}>
                    Cancel
                  </Button>
                </div>
              </Card>
            )}
          </div>

          <div>
            <h4>Form Behavior</h4>
            
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Switch
                  checked={resetAfterSubmit}
                  onChange={(checked) => setProp(props => props.resetAfterSubmit = checked)}
                />
                Reset form after submit
              </label>
            </div>

            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Switch
                  checked={showSuccessMessage}
                  onChange={(checked) => setProp(props => props.showSuccessMessage = checked)}
                />
                Show success message
              </label>
            </div>

            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Switch
                  checked={redirectAfterSubmit}
                  onChange={(checked) => setProp(props => props.redirectAfterSubmit = checked)}
                />
                Redirect after submit
              </label>
            </div>

            {redirectAfterSubmit && (
              <div style={{ marginBottom: 16 }}>
                <label style={{ display: 'block', marginBottom: 8, fontWeight: 500 }}>
                  Redirect URL
                </label>
                <Input
                  value={redirectUrl}
                  onChange={(e) => setProp(props => props.redirectUrl = e.target.value)}
                  placeholder="https://example.com/thank-you"
                />
              </div>
            )}

            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Switch
                  checked={linkStyles}
                  onChange={(checked) => setProp(props => props.linkStyles = checked)}
                />
                Link Input Styles
              </label>
            </div>
          </div>
        </div>
      ),
    },
    {
      key: 'button',
      label: (
        <span>
          <BorderOuterOutlined />
          Button
        </span>
      ),
      children: (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
          <div>
            <h4>Submit Button Styling</h4>
            
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', marginBottom: 8, fontWeight: 500 }}>
                Button Color
              </label>
              <ColorPicker
                value={submitButtonColor}
                onChange={(color) => setProp(props => props.submitButtonColor = color.toHexString())}
                showText
                style={{ width: '100%' }}
              />
            </div>

            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', marginBottom: 8, fontWeight: 500 }}>
                Button Size
              </label>
              <Select
                style={{ width: '100%' }}
                value={submitButtonSize}
                onChange={(value) => setProp(props => props.submitButtonSize = value)}
              >
                <Select.Option value="small">Small</Select.Option>
                <Select.Option value="middle">Medium</Select.Option>
                <Select.Option value="large">Large</Select.Option>
              </Select>
            </div>

            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', marginBottom: 8, fontWeight: 500 }}>
                Button Width
              </label>
              <Select
                style={{ width: '100%' }}
                value={submitButtonWidth}
                onChange={(value) => setProp(props => props.submitButtonWidth = value)}
              >
                <Select.Option value="auto">Auto</Select.Option>
                <Select.Option value="50%">50%</Select.Option>
                <Select.Option value="100%">Full Width</Select.Option>
              </Select>
            </div>
          </div>

          <div>
            <h4>Form Preview</h4>
            
            <Card size="small">
              <Text strong>Current Configuration:</Text>
              <div style={{ marginTop: 8, fontSize: '12px' }}>
                <div>📝 Fields: {inputFields.length}</div>
                <div>🗄️ Database: {databaseName || 'Not set'}</div>
                <div>🔑 Key Field: {keyField || 'Auto-generated'}</div>
                <div>✅ Submit enabled: {databaseName && inputFields.length > 0 ? 'Yes' : 'No'}</div>
              </div>
            </Card>
          </div>
        </div>
      ),
    },
    
  ];

  return (
    <div style={{ height: '70vh' }}>
      <Tabs
        activeKey={activeTab}
        onChange={setActiveTab}
        items={tabItems}
        style={{ height: '100%' }}
        tabBarStyle={{ marginBottom: 24 }}
      />
    </div>
  );
};

// Craft.js configuration
Form.craft = {
  displayName: 'Form',
  props: {
    // Form Configuration
    formTitle: "Contact Form",
    formDescription: "Please fill out the form below",
    submitButtonText: "Submit",
    successMessage: "Form submitted successfully!",
    
    // Database Configuration
    databaseName: "",
    keyField: "",
    
    // Form Behavior
    resetAfterSubmit: true,
    showSuccessMessage: true,
    redirectAfterSubmit: false,
    redirectUrl: "",
    linkStyles: false,
    
    // Layout & Position
    position: "relative",
    top: "auto",
    left: "auto",
    right: "auto",
    bottom: "auto",
    zIndex: "auto",
    
    // Size & Spacing
    width: "100%",
    minWidth: "auto", 
    maxWidth: "600px",
    height: "auto",
    minHeight: "auto",
    maxHeight: "none",
    padding: "24px",
    paddingTop: "",
    paddingRight: "",
    paddingBottom: "",
    paddingLeft: "",
    margin: "0",
    marginTop: "",
    marginRight: "",
    marginBottom: "",
    marginLeft: "",
    
    // Background
    backgroundColor: "#ffffff",
    backgroundImage: "",
    backgroundSize: "cover",
    backgroundPosition: "center",
    backgroundRepeat: "no-repeat",
    backgroundAttachment: "scroll",
    
    // Border
    border: "1px solid #e8e8e8",
    borderTop: "",
    borderRight: "",
    borderBottom: "",
    borderLeft: "",
    borderRadius: "8px",
    borderTopLeftRadius: "",
    borderTopRightRadius: "",
    borderBottomLeftRadius: "",
    borderBottomRightRadius: "",
    borderColor: "#e8e8e8",
    borderStyle: "solid",
    borderWidth: "1px",
    
    // Shadow & Effects
    boxShadow: "0 4px 12px rgba(0, 0, 0, 0.1)",
    filter: "none",
    backdropFilter: "none",
    opacity: 1,
    
    // Transform
    transform: "none",
    transformOrigin: "center",
    scale: 1,
    rotate: 0,
    translateX: 0,
    translateY: 0,
    skewX: 0,
    skewY: 0,
    
    // Transition
    transition: "all 0.3s ease",
    transitionProperty: "all",
    transitionDuration: "0.3s",
    transitionTimingFunction: "ease",
    transitionDelay: "0s",
    
    // Layout
    display: "block",
    flexDirection: "column",
    justifyContent: "flex-start",
    alignItems: "stretch",
    gap: "0px",
    flexWrap: "nowrap",
    overflow: "visible",
    overflowX: "visible",
    overflowY: "visible",
    
    // Submit Button Styling
    submitButtonColor: "#1890ff",
    submitButtonSize: "large",
    submitButtonWidth: "100%",
    
    // Additional
    className: ""
  },
  rules: {
    canDrag: () => true,
    canDrop: () => true,
    canMoveIn: (incoming, self, helpers) => {
      // Only allow moving in FormInput components
      if (!incoming) return false;
      const nodes = Array.isArray(incoming) ? incoming : [incoming];
      return nodes.every(node => {
        const type = helpers && helpers.getNodeType ? helpers.getNodeType(node) : node.data?.type;
        return (
          type?.craft?.displayName === 'FormInput' ||
          type?.displayName === 'FormInput' ||
          (typeof type === 'function' && type.name === 'FormInput') ||
          type?.resolvedName === 'FormInput'
        );
      });
    },
    canMoveOut: () => true,
  },
  related: {
    settings: FormConfigModal
  }
};

FormInputDropArea.craft = {
  displayName: 'InputDropArea',
  props: {},
  rules: {
    canDrag: () => false,
    canDrop: (incoming, self, helpers) => true,
    canMoveIn: (incoming, self, helpers) => {
      // Only allow moving in FormInput components
      if (!incoming) return false;
      const nodes = Array.isArray(incoming) ? incoming : [incoming];
      return nodes.every(node => {
        const type = helpers && helpers.getNodeType ? helpers.getNodeType(node) : node.data?.type;
        return (
          type?.craft?.displayName === 'FormInput' ||
          type?.displayName === 'FormInput' ||
          (typeof type === 'function' && type.name === 'FormInput') ||
          type?.resolvedName === 'FormInput'
        );
      });
    },
    canMoveOut: () => true,
  }
};