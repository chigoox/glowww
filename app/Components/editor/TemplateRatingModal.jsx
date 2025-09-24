/**
 * Template Rating & Comment System
 * Handles user ratings, comments, and interactions for marketplace templates
 */

'use client';

import React, { useState, useEffect } from 'react';
import {
  Modal, Rate, Button, Input, message, List, Avatar, Typography, 
  Space, Divider, Tooltip, Tag, Alert, Form, Card, Collapse,
  Popconfirm, Select
} from 'antd';
import {
  StarOutlined, MessageOutlined, LikeOutlined, DislikeOutlined,
  UserOutlined, CalendarOutlined, FlagOutlined, ReplyArrowOutlined
} from '@ant-design/icons';
import { useAuth } from '../../../contexts/AuthContext';
import moment from 'moment';

const { TextArea } = Input;
const { Text, Paragraph } = Typography;
const { Panel } = Collapse;
const { Option } = Select;

const TemplateRatingModal = ({ 
  visible, 
  onCancel, 
  template, 
  onRatingUpdate 
}) => {
  const [form] = Form.useForm();
  const [submitting, setSubmitting] = useState(false);
  const [ratings, setRatings] = useState([]);
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [userRating, setUserRating] = useState(null);
  const [sortBy, setSortBy] = useState('newest');
  
  const { user } = useAuth();

  useEffect(() => {
    if (visible && template) {
      loadRatingsAndComments();
      checkUserRating();
    }
  }, [visible, template]);

  const loadRatingsAndComments = async () => {
    setLoading(true);
    try {
      // In a real implementation, this would be a separate API endpoint
      // For now, we'll use the template data
      setRatings(template.ratings || []);
      setComments(template.comments || []);
    } catch (error) {
      console.error('Error loading ratings:', error);
    } finally {
      setLoading(false);
    }
  };

  const checkUserRating = () => {
    if (user && template.ratings) {
      const existing = template.ratings.find(r => r.userId === user.uid);
      if (existing) {
        setUserRating(existing);
        form.setFieldsValue({
          rating: existing.score,
          comment: existing.comment
        });
      }
    }
  };

  const handleSubmitRating = async (values) => {
    if (!user) {
      message.error('Please sign in to rate templates');
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch('/api/templates?action=rate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          templateId: template.id,
          rating: values.rating,
          comment: values.comment || ''
        })
      });

      const result = await response.json();
      
      if (result.success) {
        message.success('Rating submitted successfully!');
        setUserRating({
          userId: user.uid,
          score: values.rating,
          comment: values.comment || '',
          createdAt: new Date()
        });
        
        // Update parent component
        if (onRatingUpdate) {
          onRatingUpdate(result.qualityScore);
        }
        
        loadRatingsAndComments();
      } else {
        message.error(result.error || 'Failed to submit rating');
      }
    } catch (error) {
      console.error('Error submitting rating:', error);
      message.error('Failed to submit rating');
    } finally {
      setSubmitting(false);
    }
  };

  const handleReportContent = async (contentId, contentType, reason) => {
    try {
      // Report implementation would go here
      message.success('Content reported. Thank you for helping keep our community safe.');
    } catch (error) {
      message.error('Failed to report content');
    }
  };

  const handleHelpfulVote = async (ratingId, isHelpful) => {
    if (!user) {
      message.error('Please sign in to vote');
      return;
    }

    try {
      // Helpful vote implementation would go here
      message.success('Thank you for your feedback!');
      loadRatingsAndComments();
    } catch (error) {
      message.error('Failed to submit vote');
    }
  };

  const sortedRatings = [...ratings].sort((a, b) => {
    switch (sortBy) {
      case 'helpful':
        return (b.isHelpful || 0) - (a.isHelpful || 0);
      case 'rating-high':
        return b.score - a.score;
      case 'rating-low':
        return a.score - b.score;
      case 'oldest':
        return new Date(a.createdAt) - new Date(b.createdAt);
      default: // newest
        return new Date(b.createdAt) - new Date(a.createdAt);
    }
  });

  const RatingItem = ({ rating }) => (
    <List.Item
      key={rating.userId}
      actions={[
        <Space key="helpful">
          <Button
            type="text"
            size="small"
            icon={<LikeOutlined />}
            onClick={() => handleHelpfulVote(rating.userId, true)}
          >
            {rating.isHelpful || 0}
          </Button>
        </Space>,
        <Tooltip key="report" title="Report inappropriate content">
          <Popconfirm
            title="Report this review?"
            description="Please select a reason:"
            onConfirm={(reason) => handleReportContent(rating.userId, 'rating', reason)}
            okText="Report"
            cancelText="Cancel"
          >
            <Button type="text" size="small" icon={<FlagOutlined />} />
          </Popconfirm>
        </Tooltip>
      ]}
    >
      <List.Item.Meta
        avatar={<Avatar icon={<UserOutlined />} />}
        title={
          <Space>
            <Text strong>Anonymous User</Text>
            <Rate disabled value={rating.score} style={{ fontSize: 14 }} />
            <Text type="secondary" style={{ fontSize: 12 }}>
              {moment(rating.createdAt).fromNow()}
            </Text>
          </Space>
        }
        description={
          rating.comment && (
            <Paragraph style={{ marginBottom: 0, marginTop: 8 }}>
              {rating.comment}
            </Paragraph>
          )
        }
      />
    </List.Item>
  );

  return (
    <Modal
      title={
        <Space>
          <StarOutlined />
          Rate & Review: {template?.name}
        </Space>
      }
      open={visible}
      onCancel={onCancel}
      width={800}
      footer={null}
      centered
    >
      <div style={{ maxHeight: 600, overflowY: 'auto' }}>
        {/* Template Info Header */}
        <Card size="small" style={{ marginBottom: 16 }}>
          <Space direction="vertical" style={{ width: '100%' }}>
            <Space>
              <Rate disabled allowHalf value={template?.averageRating || 0} />
              <Text strong>{template?.averageRating?.toFixed(1) || 0}</Text>
              <Text type="secondary">({template?.totalRatings || 0} ratings)</Text>
            </Space>
            <Space wrap>
              <Tag color="blue">{template?.category}</Tag>
              {template?.tags?.map(tag => (
                <Tag key={tag}>{tag}</Tag>
              ))}
            </Space>
          </Space>
        </Card>

        {/* User Rating Form */}
        {user && (
          <Card title="Your Rating" size="small" style={{ marginBottom: 16 }}>
            <Form
              form={form}
              onFinish={handleSubmitRating}
              layout="vertical"
            >
              <Form.Item
                name="rating"
                label="Rating"
                rules={[{ required: true, message: 'Please provide a rating' }]}
              >
                <Rate />
              </Form.Item>

              <Form.Item
                name="comment"
                label="Review (Optional)"
              >
                <TextArea
                  rows={3}
                  placeholder="Share your experience with this template..."
                  maxLength={500}
                  showCount
                />
              </Form.Item>

              <Form.Item>
                <Space>
                  <Button 
                    type="primary" 
                    htmlType="submit" 
                    loading={submitting}
                  >
                    {userRating ? 'Update Rating' : 'Submit Rating'}
                  </Button>
                  {userRating && (
                    <Text type="secondary" style={{ fontSize: 12 }}>
                      You rated this template {userRating.score} stars
                    </Text>
                  )}
                </Space>
              </Form.Item>
            </Form>
          </Card>
        )}

        {/* Ratings & Reviews */}
        <Card 
          title={
            <Space style={{ justifyContent: 'space-between', width: '100%' }}>
              <span>Ratings & Reviews ({ratings.length})</span>
              <Select
                value={sortBy}
                onChange={setSortBy}
                size="small"
                style={{ width: 120 }}
              >
                <Option value="newest">Newest</Option>
                <Option value="oldest">Oldest</Option>
                <Option value="rating-high">Highest Rated</Option>
                <Option value="rating-low">Lowest Rated</Option>
                <Option value="helpful">Most Helpful</Option>
              </Select>
            </Space>
          }
          size="small"
        >
          {ratings.length === 0 ? (
            <Alert
              message="No ratings yet"
              description="Be the first to rate this template and help others!"
              type="info"
              showIcon
            />
          ) : (
            <List
              dataSource={sortedRatings}
              renderItem={(rating) => <RatingItem rating={rating} />}
              pagination={ratings.length > 5 ? { pageSize: 5 } : false}
            />
          )}
        </Card>

        {/* Quality Score Info */}
        {template?.qualityScore && (
          <Alert
            message="Quality Score Information"
            description={
              <div>
                <p>
                  <Text strong>Quality Score:</Text> {template.qualityScore.wilson}/5.0
                  {template.qualityScore.isQualityForAI && (
                    <Tag color="green" style={{ marginLeft: 8 }}>AI Approved</Tag>
                  )}
                  {template.qualityScore.isFeatured && (
                    <Tag color="gold" style={{ marginLeft: 4 }}>Featured</Tag>
                  )}
                </p>
                <p>
                  Templates with 4+ stars and 10+ ratings are eligible for AI generation features.
                  Featured templates have 4.5+ stars and 20+ ratings.
                </p>
              </div>
            }
            type="info"
            style={{ marginTop: 16 }}
          />
        )}
      </div>
    </Modal>
  );
};

export default TemplateRatingModal;