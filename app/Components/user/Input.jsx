'use client'

import { EditOutlined } from '@ant-design/icons';
import { Element, useNode } from "@craftjs/core";
import { Button, ColorPicker, Input as AntInput, Modal, Select, Slider, Switch } from "antd";
import { useState, useEffect } from "react";
import { FlexBox } from "./FlexBox";
import { Text } from "./Text";

export const FormInput = ({
    // Input properties
    inputType = "text",
    placeholder = "Enter value...",
    required = false,
    disabled = false,
    readOnly = false,
    
    // Label properties
    labelText = "Label",
    showLabel = true,
    
    // Layout properties
    width = "100%",
    height = "auto",
    display = "flex",
    flexDirection = "column",
    gap = 8,
    padding = 16,
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
    children
}) => {
    const { connectors: { connect, drag }, actions: { setProp }, selected: isSelected, id } = useNode((node) => ({
        selected: node.events.selected,
        id: node.id
    }));

    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [inputValue, setInputValue] = useState("");
    const [isFocused, setIsFocused] = useState(false);
    const [hasError, setHasError] = useState(false);

    // Input type options
    const inputTypeOptions = [
        { label: "Text", value: "text" },
        { label: "Email", value: "email" },
        { label: "Password", value: "password" },
        { label: "Number", value: "number" },
        { label: "Tel", value: "tel" },
        { label: "URL", value: "url" },
        { label: "Search", value: "search" },
        { label: "Date", value: "date" },
        { label: "Time", value: "time" },
        { label: "DateTime Local", value: "datetime-local" },
        { label: "Month", value: "month" },
        { label: "Week", value: "week" },
        { label: "Color", value: "color" },
        { label: "Range", value: "range" },
        { label: "File", value: "file" }
    ];

    // Get field name from label text (sanitized)
    const getFieldName = () => {
        return labelText.toLowerCase().replace(/[^a-z0-9]/g, '');
    };

    // Handle input change and notify parent form
    const handleInputChange = (e) => {
    const value = e.target ? e.target.value : e;
    setInputValue(value);
    
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
        
        const commonProps = {
            placeholder,
            disabled,
            value: inputValue,
            onChange: handleInputChange,
            onFocus: handleFocus,
            onBlur: handleBlur,
            style: inputStyles,
            status: (hasError || showError) ? 'error' : undefined
        };

        switch (inputType) {
            case 'color':
                return (
                    <input
                        type="color"
                        {...commonProps}
                        style={{
                            ...inputStyles,
                            cursor: 'pointer',
                            padding: '4px'
                        }}
                    />
                );

            case 'range':
                return (
                    <div style={{ width: inputWidth }}>
                        <input
                            type="range"
                            min="0"
                            max="100"
                            {...commonProps}
                            style={{
                                width: '100%',
                                height: '6px',
                                borderRadius: '3px',
                                background: '#ddd',
                                outline: 'none'
                            }}
                        />
                        <div style={{
                            textAlign: 'center',
                            fontSize: '12px',
                            color: '#666',
                            marginTop: '4px'
                        }}>
                            {inputValue || 50}
                        </div>
                    </div>
                );

            case 'file':
                return (
                    <input
                        type="file"
                        {...commonProps}
                        style={{
                            ...inputStyles,
                            cursor: 'pointer'
                        }}
                    />
                );

            case 'password':
                return (
                    <AntInput.Password
                        {...commonProps}
                    />
                );

            case 'number':
                return (
                    <AntInput
                        type="number"
                        {...commonProps}
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
                if (ref && connect && drag) {
                    try {
                        connect(drag)(ref);
                    } catch (error) {
                        console.warn('FormInput ref connection error:', error);
                    }
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
            className={`${isSelected ? 'ring-2 ring-blue-500' : ''} ${className} form-input`}
            style={{
                position: 'relative',
                outline: isSelected ? '2px solid #1890ff' : 'none',
                outlineOffset: '2px'
            }}
        >
                {/* Edit Button */}
                {isSelected && (
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
                        onClick={() => setIsEditModalOpen(true)}
                        onMouseDown={e => e.stopPropagation()}
                        title="Configure input"
                    >
                        <EditOutlined />
                    </div>
                )}

                {/* Label */}
                {showLabel && (
                    <Element
                        id={`label-${id}`}
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

            {/* Edit Modal */}
            <Modal
                title="Configure Input Field"
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
                    inputTypeOptions
                }} />
            </Modal>
        </>
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
    inputTypeOptions
}) => {
    const [activeTab, setActiveTab] = useState('general');

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

    return (
        <div style={{ height: '60vh' }}>
            {/* Tab Navigation */}
            <div style={{ 
                display: 'flex', 
                borderBottom: '1px solid #e8e8e8', 
                marginBottom: 24 
            }}>
                {[
                    { key: 'general', label: '⚙️ General' },
                    { key: 'styling', label: '🎨 Styling' },
                    { key: 'validation', label: '✓ Validation' }
                ].map(tab => (
                    <Button
                        key={tab.key}
                        type={activeTab === tab.key ? 'primary' : 'default'}
                        onClick={() => setActiveTab(tab.key)}
                        style={{ 
                            marginRight: 8,
                            marginBottom: -1,
                            borderBottomLeftRadius: 0,
                            borderBottomRightRadius: 0
                        }}
                    >
                        {tab.label}
                    </Button>
                ))}
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
        inputType: "text",
        placeholder: "Enter value...",
        required: false,
        disabled: false,
        readOnly: false,
        labelText: "Label",
        showLabel: true,
        width: "100%",
        height: "auto",
        display: "flex",
        flexDirection: "column",
        gap: 8,
        padding: 16,
        backgroundColor: "transparent",
        borderRadius: 8,
        inputWidth: "100%",
        inputHeight: "40px",
        inputBackgroundColor: "#ffffff",
        inputBorderColor: "#d9d9d9",
        inputBorderRadius: "6px",
        inputFontSize: "14px",
        inputFontFamily: "Arial, sans-serif",
        inputPadding: "8px 12px",
        labelFontSize: "14px",
        labelFontWeight: "500",
        labelColor: "#333333",
        labelFontFamily: "Arial, sans-serif",
        labelMarginBottom: "4px",
        focusBorderColor: "#1890ff",
        focusBoxShadow: "0 0 0 2px rgba(24, 144, 255, 0.2)",
        errorBorderColor: "#ff4d4f",
        errorBoxShadow: "0 0 0 2px rgba(255, 77, 79, 0.2)",
        showError: false,
        errorMessage: "This field is required",
        className: ""
    },
    rules: {
         canDrag: () => true,
        canDrop: () => true, // FormInput cannot accept other components
        canMoveIn: () => true, // FormInput cannot accept other components
        canMoveOut: () => true,
        canDropIn: (parentNode) => true,
    },
    related: {
         settings: InputConfigModal,
        styleMenu: {
            supportedProps: [
                'width', 'height', 'padding', 'backgroundColor', 'borderRadius'
            ]
        }
    }
};