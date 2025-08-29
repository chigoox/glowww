import React, { useState, useEffect } from 'react';
import { 
  Card, Typography, Row, Col, Button, Modal, Tabs, Spin, Alert, 
  Tag, Progress, Statistic, Table, Switch, Select, DatePicker, 
  Badge, Tooltip, Space, Divider 
} from 'antd';
import { 
  LineChart, BarChart, PieChart, AreaChart, ScatterChart, HeatMap,
  Line, Bar, Pie, Cell, Area, XAxis, YAxis, CartesianGrid, 
  Tooltip as RechartsTooltip, Legend, ResponsiveContainer,
  Scatter, ComposedChart
} from 'recharts';
import {
  TrendingUpOutlined, TrendingDownOutlined, ExperimentOutlined,
  WarningOutlined, CheckCircleOutlined, InfoCircleOutlined,
  UserOutlined, MailOutlined, EyeOutlined, ClickOutlined,
  ThunderboltOutlined, HeartOutlined, TeamOutlined,
  BarChartOutlined, DotChartOutlined, HeatMapOutlined
} from '@ant-design/icons';

const { Text, Title } = Typography;
const { TabPane } = Tabs;
const { Option } = Select;
const { RangePicker } = DatePicker;

export default function AdvancedEmailAnalytics({ 
  siteId, 
  visible, 
  onClose, 
  token 
}) {
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');
  const [dateRange, setDateRange] = useState([null, null]);
  const [compareEnabled, setCompareEnabled] = useState(true);
  
  // Data states
  const [analyticsData, setAnalyticsData] = useState(null);
  const [deliverabilityData, setDeliverabilityData] = useState(null);
  const [abTestData, setAbTestData] = useState(null);
  const [engagementData, setEngagementData] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (visible && siteId) {
      loadAnalyticsData();
    }
  }, [visible, siteId, dateRange, compareEnabled]);

  const loadAnalyticsData = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const days = dateRange[0] && dateRange[1] 
        ? Math.ceil((dateRange[1] - dateRange[0]) / (1000 * 60 * 60 * 24))
        : 30;
      
      const baseParams = new URLSearchParams({
        siteId,
        days: days.toString()
      });
      
      if (compareEnabled) {
        baseParams.append('compareToEnd', 'true');
        baseParams.append('segments', 'template,device,location');
      }
      
      // Load all analytics data in parallel
      const [analyticsRes, deliverabilityRes, abTestRes, engagementRes] = await Promise.all([
        fetch(`/api/email/analytics/summary?${baseParams}`),
        fetch(`/api/email/analytics/deliverability?${baseParams}&includeRecommendations=true`),
        fetch(`/api/email/analytics/ab-tests?${baseParams}&status=all`),
        fetch(`/api/email/analytics/engagement?${baseParams}&cohortType=monthly&includeChurn=true`)
      ]);

      const [analytics, deliverability, abTests, engagement] = await Promise.all([
        analyticsRes.json(),
        deliverabilityRes.json(), 
        abTestRes.json(),
        engagementRes.json()
      ]);

      if (analytics.ok) setAnalyticsData(analytics);
      if (deliverability.ok) setDeliverabilityData(deliverability);
      if (abTests.ok) setAbTestData(abTests);
      if (engagement.ok) setEngagementData(engagement);
      
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const renderOverviewTab = () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Key Metrics Row */}
      <Row gutter={[16, 16]}>
        <Col xs={24} sm={12} lg={6}>
          <Card size="small">
            <Statistic
              title="Total Sent"
              value={analyticsData?.current?.totalSent || 0}
              prefix={<MailOutlined />}
              valueStyle={{ color: token.colorPrimary }}
            />
            {analyticsData?.comparison && (
              <Text type="secondary" style={{ fontSize: 12 }}>
                {analyticsData.current.totalSent > analyticsData.comparison.totalSent ? '↗' : '↘'} 
                {Math.abs(analyticsData.current.totalSent - analyticsData.comparison.totalSent)} vs. last period
              </Text>
            )}
          </Card>
        </Col>
        
        <Col xs={24} sm={12} lg={6}>
          <Card size="small">
            <Statistic
              title="Open Rate"
              value={analyticsData?.current?.openRate || 0}
              suffix="%"
              prefix={<EyeOutlined />}
              valueStyle={{ 
                color: (analyticsData?.current?.openRate || 0) > 20 ? token.colorSuccess : token.colorError 
              }}
            />
            {analyticsData?.insights?.filter(i => i.metric === 'Open Rate')[0] && (
              <Tag 
                size="small" 
                color={analyticsData.insights.filter(i => i.metric === 'Open Rate')[0].type === 'positive' ? 'green' : 'red'}
              >
                {analyticsData.insights.filter(i => i.metric === 'Open Rate')[0].change > 0 ? '+' : ''}
                {analyticsData.insights.filter(i => i.metric === 'Open Rate')[0].change?.toFixed(1)}%
              </Tag>
            )}
          </Card>
        </Col>
        
        <Col xs={24} sm={12} lg={6}>
          <Card size="small">
            <Statistic
              title="Click Rate"
              value={analyticsData?.current?.clickRate || 0}
              suffix="%"
              prefix={<ClickOutlined />}
              valueStyle={{ 
                color: (analyticsData?.current?.clickRate || 0) > 2 ? token.colorSuccess : token.colorWarning 
              }}
            />
            <Progress
              percent={Math.min(100, (analyticsData?.current?.clickRate || 0) * 20)}
              size="small"
              strokeColor={token.colorWarning}
              showInfo={false}
              style={{ marginTop: 4 }}
            />
          </Card>
        </Col>
        
        <Col xs={24} sm={12} lg={6}>
          <Card size="small">
            <Statistic
              title="Deliverability Score"
              value={deliverabilityData?.reputationScore?.overall || 0}
              suffix="/100"
              prefix={<ThunderboltOutlined />}
              valueStyle={{ 
                color: (deliverabilityData?.reputationScore?.overall || 0) > 80 ? token.colorSuccess : 
                      (deliverabilityData?.reputationScore?.overall || 0) > 60 ? token.colorWarning : token.colorError
              }}
            />
            <Text style={{ fontSize: 12 }}>
              Grade: <strong>{deliverabilityData?.reputationScore?.grade || 'N/A'}</strong>
            </Text>
          </Card>
        </Col>
      </Row>

      {/* Performance Trend Chart */}
      <Card title="Performance Trends" size="small">
        <div style={{ height: 300 }}>
          <ResponsiveContainer>
            <ComposedChart data={analyticsData?.current?.series || []}>
              <CartesianGrid strokeDasharray="3 3" stroke={token.colorBorder} />
              <XAxis dataKey="date" stroke={token.colorTextSecondary} />
              <YAxis yAxisId="left" stroke={token.colorTextSecondary} />
              <YAxis yAxisId="right" orientation="right" stroke={token.colorTextSecondary} />
              <RechartsTooltip />
              <Legend />
              <Bar yAxisId="left" dataKey="sent" fill={token.colorPrimary} name="Sent" />
              <Line yAxisId="right" type="monotone" dataKey="uniqueOpens" stroke={token.colorSuccess} strokeWidth={2} name="Unique Opens" />
              <Line yAxisId="right" type="monotone" dataKey="uniqueClicks" stroke={token.colorWarning} strokeWidth={2} name="Unique Clicks" />
              <Line yAxisId="right" type="monotone" dataKey="bounced" stroke={token.colorError} strokeWidth={1} name="Bounced" />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </Card>

      {/* Insights and Recommendations */}
      <Row gutter={[16, 16]}>
        <Col xs={24} lg={12}>
          <Card title="Key Insights" size="small">
            <div style={{ maxHeight: 200, overflow: 'auto' }}>
              {analyticsData?.insights?.map((insight, idx) => (
                <Alert
                  key={idx}
                  message={insight.message}
                  type={insight.type === 'positive' ? 'success' : insight.type === 'negative' ? 'error' : 'warning'}
                  showIcon
                  style={{ marginBottom: 8, fontSize: 12 }}
                  icon={insight.type === 'positive' ? <CheckCircleOutlined /> : 
                        insight.type === 'negative' ? <WarningOutlined /> : <InfoCircleOutlined />}
                />
              ))}
              {(!analyticsData?.insights || analyticsData.insights.length === 0) && (
                <Text type="secondary">No insights available</Text>
              )}
            </div>
          </Card>
        </Col>
        
        <Col xs={24} lg={12}>
          <Card title="Recommendations" size="small">
            <div style={{ maxHeight: 200, overflow: 'auto' }}>
              {analyticsData?.recommendations?.slice(0, 3).map((rec, idx) => (
                <div key={idx} style={{ marginBottom: 12, padding: 8, border: `1px solid ${token.colorBorder}`, borderRadius: 4 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                    <Tag color={rec.priority === 'high' ? 'red' : rec.priority === 'medium' ? 'orange' : 'blue'}>
                      {rec.priority}
                    </Tag>
                    <Text strong style={{ fontSize: 12 }}>{rec.title}</Text>
                  </div>
                  <Text style={{ fontSize: 11 }}>{rec.description}</Text>
                </div>
              ))}
              {(!analyticsData?.recommendations || analyticsData.recommendations.length === 0) && (
                <Text type="secondary">All good! No recommendations.</Text>
              )}
            </div>
          </Card>
        </Col>
      </Row>
    </div>
  );

  const renderDeliverabilityTab = () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Reputation Score Breakdown */}
      <Row gutter={[16, 16]}>
        <Col xs={24} lg={8}>
          <Card title="Reputation Factors" size="small">
            {deliverabilityData?.reputationScore?.factors && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {Object.entries(deliverabilityData.reputationScore.factors).map(([factor, score]) => (
                  <div key={factor}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                      <Text style={{ fontSize: 12, textTransform: 'capitalize' }}>{factor}</Text>
                      <Text style={{ fontSize: 12, fontWeight: 600 }}>{score?.toFixed(0) || 0}/100</Text>
                    </div>
                    <Progress 
                      percent={score || 0} 
                      size="small" 
                      strokeColor={
                        score >= 90 ? token.colorSuccess :
                        score >= 70 ? token.colorWarning : token.colorError
                      }
                    />
                  </div>
                ))}
              </div>
            )}
          </Card>
        </Col>
        
        <Col xs={24} lg={16}>
          <Card title="Provider Performance" size="small">
            <Table
              dataSource={deliverabilityData?.metrics?.providerBreakdown || []}
              columns={[
                { title: 'Provider', dataIndex: 'provider', key: 'provider' },
                { title: 'Sent', dataIndex: 'sent', key: 'sent' },
                { 
                  title: 'Delivery Rate', 
                  dataIndex: 'deliveryRate', 
                  key: 'deliveryRate',
                  render: (rate) => (
                    <Tag color={rate >= 95 ? 'green' : rate >= 90 ? 'orange' : 'red'}>
                      {rate?.toFixed(1)}%
                    </Tag>
                  )
                },
                { 
                  title: 'Bounce Rate', 
                  dataIndex: 'bounceRate', 
                  key: 'bounceRate',
                  render: (rate) => (
                    <Tag color={rate <= 2 ? 'green' : rate <= 5 ? 'orange' : 'red'}>
                      {rate?.toFixed(1)}%
                    </Tag>
                  )
                }
              ]}
              pagination={false}
              size="small"
            />
          </Card>
        </Col>
      </Row>

      {/* Authentication Status */}
      <Card title="Email Authentication" size="small">
        <Row gutter={[16, 16]}>
          {deliverabilityData?.metrics?.authenticationStatus && 
           Object.entries(deliverabilityData.metrics.authenticationStatus).map(([auth, results]) => (
            <Col key={auth} xs={24} sm={8}>
              <div style={{ textAlign: 'center' }}>
                <Text strong style={{ textTransform: 'uppercase' }}>{auth}</Text>
                <div style={{ marginTop: 8 }}>
                  <Progress
                    type="circle"
                    size={80}
                    percent={
                      results.pass + results.fail > 0 
                        ? Math.round((results.pass / (results.pass + results.fail)) * 100)
                        : 0
                    }
                    strokeColor={
                      results.pass / (results.pass + results.fail) >= 0.9 ? token.colorSuccess :
                      results.pass / (results.pass + results.fail) >= 0.7 ? token.colorWarning : token.colorError
                    }
                  />
                </div>
                <div style={{ fontSize: 11, marginTop: 4 }}>
                  <Text type="success">{results.pass} pass</Text> • 
                  <Text type="danger">{results.fail} fail</Text>
                </div>
              </div>
            </Col>
          ))}
        </Row>
      </Card>

      {/* Deliverability Recommendations */}
      <Card title="Deliverability Recommendations" size="small">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {deliverabilityData?.recommendations?.map((rec, idx) => (
            <div key={idx} style={{ 
              padding: 12, 
              border: `1px solid ${
                rec.priority === 'critical' ? token.colorError :
                rec.priority === 'high' ? token.colorWarning :
                rec.priority === 'medium' ? token.colorInfo : token.colorBorder
              }`,
              borderRadius: 6,
              backgroundColor: 
                rec.priority === 'critical' ? token.colorErrorBg :
                rec.priority === 'high' ? token.colorWarningBg :
                rec.priority === 'medium' ? token.colorInfoBg : 'transparent'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                <Tag color={
                  rec.priority === 'critical' ? 'red' :
                  rec.priority === 'high' ? 'orange' :
                  rec.priority === 'medium' ? 'blue' : 'default'
                }>
                  {rec.priority}
                </Tag>
                <Text strong>{rec.title}</Text>
                <Badge count={rec.category} style={{ backgroundColor: token.colorBgLayout, color: token.colorText }} />
              </div>
              <Text style={{ fontSize: 12, marginBottom: 8 }}>{rec.description}</Text>
              <div style={{ fontSize: 11 }}>
                <Text strong>Expected Impact:</Text> {rec.expectedImpact} • 
                <Text strong>Effort:</Text> {rec.effort}
              </div>
              <div style={{ marginTop: 6 }}>
                <Text strong style={{ fontSize: 11 }}>Actions:</Text>
                <ul style={{ margin: '4px 0', paddingLeft: 16, fontSize: 10 }}>
                  {rec.actions?.slice(0, 3).map((action, i) => (
                    <li key={i}>{action}</li>
                  ))}
                </ul>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );

  const renderEngagementTab = () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Subscriber Segments */}
      <Card title="Subscriber Segments" size="small">
        <Row gutter={[16, 16]}>
          {engagementData?.segments?.segments && 
           Object.entries(engagementData.segments.segments).map(([segmentName, data]) => (
            <Col key={segmentName} xs={24} sm={12} lg={6}>
              <div style={{ textAlign: 'center', padding: 12, border: `1px solid ${token.colorBorder}`, borderRadius: 6 }}>
                <Text strong style={{ fontSize: 12, textTransform: 'capitalize', color: 
                  segmentName === 'champions' ? token.colorSuccess :
                  segmentName === 'hibernating' ? token.colorError :
                  segmentName === 'needsAttention' ? token.colorWarning : token.colorText
                }}>
                  {segmentName.replace(/([A-Z])/g, ' $1').trim()}
                </Text>
                <div style={{ fontSize: 20, fontWeight: 700, margin: '8px 0' }}>
                  {data.count}
                </div>
                <div style={{ fontSize: 10, color: token.colorTextSecondary }}>
                  {data.percentage?.toFixed(1)}% of total
                </div>
                <Progress
                  percent={data.percentage || 0}
                  size="small"
                  strokeColor={
                    segmentName === 'champions' ? token.colorSuccess :
                    segmentName === 'hibernating' ? token.colorError :
                    segmentName === 'needsAttention' ? token.colorWarning : token.colorPrimary
                  }
                  showInfo={false}
                  style={{ marginTop: 4 }}
                />
                <Text style={{ fontSize: 9 }}>
                  Avg Score: {data.avgEngagementScore?.toFixed(0) || 0}
                </Text>
              </div>
            </Col>
          ))}
        </Row>
      </Card>

      {/* Cohort Analysis */}
      {engagementData?.cohorts?.cohorts && (
        <Card title="Cohort Engagement" size="small">
          <div style={{ height: 250 }}>
            <ResponsiveContainer>
              <LineChart data={engagementData.cohorts.cohorts}>
                <CartesianGrid strokeDasharray="3 3" stroke={token.colorBorder} />
                <XAxis dataKey="cohort" stroke={token.colorTextSecondary} />
                <YAxis stroke={token.colorTextSecondary} />
                <RechartsTooltip />
                <Legend />
                <Line 
                  type="monotone" 
                  dataKey="engagement.engagementRate" 
                  stroke={token.colorPrimary} 
                  strokeWidth={2} 
                  name="Engagement Rate %" 
                />
                <Line 
                  type="monotone" 
                  dataKey="engagement.activeRate" 
                  stroke={token.colorSuccess} 
                  strokeWidth={2} 
                  name="Active Rate %" 
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>
      )}

      {/* Churn Analysis */}
      {engagementData?.churn && (
        <Card title="Subscriber Health" size="small">
          <Row gutter={[16, 16]}>
            <Col xs={24} lg={16}>
              <div style={{ height: 200 }}>
                <ResponsiveContainer>
                  <PieChart>
                    <Pie
                      data={[
                        { name: 'Active', value: engagementData.churn.classifications.active.count, fill: token.colorSuccess },
                        { name: 'At Risk', value: engagementData.churn.classifications.atRisk.count, fill: token.colorWarning },
                        { name: 'Inactive', value: engagementData.churn.classifications.inactive.count, fill: token.colorError },
                        { name: 'Churned', value: engagementData.churn.classifications.churned.count, fill: '#d9d9d9' }
                      ]}
                      cx="50%"
                      cy="50%"
                      innerRadius={40}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {[token.colorSuccess, token.colorWarning, token.colorError, '#d9d9d9'].map((color, index) => (
                        <Cell key={`cell-${index}`} fill={color} />
                      ))}
                    </Pie>
                    <RechartsTooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </Col>
            <Col xs={24} lg={8}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <Statistic
                  title="Monthly Churn Rate"
                  value={engagementData.churn.churnRate?.monthly || 0}
                  precision={1}
                  suffix="%"
                  valueStyle={{ 
                    color: (engagementData.churn.churnRate?.monthly || 0) > 10 ? token.colorError : token.colorSuccess 
                  }}
                />
                <Statistic
                  title="At Risk Subscribers"
                  value={engagementData.churn.classifications.atRisk.count}
                  valueStyle={{ color: token.colorWarning }}
                />
                <Text style={{ fontSize: 11, color: token.colorTextSecondary }}>
                  {engagementData.churn.classifications.atRisk.percentage?.toFixed(1)}% of total subscribers
                </Text>
              </div>
            </Col>
          </Row>
        </Card>
      )}

      {/* Engagement Recommendations */}
      <Card title="Engagement Recommendations" size="small">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {engagementData?.recommendations?.map((rec, idx) => (
            <div key={idx} style={{ 
              padding: 8, 
              border: `1px solid ${rec.priority === 'high' ? token.colorWarning : token.colorBorder}`,
              borderRadius: 4,
              backgroundColor: rec.priority === 'high' ? token.colorWarningBg : 'transparent'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                <Tag color={rec.priority === 'high' ? 'red' : rec.priority === 'medium' ? 'orange' : 'blue'}>
                  {rec.priority}
                </Tag>
                <Text strong style={{ fontSize: 12 }}>{rec.title}</Text>
                <Badge count={rec.segment} style={{ backgroundColor: token.colorBgLayout, color: token.colorText }} />
              </div>
              <Text style={{ fontSize: 11, marginBottom: 4 }}>{rec.description}</Text>
              <div style={{ fontSize: 10 }}>
                <ul style={{ margin: 0, paddingLeft: 16 }}>
                  {rec.actions?.slice(0, 2).map((action, i) => (
                    <li key={i}>{action}</li>
                  ))}
                </ul>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );

  const renderABTestingTab = () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <Card 
        title="A/B Test Results" 
        size="small" 
        extra={
          <Button 
            type="primary" 
            size="small" 
            icon={<ExperimentOutlined />}
            onClick={() => {/* Handle create new test */}}
          >
            New Test
          </Button>
        }
      >
        {abTestData?.tests?.length > 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {abTestData.tests.slice(0, 5).map((test, idx) => (
              <div key={idx} style={{ 
                padding: 12, 
                border: `1px solid ${token.colorBorder}`, 
                borderRadius: 6,
                backgroundColor: test.status === 'active' ? token.colorInfoBg : 'transparent'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <Text strong>{test.testName}</Text>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <Tag color={test.status === 'active' ? 'blue' : 'default'}>
                      {test.status}
                    </Tag>
                    {test.winner && (
                      <Tag color="green">
                        Winner: {test.winner}
                      </Tag>
                    )}
                  </div>
                </div>
                
                {test.variants && (
                  <Row gutter={[8, 8]}>
                    {test.variants.map((variant, vIdx) => (
                      <Col key={vIdx} xs={24} sm={12}>
                        <div style={{ 
                          padding: 8, 
                          border: `1px solid ${variant.id === test.winner ? token.colorSuccess : token.colorBorder}`,
                          borderRadius: 4,
                          backgroundColor: variant.id === test.winner ? token.colorSuccessBg : 'transparent'
                        }}>
                          <Text strong style={{ fontSize: 11 }}>
                            {variant.name} {variant.id === test.winner && '👑'}
                          </Text>
                          <div style={{ fontSize: 10, marginTop: 4 }}>
                            <div>Sent: {variant.sent}</div>
                            <div>Open Rate: {variant.openRate?.toFixed(1) || 0}%</div>
                            <div>Click Rate: {variant.clickRate?.toFixed(1) || 0}%</div>
                          </div>
                          {variant.id === test.winner && test.confidence && (
                            <Progress
                              percent={test.confidence * 100}
                              size="small"
                              strokeColor={token.colorSuccess}
                              format={(percent) => `${percent?.toFixed(0)}% confident`}
                            />
                          )}
                        </div>
                      </Col>
                    ))}
                  </Row>
                )}
                
                {test.insights && test.insights.length > 0 && (
                  <div style={{ marginTop: 8, fontSize: 11 }}>
                    {test.insights.map((insight, iIdx) => (
                      <Alert
                        key={iIdx}
                        message={insight.message}
                        type={insight.type === 'success' ? 'success' : 'info'}
                        showIcon
                        style={{ marginBottom: 4 }}
                      />
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div style={{ textAlign: 'center', padding: 40 }}>
            <ExperimentOutlined style={{ fontSize: 48, color: token.colorTextSecondary }} />
            <div style={{ marginTop: 16 }}>
              <Text type="secondary">No A/B tests yet</Text>
              <div style={{ marginTop: 8 }}>
                <Button type="primary" icon={<ExperimentOutlined />}>
                  Create Your First Test
                </Button>
              </div>
            </div>
          </div>
        )}
      </Card>

      {abTestData?.summary && (
        <Row gutter={[16, 16]}>
          <Col xs={24} sm={8}>
            <Card size="small">
              <Statistic
                title="Active Tests"
                value={abTestData.summary.active}
                prefix={<ExperimentOutlined />}
              />
            </Card>
          </Col>
          <Col xs={24} sm={8}>
            <Card size="small">
              <Statistic
                title="Tests with Winners"
                value={abTestData.summary.withWinners}
                prefix={<CheckCircleOutlined />}
              />
            </Card>
          </Col>
          <Col xs={24} sm={8}>
            <Card size="small">
              <Statistic
                title="Avg Improvement"
                value={abTestData.summary.avgImprovement || 0}
                precision={1}
                suffix="%"
                prefix={<TrendingUpOutlined />}
              />
            </Card>
          </Col>
        </Row>
      )}
    </div>
  );

  if (!visible) return null;

  return (
    <Modal
      title={
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span>📊 Advanced Email Analytics</span>
          <Space>
            <Switch
              checkedChildren="Compare"
              unCheckedChildren="Single"
              checked={compareEnabled}
              onChange={setCompareEnabled}
              size="small"
            />
            <RangePicker
              size="small"
              value={dateRange}
              onChange={setDateRange}
              style={{ width: 200 }}
            />
          </Space>
        </div>
      }
      open={visible}
      onCancel={onClose}
      width="95vw"
      style={{ maxWidth: 1400 }}
      footer={null}
      centered
    >
      <Spin spinning={loading} tip="Loading advanced analytics...">
        {error && (
          <Alert
            message="Error Loading Analytics"
            description={error}
            type="error"
            style={{ marginBottom: 16 }}
          />
        )}
        
        <Tabs activeKey={activeTab} onChange={setActiveTab} size="small">
          <TabPane tab={<span><BarChartOutlined /> Overview</span>} key="overview">
            {renderOverviewTab()}
          </TabPane>
          
          <TabPane tab={<span><ThunderboltOutlined /> Deliverability</span>} key="deliverability">
            {renderDeliverabilityTab()}
          </TabPane>
          
          <TabPane tab={<span><TeamOutlined /> Engagement</span>} key="engagement">
            {renderEngagementTab()}
          </TabPane>
          
          <TabPane tab={<span><ExperimentOutlined /> A/B Testing</span>} key="abtesting">
            {renderABTestingTab()}
          </TabPane>
        </Tabs>
      </Spin>
    </Modal>
  );
}
