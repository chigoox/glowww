"use client";
import React, { useState, useMemo } from 'react';
import { Input, List, Tag, Button, Space, Typography } from 'antd';
import { t } from '../utils/userprops/userprops.messages';
import { SearchOutlined, PlusOutlined } from '@ant-design/icons';
import * as templates from '../utils/userprops/userPropTemplates';

const { Text } = Typography;

export function UserPropsTemplateLibrary({ onApplyExpression, onApplyWatcher }) {
  const [query, setQuery] = useState('');
  const expr = useMemo(()=> templates.listExpressionTemplates(),[]);
  const watch = useMemo(()=> templates.listWatcherTemplates(),[]);
  function filter(list){ return list.filter(t => !query || t.name.toLowerCase().includes(query.toLowerCase()) || (t.description||'').toLowerCase().includes(query.toLowerCase())); }
  const exprFiltered = filter(expr);
  const watchFiltered = filter(watch);
  return (
    <div className="p-2 flex flex-col gap-4" style={{ height:'100%', overflow:'auto' }}>
  <Input allowClear placeholder={t('userprops.templates.search')} prefix={<SearchOutlined />} value={query} onChange={e=>setQuery(e.target.value)} />
      <div>
    <Text strong>{t('userprops.templates.expressions')}</Text>
        <List
          size="small"
          dataSource={exprFiltered}
          renderItem={item=> (
            <List.Item
      actions={[<Button key="apply" size="small" type="primary" icon={<PlusOutlined />} onClick={()=> onApplyExpression && onApplyExpression(item)} aria-label={t('userprops.templates.applyExprAria',{name:item.name})}>{t('userprops.templates.apply')}</Button>]}
            >
              <List.Item.Meta title={<span>{item.name} <Tag color="blue">expr</Tag></span>} description={<span>{item.description}</span>} />
            </List.Item>
          )}
        />
      </div>
      <div>
    <Text strong>{t('userprops.templates.watchers')}</Text>
        <List
          size="small"
          dataSource={watchFiltered}
          renderItem={item=> (
            <List.Item
      actions={[<Button key="apply" size="small" icon={<PlusOutlined />} onClick={()=> onApplyWatcher && onApplyWatcher(item)} aria-label={t('userprops.templates.applyWatcherAria',{name:item.name})}>{t('userprops.templates.addWatcher')}</Button>]}
            >
              <List.Item.Meta title={<span>{item.name} <Tag color="green">watcher</Tag></span>} description={<span>{item.description}</span>} />
            </List.Item>
          )}
        />
      </div>
    </div>
  );
}

export default UserPropsTemplateLibrary;
