import React, { useState, useEffect } from 'react';
import {
  Container,
  Paper,
  Typography,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Box,
  Button,
  Chip,
  IconButton,
  Badge,
} from '@mui/material';
import {
  Notifications as NotificationsIcon,
  CheckCircle,
  Delete,
  Circle,
} from '@mui/icons-material';
import axios from 'axios';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';

const Notifications = () => {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    fetchNotifications();
    fetchUnreadCount();
  }, []);

  const fetchNotifications = async () => {
    try {
      const res = await axios.get('/api/notifications');
      setNotifications(res.data.notifications || []);
    } catch (err) {
      toast.error('Failed to load notifications');
      setNotifications([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchUnreadCount = async () => {
    try {
      const res = await axios.get('/api/notifications/unread-count');
      setUnreadCount(res.data.unreadCount || 0);
    } catch (err) {
      console.error('Failed to load unread count');
    }
  };

  const handleMarkAsRead = async (notificationId) => {
    try {
      await axios.put(`/api/notifications/${notificationId}/read`);
      fetchNotifications();
      fetchUnreadCount();
    } catch (err) {
      toast.error('Failed to mark as read');
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await axios.put('/api/notifications/mark-all-read');
      toast.success('All notifications marked as read');
      fetchNotifications();
      fetchUnreadCount();
    } catch (err) {
      toast.error('Failed to mark all as read');
    }
  };

  const handleDelete = async (notificationId) => {
    try {
      await axios.delete(`/api/notifications/${notificationId}`);
      toast.success('Notification deleted');
      fetchNotifications();
      fetchUnreadCount();
    } catch (err) {
      toast.error('Failed to delete notification');
    }
  };

  const handleClearRead = async () => {
    try {
      await axios.delete('/api/notifications/clear-read');
      toast.success('Read notifications cleared');
      fetchNotifications();
      fetchUnreadCount();
    } catch (err) {
      toast.error('Failed to clear read notifications');
    }
  };

  const getTypeColor = (type) => {
    switch (type) {
      case 'request_approved': return 'success';
      case 'request_rejected': return 'error';
      case 'role_changed': return 'info';
      case 'task_assigned': return 'primary';
      default: return 'default';
    }
  };

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
      <Paper sx={{ p: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
          <Typography variant="h5">
            Notifications
            {unreadCount > 0 && (
              <Badge badgeContent={unreadCount} color="error" sx={{ ml: 2 }}>
                <NotificationsIcon />
              </Badge>
            )}
          </Typography>
          <Box sx={{ display: 'flex', gap: 1 }}>
            {unreadCount > 0 && (
              <Button onClick={handleMarkAllRead} variant="outlined">
                Mark All Read
              </Button>
            )}
            <Button onClick={handleClearRead} variant="outlined" color="error">
              Clear Read
            </Button>
          </Box>
        </Box>

        <List>
          {notifications.map((notification) => (
            <ListItem
              key={notification._id}
              sx={{
                bgcolor: notification.isRead ? 'transparent' : 'action.hover',
                borderLeft: notification.isRead ? 'none' : '4px solid',
                borderColor: 'primary.main',
                mb: 1,
              }}
            >
              <ListItemIcon>
                {notification.isRead ? (
                  <Circle sx={{ fontSize: 8, color: 'text.disabled' }} />
                ) : (
                  <Circle sx={{ fontSize: 8, color: 'primary.main' }} />
                )}
              </ListItemIcon>
              <ListItemText
                primary={
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Typography variant="subtitle1">{notification.message}</Typography>
                    <Chip
                      label={notification.type}
                      size="small"
                      color={getTypeColor(notification.type)}
                    />
                  </Box>
                }
                secondary={new Date(notification.createdAt).toLocaleString()}
              />
              <Box sx={{ display: 'flex', gap: 1 }}>
                {!notification.isRead && (
                  <IconButton
                    size="small"
                    onClick={() => handleMarkAsRead(notification._id)}
                  >
                    <CheckCircle />
                  </IconButton>
                )}
                <IconButton
                  size="small"
                  color="error"
                  onClick={() => handleDelete(notification._id)}
                >
                  <Delete />
                </IconButton>
              </Box>
            </ListItem>
          ))}
        </List>

        {notifications.length === 0 && (
          <Box sx={{ textAlign: 'center', py: 4 }}>
            <Typography color="text.secondary">
              No notifications found
            </Typography>
          </Box>
        )}
      </Paper>
    </Container>
  );
};

export default Notifications;
