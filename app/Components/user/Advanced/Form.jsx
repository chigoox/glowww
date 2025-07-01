'use client'

import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useNode, useEditor, Element } from "@craftjs/core";
import { 
  EditOutlined, 
  DatabaseOutlined, 
  PlusOutlined,
  FormOutlined
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
  Alert
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
  
  // Layout & Styling
  width = "100%",
  maxWidth = "600px",
  padding = "24px",
  backgroundColor = "#ffffff",
  borderRadius = "8px",
  boxShadow = "0 4px 12px rgba(0, 0, 0, 0.1)",
  border = "1px solid #e8e8e8",
  
  // Submit Button Styling
  submitButtonColor = "#1890ff",
  submitButtonSize = "large",
  submitButtonWidth = "100%",
  
  className = "",
  children
}) => {
  // Craft.js hooks
  const { 
    connectors: { connect, drag }, 
    actions: { setProp }, 
    selected: isSelected, 
    id 
  } = useNode((node) => ({
    selected: node.events.selected,
    id: node.id,
  }));

  // Component state
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [formData, setFormData] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Use the correct Craft.js way to get descendants and detect FormInputs
const { inputFields, descendants } = useEditor((state, query) => {
  try {
    const formDescendants = query.node(query.node(id).descendants()[0]).descendants();
    
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
  console.log(`📊 Form ${id} - Input fields with values:`, {
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
}, [inputFields, formData, id]);

  
  
  // Static database list
  const databases = useMemo(() => [
    { id: 'contacts', name: 'Contacts Database' },
    { id: 'leads', name: 'Sales Leads' },
    { id: 'feedback', name: 'Customer Feedback' }
  ], []);

  // Refs
  const formRef = useRef(null);

  // Connect form element
  useEffect(() => {
    if (formRef.current && connect && drag) {
      try {
        const element = formRef.current;
        connect(drag(element));
        
        return () => {
          // Cleanup is handled by Craft.js automatically
        };
      } catch (error) {
        console.warn('Error connecting form element:', error);
      }
    }
  }, [connect, drag]);

  // Log input detection for debugging
  useEffect(() => {
    console.log(`📊 Form ${id} - Input fields detected:`, inputFields.length);
    if (inputFields.length > 0) {
      console.log('Fields:', inputFields.map(f => ({ label: f.labelText, type: f.inputType })));
    }
  }, [inputFields.length, id]);

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
  }, [inputFields, formData, databaseName, showSuccessMessage, successMessage, resetAfterSubmit, redirectAfterSubmit, redirectUrl, id, formTitle]);

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
    e.stopPropagation();
  }, []);

  const handleEditClick = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsEditModalOpen(true);
  }, []);

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
        className={`${isSelected ? 'ring-2 ring-blue-500' : ''} ${className}`}
        style={{
          width,
          maxWidth,
          padding,
          backgroundColor,
          borderRadius,
          boxShadow,
          border,
          position: 'relative',
          margin: '0 auto'
        }}
        onSubmit={handleSubmit}
        onClick={handleFormEvent}
        onMouseDown={handleFormEvent}
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
            onClick={handleEditClick}
            onMouseDown={handleEditClick}
            title="Configure form"
          >
            <EditOutlined />
          </div>
        )}

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
          id={`${id}_drop_area`}
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

      {/* Configuration Modal */}
      <Modal
        title="Configure Form"
        open={isEditModalOpen}
        onCancel={() => setIsEditModalOpen(false)}
        width={1000}
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
        />
      </Modal>
    </>
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
  submitButtonWidth
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

  return (
    <div style={{ height: '70vh' }}>
      {/* Tab Navigation */}
      <div style={{ 
        display: 'flex', 
        borderBottom: '1px solid #e8e8e8', 
        marginBottom: 24 
      }}>
        {[
          { key: 'general', label: '⚙️ General' },
          { key: 'database', label: '🗄️ Database' },
          { key: 'styling', label: '🎨 Styling' },
          { key: 'behavior', label: '🔄 Behavior' }
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
                <TextArea
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
                <div style={{ maxHeight: 300, overflowY: 'auto' }}>
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
        )}

        {/* Database Tab */}
        {activeTab === 'database' && (
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
              <h4>Style Linking</h4>
              
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
        )}

        {/* Styling Tab */}
        {activeTab === 'styling' && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
            <div>
              <h4>Submit Button Styling</h4>
              
              <div style={{ marginBottom: 16 }}>
                <label style={{ display: 'block', marginBottom: 8, fontWeight: 500 }}>
                  Button Color
                </label>
                <input
                  type="color"
                  value={submitButtonColor}
                  onChange={(e) => setProp(props => props.submitButtonColor = e.target.value)}
                  style={{ width: '100%', height: 40, border: '1px solid #d9d9d9', borderRadius: 6 }}
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
              <h4>Messages</h4>
              
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
          </div>
        )}

        {/* Behavior Tab */}
        {activeTab === 'behavior' && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
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
              
              {/* Fixed FormDataPreview call */}
              <FormDataPreview 
                inputFields={inputFields}
                formData={formData || {}}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// Craft.js configuration
Form.craft = {
  displayName: 'Form',
  props: {
    formTitle: "Contact Form",
    formDescription: "Please fill out the form below",
    submitButtonText: "Submit",
    successMessage: "Form submitted successfully!",
    databaseName: "",
    keyField: "",
    resetAfterSubmit: true,
    showSuccessMessage: true,
    redirectAfterSubmit: false,
    redirectUrl: "",
    linkStyles: false,
    width: "100%",
    maxWidth: "600px",
    padding: "24px",
    backgroundColor: "#ffffff",
    borderRadius: "8px",
    boxShadow: "0 4px 12px rgba(0, 0, 0, 0.1)",
    border: "1px solid #e8e8e8",
    submitButtonColor: "#1890ff",
    submitButtonSize: "large",
    submitButtonWidth: "100%",
    className: ""
  },
  rules: {
    canDrag: () => true,
    canDrop: () => true,
    canMoveIn: () => true,
    canMoveOut: () => true,
  },
  related: {
    settings: FormConfigModal
  }
};

FormInputDropArea.craft = {
  displayName: 'FormInputDropArea',
  props: {},
  rules: {
    canDrag: () => false,
    canDrop: () => true,
    canMoveIn: () => true,
    canMoveOut: () => true,
  }
};