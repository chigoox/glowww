'use client'

import { EditOutlined, UploadOutlined, CalendarOutlined, ClockCircleOutlined } from '@ant-design/icons';
import { Element, useNode } from "@craftjs/core";
import { createPortal } from 'react-dom';
import { useState, useEffect, useRef } from "react";
import ContextMenu from "../support/ContextMenu";
import { useContextMenu } from "../support/useContextMenu";
import useEditorDisplay from "../support/useEditorDisplay";
import { 
  Button, 
  ColorPicker, 
  Input as AntInput, 
  Modal, 
  Select, 
  Slider, 
  Switch, 
  Upload, 
  InputNumber,
  DatePicker,
  TimePicker,
  Checkbox,
  Radio,
  Rate,
  Mentions,
  AutoComplete,
  TreeSelect,
  Cascader,
  Transfer,
  Tabs,
  Form,
  Space,
  Divider
} from "antd";
import { FlexBox } from "./FlexBox";
import { Text } from "./Text";

export const FormInput = ({
    // Input properties
    inputType = "text",
    placeholder = "Enter value...",
    inputValue = '',
    required = false,
    disabled = false,
    readOnly = false,
    
    // Custom options for select, radio, etc.
    customOptions = [
        { label: 'Option 1', value: 'option1' },
        { label: 'Option 2', value: 'option2' },
        { label: 'Option 3', value: 'option3' }
    ],
    
    // Tree data for TreeSelect
    treeData = [
        {
            title: 'Node1',
            value: 'node1',
            children: [
                { title: 'Child Node1', value: 'child1' },
                { title: 'Child Node2', value: 'child2' }
            ]
        },
        { title: 'Node2', value: 'node2' }
    ],
    
    // Cascader options
    cascaderOptions = [
        {
            value: 'category1',
            label: 'Category 1',
            children: [
                { value: 'subcategory1', label: 'Subcategory 1' },
                { value: 'subcategory2', label: 'Subcategory 2' }
            ]
        },
        { value: 'category2', label: 'Category 2' }
    ],
    
    // Transfer data
    transferData = [
        { key: 'item1', title: 'Item 1' },
        { key: 'item2', title: 'Item 2' },
        { key: 'item3', title: 'Item 3' }
    ],
    
    // Mentions options
    mentionsOptions = [
        { value: 'user1', label: 'User 1' },
        { value: 'user2', label: 'User 2' },
        { value: 'user3', label: 'User 3' }
    ],
    
    // Range settings
    rangeMin = 0,
    rangeMax = 100,
    rangeStep = 1,
    
    // Label properties
    labelText = "Label",
    showLabel = true,
    
    // Layout properties
    width = "100%",
    height = "auto",
    minWidth = 200,
    maxWidth,
    minHeight = 100,
    maxHeight,
    position = "relative",
    top,
    left,
    right,
    bottom,
    zIndex = 1,
    display = "flex",
    flexDirection = "column",
    gap = 8,
    padding = 16,
    margin = "10px 0",
    backgroundColor = "transparent",
    borderRadius = 8,
    
    // Input styling
    inputWidth = "100%",
    inputHeight = "40px",
    inputBackgroundColor = "#ffffff",
    inputBorderColor = "#d9d9d9",
    inputBorderRadius = "6px",
    inputFontSize = "14px",
    inputFontFamily = "Arial, sans-serif",
    inputPadding = "8px 12px",
    
    // Label styling
    labelFontSize = "14px",
    labelFontWeight = "500",
    labelColor = "#333333",
    labelFontFamily = "Arial, sans-serif",
    labelMarginBottom = "4px",
    
    // Focus styling
    focusBorderColor = "#1890ff",
    focusBoxShadow = "0 0 0 2px rgba(24, 144, 255, 0.2)",
    
    // Error styling
    errorBorderColor = "#ff4d4f",
    errorBoxShadow = "0 0 0 2px rgba(255, 77, 79, 0.2)",
    
    // Validation
    showError = false,
    errorMessage = "This field is required",
    
    className = "",
    elementId,
    title = "",
    children
}) => {
    const { connectors: { connect, drag }, actions: { setProp }, selected: isSelected, id: nodeId } = useNode((node) => ({
        selected: node.events.selected,
        id: node.id
    }));
    
    const { hideEditorUI } = useEditorDisplay();

    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [isFocused, setIsFocused] = useState(false);
    const [hasError, setHasError] = useState(false);
    const [isClient, setIsClient] = useState(false);
    const [isInputHovered, setIsInputHovered] = useState(false);
    const [inputPosition, setInputPosition] = useState({ top: 0, left: 0, width: 0, height: 0 });

    // Context menu functionality
    const { contextMenu, handleContextMenu, closeContextMenu } = useContextMenu();

    const inputRef = useRef(null);
    // Function to update input position for portal positioning
    const updateInputPosition = () => {
        if (inputRef.current) {
            // For Ant Design components, we need to get the actual DOM element
            const element = inputRef.current.input || inputRef.current.nativeElement || inputRef.current;
            if (element && element.getBoundingClientRect) {
                const rect = element.getBoundingClientRect();
                setInputPosition({
                    top: rect.top + window.scrollY,
                    left: rect.left + window.scrollX,
                    width: rect.width,
                    height: rect.height
                });
            }
        }
    };

    // Update input position when hovered or selected changes
    useEffect(() => {
        if (isInputHovered || isSelected) {
            // Defer position update to avoid render cycle issues
            const timer = setTimeout(() => updateInputPosition(), 0);
            
            // Update position on scroll and resize
            const handleScroll = () => updateInputPosition();
            const handleResize = () => updateInputPosition();
            
            window.addEventListener('scroll', handleScroll);
            window.addEventListener('resize', handleResize);
            
            return () => {
                clearTimeout(timer);
                window.removeEventListener('scroll', handleScroll);
                window.removeEventListener('resize', handleResize);
            };
        }
    }, [isInputHovered, isSelected]);

    // Set up client-side rendering check
    useEffect(() => {
        setIsClient(true);
    }, []);

    const inputTypeOptions = [
        // Basic Text Inputs
        { label: "Text", value: "text" },
        { label: "Email", value: "email" },
        { label: "Password", value: "password" },
        { label: "Search", value: "search" },
        { label: "URL", value: "url" },
        { label: "Tel", value: "tel" },
        { label: "Textarea", value: "textarea" },
        
        // Number Inputs
        { label: "Number", value: "number" },
        { label: "Range (Slider)", value: "range" },
        
        // Date & Time Inputs
        { label: "Date", value: "date" },
        { label: "Time", value: "time" },
        { label: "DateTime", value: "datetime" },
        { label: "Month", value: "month" },
        { label: "Week", value: "week" },
        
        // Selection Inputs
        { label: "Select Dropdown", value: "select" },
        { label: "Multi Select", value: "multiselect" },
        { label: "AutoComplete", value: "autocomplete" },
        { label: "TreeSelect", value: "treeselect" },
        { label: "Cascader", value: "cascader" },
        
        // Choice Inputs
        { label: "Checkbox", value: "checkbox" },
        { label: "Radio", value: "radio" },
        { label: "Switch", value: "switch" },
        { label: "Rate (Stars)", value: "rate" },
        
        // Advanced Inputs
        { label: "Color Picker", value: "color" },
        { label: "File Upload", value: "file" },
        { label: "Mentions", value: "mentions" },
        { label: "Transfer", value: "transfer" }
    ];

    // Get field name from label text (sanitized)
    const getFieldName = () => {
        return labelText.toLowerCase().replace(/[^a-z0-9]/g, '');
    };

    // Handle input change and notify parent form
    const handleInputChange = (e) => {
    const value = e.target ? e.target.value : e;
     // Update the Craft.js state 
        setProp(props => props.inputValue = value);
    
    // Basic validation
    if (required && !value.trim()) {
        setHasError(true);
    } else {
        setHasError(false);
    }
};

    // Handle focus
    const handleFocus = () => {
        setIsFocused(true);
    };

    // Handle blur
    const handleBlur = () => {
        setIsFocused(false);
        if (required && !inputValue.trim()) {
            setHasError(true);
        }
    };

    // Get input styles based on state
    const getInputStyles = () => {
        let borderColor = inputBorderColor;
        let boxShadow = 'none';

        if (hasError || showError) {
            borderColor = errorBorderColor;
            boxShadow = errorBoxShadow;
        } else if (isFocused) {
            borderColor = focusBorderColor;
            boxShadow = focusBoxShadow;
        }

        return {
            width: inputWidth,
            height: inputHeight,
            backgroundColor: inputBackgroundColor,
            borderColor,
            borderRadius: inputBorderRadius,
            fontSize: inputFontSize,
            fontFamily: inputFontFamily,
            padding: inputPadding,
            boxShadow,
            transition: 'all 0.2s ease-in-out'
        };
    };




    // Render the appropriate input based on type
    const renderInput = () => {
        const inputStyles = getInputStyles();
        
        // Common props for all input types
        const commonProps = {
            ref: inputRef,
            placeholder,
            disabled,
            value: inputValue,
            onChange: handleInputChange,
            onFocus: hideEditorUI ? undefined : handleFocus,
            onBlur: hideEditorUI ? undefined : handleBlur,
            style: {
                ...inputStyles,
                outline: isSelected && !hideEditorUI ? '2px solid #1890ff' : 'none',
                outlineOffset: '2px',
                position: 'relative'
            },
            status: (hasError || showError) ? 'error' : undefined,
            onMouseEnter: hideEditorUI ? undefined : () => setTimeout(() => setIsInputHovered(true), 0),
            onMouseLeave: hideEditorUI ? undefined : () => setTimeout(() => setIsInputHovered(false), 0),
            onContextMenu: hideEditorUI ? undefined : handleContextMenu,
            onClick: hideEditorUI ? undefined : (e) => {
                e.stopPropagation();
                // Defer position update to avoid render cycle issues
                setTimeout(() => updateInputPosition(), 0);
            }
        };

        // Sample data for complex components
        const selectOptions = customOptions;
        const treeSelectData = treeData;
        const cascaderSelectOptions = cascaderOptions;

        switch (inputType) {
            case 'textarea':
                return (
                    <AntInput.TextArea
                        {...commonProps}
                        rows={4}
                        style={{
                            ...inputStyles,
                            height: 'auto',
                            minHeight: inputHeight
                        }}
                    />
                );

            case 'color':
                return (
                    <ColorPicker
                        value={inputValue || '#000000'}
                        onChange={(color) => handleInputChange(color.toHexString())}
                        disabled={disabled}
                        style={{
                            width: inputWidth,
                            height: inputHeight
                        }}
                        showText
                    />
                );

            case 'range':
                return (
                    <div style={{ width: inputWidth }}>                    <Slider
                        min={rangeMin}
                        max={rangeMax}
                        step={rangeStep}
                        value={parseInt(inputValue) || ((rangeMin + rangeMax) / 2)}
                        onChange={(value) => handleInputChange(value.toString())}
                        disabled={disabled}
                        style={{ width: '100%' }}
                    />
                        <div style={{
                            textAlign: 'center',
                            fontSize: '12px',
                            color: '#666',
                            marginTop: '4px'
                        }}>
                            {inputValue || ((rangeMin + rangeMax) / 2)}
                        </div>
                    </div>
                );

            case 'date':
                return (
                    <DatePicker
                        placeholder={placeholder}
                        disabled={disabled}
                        onChange={(date, dateString) => handleInputChange(dateString)}
                        style={{
                            ...inputStyles,
                            width: inputWidth
                        }}
                        status={(hasError || showError) ? 'error' : undefined}
                    />
                );

            case 'time':
                return (
                    <TimePicker
                        placeholder={placeholder}
                        disabled={disabled}
                        onChange={(time, timeString) => handleInputChange(timeString)}
                        style={{
                            ...inputStyles,
                            width: inputWidth
                        }}
                        status={(hasError || showError) ? 'error' : undefined}
                    />
                );

            case 'datetime':
                return (
                    <DatePicker
                        showTime
                        placeholder={placeholder}
                        disabled={disabled}
                        onChange={(date, dateString) => handleInputChange(dateString)}
                        style={{
                            ...inputStyles,
                            width: inputWidth
                        }}
                        status={(hasError || showError) ? 'error' : undefined}
                    />
                );

            case 'month':
                return (
                    <DatePicker
                        picker="month"
                        placeholder={placeholder}
                        disabled={disabled}
                        onChange={(date, dateString) => handleInputChange(dateString)}
                        style={{
                            ...inputStyles,
                            width: inputWidth
                        }}
                        status={(hasError || showError) ? 'error' : undefined}
                    />
                );

            case 'week':
                return (
                    <DatePicker
                        picker="week"
                        placeholder={placeholder}
                        disabled={disabled}
                        onChange={(date, dateString) => handleInputChange(dateString)}
                        style={{
                            ...inputStyles,
                            width: inputWidth
                        }}
                        status={(hasError || showError) ? 'error' : undefined}
                    />
                );

            case 'select':
                return (
                    <Select
                        placeholder={placeholder}
                        disabled={disabled}
                        value={inputValue || undefined}
                        onChange={(value) => handleInputChange(value)}
                        options={selectOptions}
                        style={{
                            ...inputStyles,
                            width: inputWidth
                        }}
                        status={(hasError || showError) ? 'error' : undefined}
                    />
                );

            case 'multiselect':
                return (
                    <Select
                        mode="multiple"
                        placeholder={placeholder}
                        disabled={disabled}
                        value={inputValue ? inputValue.split(',') : []}
                        onChange={(values) => handleInputChange(values.join(','))}
                        options={selectOptions}
                        style={{
                            ...inputStyles,
                            width: inputWidth
                        }}
                        status={(hasError || showError) ? 'error' : undefined}
                    />
                );

            case 'autocomplete':
                return (
                    <AutoComplete
                        placeholder={placeholder}
                        disabled={disabled}
                        value={inputValue}
                        onChange={handleInputChange}
                        options={selectOptions}
                        style={{
                            ...inputStyles,
                            width: inputWidth
                        }}
                        status={(hasError || showError) ? 'error' : undefined}
                    />
                );

            case 'treeselect':
                return (
                    <TreeSelect
                        placeholder={placeholder}
                        disabled={disabled}
                        value={inputValue || undefined}
                        onChange={(value) => handleInputChange(value)}
                        treeData={treeSelectData}
                        style={{
                            ...inputStyles,
                            width: inputWidth
                        }}
                        status={(hasError || showError) ? 'error' : undefined}
                    />
                );

            case 'cascader':
                return (
                    <Cascader
                        placeholder={placeholder}
                        disabled={disabled}
                        value={inputValue ? inputValue.split(',') : []}
                        onChange={(values) => handleInputChange(values?.join(',') || '')}
                        options={cascaderSelectOptions}
                        style={{
                            ...inputStyles,
                            width: inputWidth
                        }}
                        status={(hasError || showError) ? 'error' : undefined}
                    />
                );

            case 'checkbox':
                return (
                    <Checkbox
                        disabled={disabled}
                        checked={inputValue === 'true' || inputValue === true}
                        onChange={(e) => handleInputChange(e.target.checked.toString())}
                        style={{
                            fontSize: inputStyles.fontSize,
                            fontFamily: inputStyles.fontFamily
                        }}
                    >
                        {placeholder || labelText}
                    </Checkbox>
                );

            case 'radio':
                return (
                    <Radio.Group
                        disabled={disabled}
                        value={inputValue}
                        onChange={(e) => handleInputChange(e.target.value)}
                        style={{
                            fontSize: inputStyles.fontSize,
                            fontFamily: inputStyles.fontFamily
                        }}
                    >
                        {customOptions.map((option, index) => (
                            <Radio key={index} value={option.value}>
                                {option.label}
                            </Radio>
                        ))}
                    </Radio.Group>
                );

            case 'switch':
                return (
                    <Switch
                        disabled={disabled}
                        checked={inputValue === 'true' || inputValue === true}
                        onChange={(checked) => handleInputChange(checked.toString())}
                        checkedChildren="ON"
                        unCheckedChildren="OFF"
                    />
                );

            case 'rate':
                return (
                    <Rate
                        disabled={disabled}
                        value={parseFloat(inputValue) || 0}
                        onChange={(value) => handleInputChange(value.toString())}
                        style={{
                            fontSize: inputStyles.fontSize
                        }}
                    />
                );

            case 'mentions':
                return (
                    <Mentions
                        placeholder={placeholder}
                        disabled={disabled}
                        value={inputValue}
                        onChange={handleInputChange}
                        options={mentionsOptions}
                        style={{
                            ...inputStyles,
                            width: inputWidth
                        }}
                        status={(hasError || showError) ? 'error' : undefined}
                    />
                );

            case 'transfer':
                return (
                    <Transfer
                        dataSource={transferData}
                        targetKeys={inputValue ? inputValue.split(',') : []}
                        onChange={(targetKeys) => handleInputChange(targetKeys.join(','))}
                        render={(item) => item.title}
                        disabled={disabled}
                        style={{ width: inputWidth }}
                    />
                );

            case 'file':
                return (
                    <Upload
                        beforeUpload={() => false}
                        onChange={(info) => {
                            if (info.file) {
                                handleInputChange(info.file.name);
                            }
                        }}
                        disabled={disabled}
                        style={{ width: inputWidth }}
                    >
                        <Button 
                            icon={<UploadOutlined />} 
                            disabled={disabled}
                            style={{
                                width: inputWidth,
                                height: inputHeight,
                                ...inputStyles
                            }}
                        >
                            {inputValue || 'Choose File'}
                        </Button>
                    </Upload>
                );

            case 'password':
                return (
                    <AntInput.Password
                        {...commonProps}
                    />
                );

            case 'number':
                return (
                    <InputNumber
                        placeholder={placeholder}
                        disabled={disabled}
                        value={parseFloat(inputValue) || undefined}
                        onChange={(value) => handleInputChange(value?.toString() || '')}
                        onFocus={handleFocus}
                        onBlur={handleBlur}
                        style={{
                            ...inputStyles,
                            width: inputWidth
                        }}
                        status={(hasError || showError) ? 'error' : undefined}
                    />
                );

            default:
                return (
                    <AntInput
                        type={inputType}
                        {...commonProps}
                    />
                );
        }
    };

    return (
        <>
            <FlexBox
                ref={(ref) => {
                    if (ref && connect) {
                        connect(ref); // Connect for Craft.js selection
                    }
                }}
                width={width}
                height={height}
                display={display}
                flexDirection={flexDirection}
                gap={gap}
                padding={padding}
                backgroundColor={backgroundColor}
                borderRadius={borderRadius}
                className={`${className} form-input`}
                style={{
                    position: position,
                    top: top,
                    left: left,
                    right: right,
                    bottom: bottom,
                    zIndex: zIndex,
                    pointerEvents: 'auto',
                    userSelect: 'auto'
                }}
            >
                {/* Label */}
                {showLabel && (
                    <Element
                        id={`label-${elementId || nodeId}`}
                        is={Text}
                        text={labelText + (required ? ' *' : '')}
                        fontSize={labelFontSize}
                        fontWeight={labelFontWeight}
                        color={labelColor}
                        fontFamily={labelFontFamily}
                        marginBottom={labelMarginBottom}
                        className="input-label"
                    />
                )}

                {/* Input */}
                <div style={{ width: '100%' }}>
                    {renderInput()}
                    
                    {/* Error Message */}
                    {(hasError || showError) && errorMessage && (
                        <div style={{
                            color: errorBorderColor,
                            fontSize: '12px',
                            marginTop: '4px',
                            fontFamily: inputFontFamily
                        }}>
                            {errorMessage}
                        </div>
                    )}
                </div>

                {children}
            </FlexBox>

            {/* Input Portal Controls - show when input is hovered or component is selected */}
            {(isInputHovered || isSelected) && !hideEditorUI && (
                <InputPortalControls
                    inputPosition={{...inputPosition, inputType}}
                    setIsEditModalOpen={setIsEditModalOpen}
                />
            )}

            {/* Edit Modal */}
            <Modal
                title="Configure Input Field"
                open={isEditModalOpen}
                onCancel={() => setIsEditModalOpen(false)}
                width={900}
                zIndex={999999}
                footer={[
                    <Button key="cancel" onClick={() => setIsEditModalOpen(false)}>
                        Cancel
                    </Button>,
                    <Button key="save" type="primary" onClick={() => setIsEditModalOpen(false)}>
                        Save Changes
                    </Button>
                ]}
            >
                <InputConfigModal setProp={setProp} {...{
                    inputType,
                    placeholder,
                    required,
                    disabled,
                    readOnly,
                    labelText,
                    showLabel,
                    inputWidth,
                    inputHeight,
                    inputBackgroundColor,
                    inputBorderColor,
                    inputBorderRadius,
                    inputFontSize,
                    inputFontFamily,
                    inputPadding,
                    labelFontSize,
                    labelFontWeight,
                    labelColor,
                    labelFontFamily,
                    labelMarginBottom,
                    focusBorderColor,
                    focusBoxShadow,
                    errorBorderColor,
                    errorBoxShadow,
                    errorMessage,
                    inputTypeOptions,
                    customOptions,
                    treeData,
                    cascaderOptions,
                    transferData,
                    mentionsOptions,
                    rangeMin,
                    rangeMax,
                    rangeStep
                }} />
            </Modal>
            
            {/* Context Menu */}
            <ContextMenu
                visible={contextMenu.visible}
                position={{ x: contextMenu.x, y: contextMenu.y }}
                onClose={closeContextMenu}
                targetNodeId={nodeId}
            />
        </>
    );
};

// Portal Controls Component - renders only the edit button
const InputPortalControls = ({ 
    inputPosition, 
    setIsEditModalOpen
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
            {/* Edit button only */}
            <div
                style={{
                    position: 'absolute',
                    top: inputPosition.top - 28,
                    left: inputPosition.left + inputPosition.width / 2,
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
                {/* EDIT button */}
                <div
                    style={{
                        background: '#722ed1',
                        color: 'white',
                        padding: '4px 8px',
                        borderRadius: '14px',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '2px',
                        minWidth: '48px',
                        justifyContent: 'center',
                        transition: 'background 0.2s ease'
                    }}
                    onClick={() => setIsEditModalOpen(true)}
                    title="Configure input field"
                >
                    ⚙️ EDIT
                </div>
            </div>
        </div>,
        document.body
    );
};

// Configuration Modal Component
const InputConfigModal = ({ 
    setProp, 
    inputType,
    placeholder,
    required,
    disabled,
    readOnly,
    labelText,
    showLabel,
    inputWidth,
    inputHeight,
    inputBackgroundColor,
    inputBorderColor,
    inputBorderRadius,
    inputFontSize,
    inputFontFamily,
    inputPadding,
    labelFontSize,
    labelFontWeight,
    labelColor,
    labelFontFamily,
    labelMarginBottom,
    focusBorderColor,
    focusBoxShadow,
    errorBorderColor,
    errorBoxShadow,
    errorMessage,
    inputTypeOptions,
    customOptions,
    treeData,
    cascaderOptions,
    transferData,
    mentionsOptions,
    rangeMin,
    rangeMax,
    rangeStep
}) => {
    const [activeTab, setActiveTab] = useState('general');
    const [localCustomOptions, setLocalCustomOptions] = useState(customOptions);
    const [localTreeData, setLocalTreeData] = useState(treeData);
    const [localCascaderOptions, setLocalCascaderOptions] = useState(cascaderOptions);
    const [localTransferData, setLocalTransferData] = useState(transferData);
    const [localMentionsOptions, setLocalMentionsOptions] = useState(mentionsOptions);

    const fontOptions = [
        { label: 'Arial', value: 'Arial, sans-serif' },
        { label: 'Helvetica', value: 'Helvetica, sans-serif' },
        { label: 'Times New Roman', value: 'Times New Roman, serif' },
        { label: 'Georgia', value: 'Georgia, serif' },
        { label: 'Courier New', value: 'Courier New, monospace' },
        { label: 'Verdana', value: 'Verdana, sans-serif' },
        { label: 'Trebuchet MS', value: 'Trebuchet MS, sans-serif' }
    ];

    const parsePixelValue = (value) => {
        if (typeof value === 'string' && value.endsWith('px')) {
            return parseInt(value.slice(0, -2)) || 0;
        }
        return parseInt(value) || 0;
    };

    // Save custom options to props
    const saveCustomOptions = () => {
        setProp(props => {
            props.customOptions = localCustomOptions;
            props.treeData = localTreeData;
            props.cascaderOptions = localCascaderOptions;
            props.transferData = localTransferData;
            props.mentionsOptions = localMentionsOptions;
        });
    };

    // Check if current input type supports custom options
    const supportsCustomOptions = () => {
        return ['select', 'multiselect', 'autocomplete', 'radio'].includes(inputType);
    };

    const supportsTreeData = () => {
        return inputType === 'treeselect';
    };

    const supportsCascaderOptions = () => {
        return inputType === 'cascader';
    };

    const supportsTransferData = () => {
        return inputType === 'transfer';
    };

    const supportsMentionsOptions = () => {
        return inputType === 'mentions';
    };

    const supportsRangeSettings = () => {
        return inputType === 'range' || inputType === 'number';
    };

    // Add new option
    const addCustomOption = () => {
        const newOption = { 
            label: `Option ${localCustomOptions.length + 1}`, 
            value: `option${localCustomOptions.length + 1}` 
        };
        setLocalCustomOptions([...localCustomOptions, newOption]);
    };

    // Remove option
    const removeCustomOption = (index) => {
        setLocalCustomOptions(localCustomOptions.filter((_, i) => i !== index));
    };

    // Update option
    const updateCustomOption = (index, field, value) => {
        const updated = [...localCustomOptions];
        updated[index][field] = value;
        setLocalCustomOptions(updated);
    };

    return (
        <div style={{ height: '60vh' }}>
            {/* Tab Navigation */}
            <div style={{ 
                display: 'flex', 
                borderBottom: '1px solid #e8e8e8', 
                marginBottom: 24,
                flexWrap: 'wrap'
            }}>
                {[
                    { key: 'general', label: '⚙️ General' },
                    { key: 'options', label: '📋 Options' },
                    { key: 'styling', label: '🎨 Styling' },
                    { key: 'validation', label: '✓ Validation' }
                ].map(tab => (
                    <Button
                        key={tab.key}
                        type={activeTab === tab.key ? 'primary' : 'default'}
                        onClick={() => setActiveTab(tab.key)}
                        style={{ 
                            marginRight: 8,
                            marginBottom: 8,
                            borderBottomLeftRadius: 0,
                            borderBottomRightRadius: 0
                        }}
                    >
                        {tab.label}
                    </Button>
                ))}
                
                {/* Save Options Button */}
                <Button
                    type="dashed"
                    onClick={saveCustomOptions}
                    style={{ 
                        marginLeft: 'auto',
                        marginBottom: 8
                    }}
                    disabled={!supportsCustomOptions() && !supportsTreeData() && !supportsCascaderOptions() && !supportsTransferData() && !supportsMentionsOptions()}
                >
                    💾 Save Options
                </Button>
            </div>

            <div style={{ height: 'calc(100% - 80px)', overflowY: 'auto', padding: '0 4px' }}>
                {/* General Tab */}
                {activeTab === 'general' && (
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
                        <div>
                            <h4 style={{ marginBottom: 16 }}>Input Settings</h4>
                            
                            <div style={{ marginBottom: 16 }}>
                                <label style={{ display: 'block', marginBottom: 8, fontWeight: 500 }}>
                                    Input Type
                                </label>
                                <Select
                                    style={{ width: '100%' }}
                                    value={inputType}
                                    onChange={(value) => setProp(props => props.inputType = value)}
                                    options={inputTypeOptions}
                                />
                            </div>

                            <div style={{ marginBottom: 16 }}>
                                <label style={{ display: 'block', marginBottom: 8, fontWeight: 500 }}>
                                    Placeholder
                                </label>
                                <AntInput
                                    value={placeholder}
                                    onChange={(e) => setProp(props => props.placeholder = e.target.value)}
                                />
                            </div>

                            <div style={{ marginBottom: 16 }}>
                                <label style={{ display: 'block', marginBottom: 8, fontWeight: 500 }}>
                                    Label Text
                                </label>
                                <AntInput
                                    value={labelText}
                                    onChange={(e) => setProp(props => props.labelText = e.target.value)}
                                />
                            </div>
                        </div>

                        <div>
                            <h4 style={{ marginBottom: 16 }}>Options</h4>
                            
                            <div style={{ marginBottom: 16 }}>
                                <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                    <Switch
                                        checked={showLabel}
                                        onChange={(checked) => setProp(props => props.showLabel = checked)}
                                    />
                                    Show Label
                                </label>
                            </div>

                            <div style={{ marginBottom: 16 }}>
                                <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                    <Switch
                                        checked={required}
                                        onChange={(checked) => setProp(props => props.required = checked)}
                                    />
                                    Required Field
                                </label>
                            </div>

                            <div style={{ marginBottom: 16 }}>
                                <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                    <Switch
                                        checked={disabled}
                                        onChange={(checked) => setProp(props => props.disabled = checked)}
                                    />
                                    Disabled
                                </label>
                            </div>

                            <div style={{ marginBottom: 16 }}>
                                <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                    <Switch
                                        checked={readOnly}
                                        onChange={(checked) => setProp(props => props.readOnly = checked)}
                                    />
                                    Read Only
                                </label>
                            </div>
                        </div>
                    </div>
                )}

                {/* Options Tab */}
                {activeTab === 'options' && (
                    <div style={{ maxHeight: '50vh', overflowY: 'auto' }}>
                        <Tabs defaultActiveKey="custom" type="card">
                            {/* Custom Options Tab */}
                            {supportsCustomOptions() && (
                                <Tabs.TabPane tab="📝 Custom Options" key="custom">
                                    <div style={{ marginBottom: 16 }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                                            <h4>Options for {inputType === 'radio' ? 'Radio Buttons' : 'Select/Dropdown'}</h4>
                                            <Button type="primary" size="small" onClick={addCustomOption}>
                                                + Add Option
                                            </Button>
                                        </div>
                                        
                                        {localCustomOptions.map((option, index) => (
                                            <div key={index} style={{ 
                                                display: 'flex', 
                                                gap: 8, 
                                                marginBottom: 8,
                                                padding: 12,
                                                border: '1px solid #e8e8e8',
                                                borderRadius: 6,
                                                backgroundColor: '#fafafa'
                                            }}>
                                                <div style={{ flex: 1 }}>
                                                    <AntInput
                                                        placeholder="Display Label"
                                                        value={option.label}
                                                        onChange={(e) => updateCustomOption(index, 'label', e.target.value)}
                                                        style={{ marginBottom: 4 }}
                                                    />
                                                    <AntInput
                                                        placeholder="Value"
                                                        value={option.value}
                                                        onChange={(e) => updateCustomOption(index, 'value', e.target.value)}
                                                    />
                                                </div>
                                                <Button 
                                                    danger 
                                                    size="small" 
                                                    onClick={() => removeCustomOption(index)}
                                                    disabled={localCustomOptions.length <= 1}
                                                >
                                                    🗑️
                                                </Button>
                                            </div>
                                        ))}
                                    </div>
                                </Tabs.TabPane>
                            )}

                            {/* Range Settings Tab */}
                            {supportsRangeSettings() && (
                                <Tabs.TabPane tab="📊 Range Settings" key="range">
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16 }}>
                                        <div>
                                            <label style={{ display: 'block', marginBottom: 8, fontWeight: 500 }}>
                                                Minimum Value
                                            </label>
                                            <InputNumber
                                                value={rangeMin}
                                                onChange={(value) => setProp(props => props.rangeMin = value)}
                                                style={{ width: '100%' }}
                                            />
                                        </div>
                                        <div>
                                            <label style={{ display: 'block', marginBottom: 8, fontWeight: 500 }}>
                                                Maximum Value
                                            </label>
                                            <InputNumber
                                                value={rangeMax}
                                                onChange={(value) => setProp(props => props.rangeMax = value)}
                                                style={{ width: '100%' }}
                                            />
                                        </div>
                                        <div>
                                            <label style={{ display: 'block', marginBottom: 8, fontWeight: 500 }}>
                                                Step Size
                                            </label>
                                            <InputNumber
                                                value={rangeStep}
                                                min={0.1}
                                                step={0.1}
                                                onChange={(value) => setProp(props => props.rangeStep = value)}
                                                style={{ width: '100%' }}
                                            />
                                        </div>
                                    </div>
                                </Tabs.TabPane>
                            )}

                            {/* Mentions Options Tab */}
                            {supportsMentionsOptions() && (
                                <Tabs.TabPane tab="@ Mentions" key="mentions">
                                    <div style={{ marginBottom: 16 }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                                            <h4>Mention Users/Items</h4>
                                            <Button type="primary" size="small" onClick={() => {
                                                const newMention = { 
                                                    value: `user${localMentionsOptions.length + 1}`, 
                                                    label: `User ${localMentionsOptions.length + 1}` 
                                                };
                                                setLocalMentionsOptions([...localMentionsOptions, newMention]);
                                            }}>
                                                + Add Mention
                                            </Button>
                                        </div>
                                        
                                        {localMentionsOptions.map((mention, index) => (
                                            <div key={index} style={{ 
                                                display: 'flex', 
                                                gap: 8, 
                                                marginBottom: 8,
                                                padding: 8,
                                                border: '1px solid #e8e8e8',
                                                borderRadius: 4
                                            }}>
                                                <AntInput
                                                    placeholder="@username"
                                                    value={mention.value}
                                                    onChange={(e) => {
                                                        const updated = [...localMentionsOptions];
                                                        updated[index].value = e.target.value;
                                                        setLocalMentionsOptions(updated);
                                                    }}
                                                />
                                                <AntInput
                                                    placeholder="Display Name"
                                                    value={mention.label}
                                                    onChange={(e) => {
                                                        const updated = [...localMentionsOptions];
                                                        updated[index].label = e.target.value;
                                                        setLocalMentionsOptions(updated);
                                                    }}
                                                />
                                                <Button 
                                                    danger 
                                                    size="small" 
                                                    onClick={() => setLocalMentionsOptions(localMentionsOptions.filter((_, i) => i !== index))}
                                                >
                                                    🗑️
                                                </Button>
                                            </div>
                                        ))}
                                    </div>
                                </Tabs.TabPane>
                            )}

                            {/* Transfer Data Tab */}
                            {supportsTransferData() && (
                                <Tabs.TabPane tab="⇄ Transfer Items" key="transfer">
                                    <div style={{ marginBottom: 16 }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                                            <h4>Available Transfer Items</h4>
                                            <Button type="primary" size="small" onClick={() => {
                                                const newItem = { 
                                                    key: `item${localTransferData.length + 1}`, 
                                                    title: `Item ${localTransferData.length + 1}` 
                                                };
                                                setLocalTransferData([...localTransferData, newItem]);
                                            }}>
                                                + Add Item
                                            </Button>
                                        </div>
                                        
                                        {localTransferData.map((item, index) => (
                                            <div key={index} style={{ 
                                                display: 'flex', 
                                                gap: 8, 
                                                marginBottom: 8,
                                                padding: 8,
                                                border: '1px solid #e8e8e8',
                                                borderRadius: 4
                                            }}>
                                                <AntInput
                                                    placeholder="Item Key"
                                                    value={item.key}
                                                    onChange={(e) => {
                                                        const updated = [...localTransferData];
                                                        updated[index].key = e.target.value;
                                                        setLocalTransferData(updated);
                                                    }}
                                                />
                                                <AntInput
                                                    placeholder="Item Title"
                                                    value={item.title}
                                                    onChange={(e) => {
                                                        const updated = [...localTransferData];
                                                        updated[index].title = e.target.value;
                                                        setLocalTransferData(updated);
                                                    }}
                                                />
                                                <Button 
                                                    danger 
                                                    size="small" 
                                                    onClick={() => setLocalTransferData(localTransferData.filter((_, i) => i !== index))}
                                                >
                                                    🗑️
                                                </Button>
                                            </div>
                                        ))}
                                    </div>
                                </Tabs.TabPane>
                            )}

                            {/* Default info if no options supported */}
                            {!supportsCustomOptions() && !supportsRangeSettings() && !supportsMentionsOptions() && !supportsTransferData() && !supportsTreeData() && !supportsCascaderOptions() && (
                                <Tabs.TabPane tab="ℹ️ Info" key="info">
                                    <div style={{ textAlign: 'center', padding: 40, color: '#666' }}>
                                        <h4>No Custom Options Available</h4>
                                        <p>The current input type "{inputType}" doesn't support custom options configuration.</p>
                                        <p>Try selecting input types like: Select, Radio, AutoComplete, Mentions, Transfer, etc.</p>
                                    </div>
                                </Tabs.TabPane>
                            )}
                        </Tabs>
                    </div>
                )}

                {/* Styling Tab */}
                {activeTab === 'styling' && (
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
                        <div>
                            <h4 style={{ marginBottom: 16 }}>Input Styling</h4>
                            
                            <div style={{ marginBottom: 16 }}>
                                <label style={{ display: 'block', marginBottom: 8, fontWeight: 500 }}>
                                    Height: {parsePixelValue(inputHeight)}px
                                </label>
                                <Slider
                                    min={32}
                                    max={80}
                                    value={parsePixelValue(inputHeight)}
                                    onChange={(value) => setProp(props => props.inputHeight = `${value}px`)}
                                />
                            </div>

                            <div style={{ marginBottom: 16 }}>
                                <label style={{ display: 'block', marginBottom: 8, fontWeight: 500 }}>
                                    Border Radius: {parsePixelValue(inputBorderRadius)}px
                                </label>
                                <Slider
                                    min={0}
                                    max={20}
                                    value={parsePixelValue(inputBorderRadius)}
                                    onChange={(value) => setProp(props => props.inputBorderRadius = `${value}px`)}
                                />
                            </div>

                            <div style={{ marginBottom: 16 }}>
                                <label style={{ display: 'block', marginBottom: 8, fontWeight: 500 }}>
                                    Font Size: {parsePixelValue(inputFontSize)}px
                                </label>
                                <Slider
                                    min={10}
                                    max={24}
                                    value={parsePixelValue(inputFontSize)}
                                    onChange={(value) => setProp(props => props.inputFontSize = `${value}px`)}
                                />
                            </div>

                            <div style={{ marginBottom: 16 }}>
                                <label style={{ display: 'block', marginBottom: 8, fontWeight: 500 }}>
                                    Font Family
                                </label>
                                <Select
                                    style={{ width: '100%' }}
                                    value={inputFontFamily}
                                    onChange={(value) => setProp(props => props.inputFontFamily = value)}
                                    options={fontOptions}
                                />
                            </div>
                        </div>

                        <div>
                            <h4 style={{ marginBottom: 16 }}>Label Styling</h4>
                            
                            <div style={{ marginBottom: 16 }}>
                                <label style={{ display: 'block', marginBottom: 8, fontWeight: 500 }}>
                                    Font Size: {parsePixelValue(labelFontSize)}px
                                </label>
                                <Slider
                                    min={10}
                                    max={24}
                                    value={parsePixelValue(labelFontSize)}
                                    onChange={(value) => setProp(props => props.labelFontSize = `${value}px`)}
                                />
                            </div>

                            <div style={{ marginBottom: 16 }}>
                                <label style={{ display: 'block', marginBottom: 8, fontWeight: 500 }}>
                                    Font Weight
                                </label>
                                <Select
                                    style={{ width: '100%' }}
                                    value={labelFontWeight}
                                    onChange={(value) => setProp(props => props.labelFontWeight = value)}
                                    options={[
                                        { label: 'Normal', value: 'normal' },
                                        { label: '500', value: '500' },
                                        { label: '600', value: '600' },
                                        { label: 'Bold', value: 'bold' }
                                    ]}
                                />
                            </div>

                            <div style={{ marginBottom: 16 }}>
                                <label style={{ display: 'block', marginBottom: 8, fontWeight: 500 }}>
                                    Label Color
                                </label>
                                <input
                                    type="color"
                                    value={labelColor}
                                    onChange={(e) => setProp(props => props.labelColor = e.target.value)}
                                    style={{ width: '100%', height: 40, border: '1px solid #d9d9d9', borderRadius: 6 }}
                                />
                            </div>

                            <div style={{ marginBottom: 16 }}>
                                <label style={{ display: 'block', marginBottom: 8, fontWeight: 500 }}>
                                    Font Family
                                </label>
                                <Select
                                    style={{ width: '100%' }}
                                    value={labelFontFamily}
                                    onChange={(value) => setProp(props => props.labelFontFamily = value)}
                                    options={fontOptions}
                                />
                            </div>
                        </div>
                    </div>
                )}

                {/* Validation Tab */}
                {activeTab === 'validation' && (
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
                        <div>
                            <h4 style={{ marginBottom: 16 }}>Error Message</h4>
                            
                            <div style={{ marginBottom: 16 }}>
                                <label style={{ display: 'block', marginBottom: 8, fontWeight: 500 }}>
                                    Error Text
                                </label>
                                <AntInput
                                    value={errorMessage}
                                    onChange={(e) => setProp(props => props.errorMessage = e.target.value)}
                                />
                            </div>

                            <div style={{ marginBottom: 16 }}>
                                <label style={{ display: 'block', marginBottom: 8, fontWeight: 500 }}>
                                    Error Border Color
                                </label>
                                <input
                                    type="color"
                                    value={errorBorderColor}
                                    onChange={(e) => setProp(props => props.errorBorderColor = e.target.value)}
                                    style={{ width: '100%', height: 40, border: '1px solid #d9d9d9', borderRadius: 6 }}
                                />
                            </div>
                        </div>

                        <div>
                            <h4 style={{ marginBottom: 16 }}>Focus Styling</h4>
                            
                            <div style={{ marginBottom: 16 }}>
                                <label style={{ display: 'block', marginBottom: 8, fontWeight: 500 }}>
                                    Focus Border Color
                                </label>
                                <input
                                    type="color"
                                    value={focusBorderColor}
                                    onChange={(e) => setProp(props => props.focusBorderColor = e.target.value)}
                                    style={{ width: '100%', height: 40, border: '1px solid #d9d9d9', borderRadius: 6 }}
                                />
                            </div>

                            <div style={{ marginBottom: 16 }}>
                                <label style={{ display: 'block', marginBottom: 8, fontWeight: 500 }}>
                                    Input Background
                                </label>
                                <input
                                    type="color"
                                    value={inputBackgroundColor}
                                    onChange={(e) => setProp(props => props.inputBackgroundColor = e.target.value)}
                                    style={{ width: '100%', height: 40, border: '1px solid #d9d9d9', borderRadius: 6 }}
                                />
                            </div>

                            <div style={{ marginBottom: 16 }}>
                                <label style={{ display: 'block', marginBottom: 8, fontWeight: 500 }}>
                                    Border Color
                                </label>
                                <input
                                    type="color"
                                    value={inputBorderColor}
                                    onChange={(e) => setProp(props => props.inputBorderColor = e.target.value)}
                                    style={{ width: '100%', height: 40, border: '1px solid #d9d9d9', borderRadius: 6 }}
                                />
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

// Craft.js configuration
FormInput.craft = {
    displayName: 'FormInput',
    props: {
        // Input properties
        inputType: "text",
        placeholder: "Enter value...",
        inputValue: '',
        required: false,
        disabled: false,
        readOnly: false,
        
        // Custom options for select, radio, etc.
        customOptions: [
            { label: 'Option 1', value: 'option1' },
            { label: 'Option 2', value: 'option2' },
            { label: 'Option 3', value: 'option3' }
        ],
        
        // Tree data for TreeSelect
        treeData: [
            {
                title: 'Node1',
                value: 'node1',
                children: [
                    { title: 'Child Node1', value: 'child1' },
                    { title: 'Child Node2', value: 'child2' }
                ]
            },
            { title: 'Node2', value: 'node2' }
        ],
        
        // Cascader options
        cascaderOptions: [
            {
                value: 'category1',
                label: 'Category 1',
                children: [
                    { value: 'subcategory1', label: 'Subcategory 1' },
                    { value: 'subcategory2', label: 'Subcategory 2' }
                ]
            },
            { value: 'category2', label: 'Category 2' }
        ],
        
        // Transfer data
        transferData: [
            { key: 'item1', title: 'Item 1' },
            { key: 'item2', title: 'Item 2' },
            { key: 'item3', title: 'Item 3' }
        ],
        
        // Mentions options
        mentionsOptions: [
            { value: 'user1', label: 'User 1' },
            { value: 'user2', label: 'User 2' },
            { value: 'user3', label: 'User 3' }
        ],
        
        // Range settings
        rangeMin: 0,
        rangeMax: 100,
        rangeStep: 1,
        
        // Label properties
        labelText: "Label",
        showLabel: true,
        
        // Layout properties
        width: "100%",
        height: "auto",
        minWidth: 200,
        maxWidth: undefined,
        minHeight: 100,
        maxHeight: undefined,
        position: "relative",
        top: undefined,
        left: undefined,
        right: undefined,
        bottom: undefined,
        zIndex: 1,
        display: "flex",
        flexDirection: "column",
        gap: 8,
        padding: 16,
        margin: "10px 0",
        backgroundColor: "transparent",
        borderRadius: 8,
        
        // Input styling
        inputWidth: "100%",
        inputHeight: "40px",
        inputBackgroundColor: "#ffffff",
        inputBorderColor: "#d9d9d9",
        inputBorderRadius: "6px",
        inputFontSize: "14px",
        inputFontFamily: "Arial, sans-serif",
        inputPadding: "8px 12px",
        
        // Label styling
        labelFontSize: "14px",
        labelFontWeight: "500",
        labelColor: "#333333",
        labelFontFamily: "Arial, sans-serif",
        labelMarginBottom: "4px",
        
        // Focus styling
        focusBorderColor: "#1890ff",
        focusBoxShadow: "0 0 0 2px rgba(24, 144, 255, 0.2)",
        
        // Error styling
        errorBorderColor: "#ff4d4f",
        errorBoxShadow: "0 0 0 2px rgba(255, 77, 79, 0.2)",
        
        // Validation
        showError: false,
        errorMessage: "This field is required",
        
        className: ""
    },
    rules: {
        canDrag: () => true,
       canDrop: (parentNode) => {
            // Only allow FormInput to be dropped inside Form components
            const parentType = parentNode.data.type;
            const parentName = parentNode.data.name;
            
          
            // Allow dropping in Form components or containers that might contain forms
            return parentType === 'FormInputDropArea' || 
                   parentName === 'FormInputDropArea' ||
                   parentNode.data.displayName === 'FormInputDropArea'

        },
    },
    related: {
        settings: InputConfigModal,
        styleMenu: {
            supportedProps: [
                'width', 'height', 'padding', 'backgroundColor', 'borderRadius',
                'inputWidth', 'inputHeight', 'inputBackgroundColor', 'inputBorderColor'
            ]
        }
    }
};