"use client";
import React, { useEffect, useState } from 'react';
import { Card, Statistic, Row, Col, List, Tag } from 'antd';
import { getUserPropsTelemetry, onUserPropsEvent } from '../utils/userprops/userPropsEngine';
import { t } from '../utils/userprops/userprops.messages';

export default function UserPropsTelemetryPanel(){
  const [telemetry, setTelemetry] = useState(getUserPropsTelemetry());
  const [events, setEvents] = useState([]);
  useEffect(()=>{
    const unsub = onUserPropsEvent((evt)=>{
      if(evt.type==='pipelineComplete'){
        setTelemetry(getUserPropsTelemetry());
        setEvents(prev=> [{ id: evt.ts, ...evt.payload }, ...prev].slice(0,50));
      }
    });
    return unsub;
  },[]);
  return (
    <div className="p-3" style={{ overflow:'auto', height:'100%' }}>
      <Row gutter={[16,16]}>
        <Col xs={12} md={6}><Card size="small"><Statistic title={t('userprops.telemetry.pipelines')} value={telemetry.pipelines} /></Card></Col>
        <Col xs={12} md={6}><Card size="small"><Statistic title={t('userprops.telemetry.exprEval')} value={telemetry.expressionsEvaluated} /></Card></Col>
        <Col xs={12} md={6}><Card size="small"><Statistic title={t('userprops.telemetry.exprErrors')} value={telemetry.expressionErrors} valueStyle={{ color: telemetry.expressionErrors? '#fa541c':'inherit' }} /></Card></Col>
        <Col xs={12} md={6}><Card size="small"><Statistic title={t('userprops.telemetry.watchers')} value={telemetry.watchersRun} /></Card></Col>
        <Col xs={12} md={6}><Card size="small"><Statistic title={t('userprops.telemetry.watcherErrors')} value={telemetry.watcherErrors} valueStyle={{ color: telemetry.watcherErrors? '#fa541c':'inherit' }} /></Card></Col>
        <Col xs={12} md={6}><Card size="small"><Statistic title={t('userprops.telemetry.totalMs')} value={telemetry.totalMs.toFixed? telemetry.totalMs.toFixed(1): telemetry.totalMs} /></Card></Col>
      </Row>
      <div className="mt-4">
        <h4 className="mb-2">{t('userprops.telemetry.recent')}</h4>
        <List
          size="small"
          dataSource={events}
          locale={{ emptyText: t('userprops.telemetry.none') }}
          renderItem={e=> (
            <List.Item>
              <div style={{ width:'100%' }}>
                <div style={{ display:'flex', justifyContent:'space-between' }}>
                  <span>{new Date(e.id).toLocaleTimeString()}</span>
                  <span>{e.durationMs}ms</span>
                </div>
                <div className="mt-1" style={{ fontSize:12 }}>
                  <Tag color="blue">expr:{e.exprChanges.length}</Tag>
                  <Tag color={e.watchersTriggered.length? 'processing':'default'}>watchers:{e.watchersTriggered.length}</Tag>
                  <Tag color={e.validationErrorCount? 'red':'default'}>validErr:{e.validationErrorCount}</Tag>
                </div>
              </div>
            </List.Item>
          )}
        />
      </div>
    </div>
  );
}
