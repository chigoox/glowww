import React, { useState, useEffect } from 'react';
import { Typography, Input, InputNumber, Switch, Space, Button, Tooltip, message, Select } from 'antd';
import { CheckCircleOutlined, StopOutlined, WarningOutlined, ClearOutlined } from '@ant-design/icons';

export default function ValidationEditor({ path, nodeMeta, updateValidation, clearValidation, errors }) {
  const existing = nodeMeta?.meta?.validation || {};
  const [required, setRequired] = useState(!!existing.required);
  const [min, setMin] = useState(existing.min);
  const [max, setMax] = useState(existing.max);
  const [pattern, setPattern] = useState(existing.pattern || '');
  const [custom, setCustom] = useState(existing.custom || '');
  const [testValue, setTestValue] = useState('');
  const [patternOk, setPatternOk] = useState(true);
  const isNumber = nodeMeta?.type === 'number';
  const isString = nodeMeta?.type === 'string';

  useEffect(()=>{
    setRequired(!!existing.required);
    setMin(existing.min);
    setMax(existing.max);
    setPattern(existing.pattern || '');
    setCustom(existing.custom || '');
  }, [existing, path]);

  useEffect(()=>{
    if (!pattern) { setPatternOk(true); return; }
    try { new RegExp(pattern); setPatternOk(true); } catch { setPatternOk(false); }
  }, [pattern]);

  const hasChanges = () => {
    return required !== !!existing.required || min !== existing.min || max !== existing.max || pattern !== (existing.pattern||'') || custom !== (existing.custom||'');
  };

  let testResult = '';
  if (testValue !== '') {
    try {
      const val = isNumber ? Number(testValue) : testValue;
      if (required && (testValue === '' || testValue == null)) testResult += 'Required fails; ';
      if (isNumber && typeof val === 'number') {
        if (min !== undefined && min !== null && val < min) testResult += 'Min fails; ';
        if (max !== undefined && max !== null && val > max) testResult += 'Max fails; ';
      }
      if (isString && pattern) {
        try { const re = new RegExp(pattern); if (!re.test(testValue)) testResult += 'Pattern fails;'; } catch{}
      }
      if (custom) {
        try { const fn = new Function('value', custom); const r = fn(val); if (r === false) testResult += 'Custom fails;'; if (typeof r === 'string') testResult += r+';'; } catch { testResult += 'Custom error;'; }
      }
      if (!testResult) testResult = 'Pass';
    } catch { testResult = 'Evaluation error'; }
  }

  const apply = () => {
    updateValidation(path, { required, min, max, pattern: pattern||undefined, custom: custom||undefined });
    message.success('Validation saved');
  };
  const clearAll = () => { clearValidation(path); message.info('Validation cleared'); };

  return (
    <div className="flex flex-col gap-4">
      <div>
        <Typography.Text type="secondary">Presets</Typography.Text>
        <Select
          size="small"
          style={{ width: 240, marginLeft: 8 }}
          placeholder="Select preset"
          onChange={(p)=>{
            if(p==='email'){ setPattern('^\\S+@\\S+\\.\\S+$'); setRequired(true); }
            if(p==='url'){ setPattern('^(https?:\\/\\/)?[\\w.-]+(\\.[\\w\-]+)+[/#?]?.*$'); }
            if(p==='positiveNumber'){ setMin(0); setPattern(''); }
            if(p==='nonEmpty'){ setRequired(true); setPattern('.+'); }
          }}
          options={[
            {label:'Email', value:'email'},
            {label:'URL', value:'url'},
            {label:'Positive Number', value:'positiveNumber'},
            {label:'Non Empty', value:'nonEmpty'}
          ]}
        />
      </div>
      <Space>
        <span>Required</span>
        <Switch checked={required} onChange={setRequired} />
      </Space>
      {isNumber && (
        <Space size={16} wrap>
          <div>
            <Typography.Text type="secondary">Min</Typography.Text>
            <InputNumber value={min} onChange={setMin} style={{width:120}} />
          </div>
          <div>
            <Typography.Text type="secondary">Max</Typography.Text>
            <InputNumber value={max} onChange={setMax} style={{width:120}} />
          </div>
        </Space>
      )}
      {isString && (
        <div>
          <Typography.Text type="secondary">Pattern (regex)</Typography.Text>
          <Input status={!patternOk ? 'error':undefined} value={pattern} onChange={e=>setPattern(e.target.value)} placeholder="^\\d+$" />
          {!patternOk && <Typography.Text type="danger"><WarningOutlined/> Invalid regex</Typography.Text>}
        </div>
      )}
      <div>
        <Typography.Text type="secondary">Custom Code</Typography.Text>
        <Input.TextArea rows={5} value={custom} onChange={e=>setCustom(e.target.value)} placeholder={"// return false or string for error\n// value available\nif(value===42) return 'Forbidden';"} />
      </div>
      <div>
        <Typography.Text type="secondary">Test Value</Typography.Text>
        <Input value={testValue} onChange={e=>setTestValue(e.target.value)} placeholder="Enter test value" />
        {testValue !== '' && <Typography.Text type={testResult==='Pass' ? 'success':'danger'}>{testResult}</Typography.Text>}
      </div>
      {errors && errors.length>0 && (
        <div className="space-y-1">
          <Typography.Text strong>Current Errors:</Typography.Text>
          {errors.map((er,i)=>(<Typography.Text key={i} type="danger">• {er}</Typography.Text>))}
        </div>
      )}
      <Space>
        <Button type="primary" disabled={!hasChanges() || !patternOk} onClick={apply} icon={<CheckCircleOutlined/>}>Save</Button>
        <Button onClick={clearAll} danger icon={<ClearOutlined/>}>Clear</Button>
      </Space>
    </div>
  );
}
