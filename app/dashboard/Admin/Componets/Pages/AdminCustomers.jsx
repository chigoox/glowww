"use client";
import React, { useEffect, useMemo, useState } from 'react';
import { AUTH } from '@/Firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { listConnectedCustomers, createConnectedCustomer } from '@/lib/stripe';
import { Button, Modal, Input, Form, Select, Tag, message } from 'antd';
import { PlusOutlined, ReloadOutlined } from '@ant-design/icons';

export default function AdminCustomers() {
  const [userId, setUserId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [customers, setCustomers] = useState([]);
  const [hasMore, setHasMore] = useState(false);
  const [startingAfter, setStartingAfter] = useState(null);

  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('all'); // all | active | delinquent | archived (Stripe doesn't expose a simple status; we use balance/metadata flags)

  const [addOpen, setAddOpen] = useState(false);
  const [addForm] = Form.useForm();
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    const off = onAuthStateChanged(AUTH, (u) => setUserId(u?.uid || null));
    return () => off();
  }, []);

  const fetchCustomers = async (opts = {}) => {
    if (!userId) return;
    try {
      setLoading(true);
      const res = await listConnectedCustomers(userId, { email: opts.email || undefined, limit: 25, starting_after: opts.starting_after });
      if (opts.append) {
        setCustomers(prev => [...prev, ...(res.data || [])]);
      } else {
        setCustomers(res.data || []);
      }
      setHasMore(!!res.has_more);
      if (res.data && res.data.length) {
        setStartingAfter(res.data[res.data.length - 1].id);
      }
    } catch (e) {
      message.error('Failed to load customers');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchCustomers({ email: search || undefined }); }, [userId]);

  const filtered = useMemo(() => {
    let rows = [...customers];
    const q = (search || '').toLowerCase();
    if (q) rows = rows.filter(c => (c.email || '').toLowerCase().includes(q) || (c.name || '').toLowerCase().includes(q));
    if (status !== 'all') {
      rows = rows.filter(c => {
        if (status === 'delinquent') return (c.delinquent || c.balance > 0);
        if (status === 'active') return !(c.delinquent || c.balance > 0);
        if (status === 'archived') return c.metadata?.archived === 'true';
        return true;
      });
    }
    return rows;
  }, [customers, search, status]);

  const onAdd = async (values) => {
    if (!userId) return;
    try {
      setAdding(true);
      await createConnectedCustomer(userId, { name: values.name?.trim(), email: values.email?.trim(), phone: values.phone?.trim() });
      message.success('Customer saved');
      setAddOpen(false);
      addForm.resetFields();
      fetchCustomers({ email: search || undefined });
    } catch (e) {
      message.error(e?.message || 'Failed to save customer');
    } finally {
      setAdding(false);
    }
  };

  return (
    <div className='p-3'>
      <div className='flex flex-wrap items-center justify-between gap-2 mb-2'>
        <div className='flex items-center gap-2'>
          <div className='relative w-64'>
            <input
              className='w-full h-8 pl-3 pr-8 rounded-md bg-white/5 text-black placeholder-black/50  border-black/10 focus:outline-none focus:ring-2 focus:ring-blue-400/20'
              placeholder='Search customers…'
              value={search}
              onChange={(e)=> setSearch(e.target.value)}
              onKeyDown={(e)=>{ if (e.key === 'Enter') fetchCustomers({ email: e.currentTarget.value || undefined }); }}
            />
            <button className='absolute right-1 top-1 text-xs px-2 py-1 rounded hover:bg-white/10' onClick={()=> fetchCustomers({ email: search || undefined })}>
              <ReloadOutlined />
            </button>
          </div>
          <Select size='small' value={status} onChange={setStatus} className='w-32'
            options={[{label:'All', value:'all'},{label:'Active', value:'active'},{label:'Delinquent', value:'delinquent'},{label:'Archived', value:'archived'}]} />
        </div>
        <Button type='primary' icon={<PlusOutlined />} onClick={()=> setAddOpen(true)}>Add Customer</Button>
      </div>

      <div className='rounded  border-black/10 overflow-hidden'>
        <div className='grid grid-cols-[2fr_2fr_1fr_1fr] gap-2 px-3 py-2 text-xs font-semibold bg-black/5'>
          <div>Name</div>
          <div>Email</div>
          <div>Phone</div>
          <div>Status</div>
        </div>
        {filtered.map(c => (
          <div key={c.id} className='grid grid-cols-[2fr_2fr_1fr_1fr] gap-2 px-3 py-2 border-t border-black/5 hover:bg-black/5'>
            <div>{c.name || '—'}</div>
            <div>{c.email || '—'}</div>
            <div>{c.phone || '—'}</div>
            <div>
              {c.delinquent || c.balance > 0 ? (
                <Tag color='red'>Delinquent</Tag>
              ) : (
                <Tag color='green'>Active</Tag>
              )}
              {c.metadata?.archived === 'true' && <Tag>Archived</Tag>}
            </div>
          </div>
        ))}
        {filtered.length === 0 && (
          <div className='px-3 py-8 text-center text-black/60 text-sm'>No customers found</div>
        )}
        {hasMore && (
          <div className='px-3 py-2 text-center'>
            <Button size='small' onClick={()=> fetchCustomers({ email: search || undefined, starting_after: startingAfter, append: true })} loading={loading}>Load more</Button>
          </div>
        )}
      </div>

      <Modal title='Add customer' open={addOpen} onCancel={()=> setAddOpen(false)} footer={null} destroyOnClose>
        <Form form={addForm} layout='vertical' onFinish={onAdd}>
          <Form.Item label='Name' name='name'>
            <Input placeholder='Jane Doe' />
          </Form.Item>
          <Form.Item label='Email' name='email' rules={[{ required: true, message:'Email required' }, { type: 'email', message: 'Invalid email' }]}>
            <Input placeholder='jane@example.com' />
          </Form.Item>
          <Form.Item label='Phone' name='phone'>
            <Input placeholder='+1 555 555-5555' />
          </Form.Item>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
            <Button onClick={()=> setAddOpen(false)}>Cancel</Button>
            <Button type='primary' htmlType='submit' loading={adding}>Save</Button>
          </div>
        </Form>
      </Modal>
    </div>
  );
}
