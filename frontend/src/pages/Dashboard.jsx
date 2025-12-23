// frontend/src/pages/Dashboard.jsx

import React, { useState, useEffect } from 'react';
import {
  Container,
  Grid,
  Paper,
  Typography,
  Box,
  Card,
  CardContent,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
} from '@mui/material';
import {
  People as PeopleIcon,
  Assignment as TaskIcon,
  AttachMoney as MoneyIcon,
  CalendarToday as CalendarIcon,
} from '@mui/icons-material';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';
import toast from 'react-hot-toast';

const Dashboard = () => {
  const { user } = useAuth();
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const res = await axios.get('/api/dashboard');
      setDashboardData(res.data.data);
    } catch (err) {
      toast.error('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div>Loading...</div>;
  }

  const renderFounderDashboard = () => (
    <Grid container spacing={3}>
      <Grid item xs={12}>
        <Paper sx={{ p: 3 }}>
          <Typography variant="h5" gutterBottom>
            Founder Dashboard
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Full access to all company data and settings
          </Typography>
        </Paper>
      </Grid>
      
      <Grid item xs={12} md={3}>
        <Card>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
              <PeopleIcon color="primary" sx={{ mr: 1 }} />
              <Typography variant="h6">Total Users</Typography>
            </Box>
            <Typography variant="h4">{dashboardData?.stats?.totalUsers || 0}</Typography>
          </CardContent>
        </Card>
      </Grid>
      
      <Grid item xs={12} md={3}>
        <Card>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
              <TaskIcon color="primary" sx={{ mr: 1 }} />
              <Typography variant="h6">Total Tasks</Typography>
            </Box>
            <Typography variant="h4">{dashboardData?.stats?.totalTasks || 0}</Typography>
          </CardContent>
        </Card>
      </Grid>
      
      <Grid item xs={12} md={3}>
        <Card>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
              <CalendarIcon color="primary" sx={{ mr: 1 }} />
              <Typography variant="h6">Departments</Typography>
            </Box>
            <Typography variant="h4">{dashboardData?.stats?.totalDepartments || 0}</Typography>
          </CardContent>
        </Card>
      </Grid>
      
      <Grid item xs={12} md={3}>
        <Card>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
              <MoneyIcon color="primary" sx={{ mr: 1 }} />
              <Typography variant="h6">Active Employees</Typography>
            </Box>
            <Typography variant="h4">{dashboardData?.stats?.activeEmployees || 0}</Typography>
          </CardContent>
        </Card>
      </Grid>
      
      <Grid item xs={12}>
        <Paper sx={{ p: 3 }}>
          <Typography variant="h6" gutterBottom>
            Recent Attendance
          </Typography>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Name</TableCell>
                  <TableCell>Email</TableCell>
                  <TableCell>Date</TableCell>
                  <TableCell>Check In</TableCell>
                  <TableCell>Status</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {dashboardData?.recentActivity?.map((attendance) => (
                  <TableRow key={attendance._id}>
                    <TableCell>{attendance.user?.name}</TableCell>
                    <TableCell>{attendance.user?.email}</TableCell>
                    <TableCell>
                      {new Date(attendance.date).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      {attendance.checkIn ? 
                        new Date(attendance.checkIn).toLocaleTimeString() : 
                        'Not checked in'
                      }
                    </TableCell>
                    <TableCell>
                      <Chip 
                        label={attendance.status} 
                        color={
                          attendance.status === 'present' ? 'success' : 
                          attendance.status === 'absent' ? 'error' : 'warning'
                        }
                        size="small"
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>
      </Grid>
    </Grid>
  );

  const renderEmployeeDashboard = () => (
    <Grid container spacing={3}>
      <Grid item xs={12}>
        <Paper sx={{ p: 3 }}>
          <Typography variant="h5" gutterBottom>
            Employee Dashboard
          </Typography>
          <Typography variant="body1" color="text.secondary">
            View your tasks, attendance, and salary information
          </Typography>
        </Paper>
      </Grid>
      
      <Grid item xs={12} md={4}>
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Pending Tasks
            </Typography>
            <Typography variant="h3">
              {dashboardData?.stats?.pendingTasks || 0}
            </Typography>
          </CardContent>
        </Card>
      </Grid>
      
      <Grid item xs={12} md={4}>
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Completed Tasks
            </Typography>
            <Typography variant="h3">
              {dashboardData?.stats?.completedTasks || 0}
            </Typography>
          </CardContent>
        </Card>
      </Grid>
      
      <Grid item xs={12} md={4}>
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Attendance Days
            </Typography>
            <Typography variant="h3">
              {dashboardData?.stats?.attendanceDays || 0}
            </Typography>
          </CardContent>
        </Card>
      </Grid>
      
      <Grid item xs={12} md={6}>
        <Paper sx={{ p: 3 }}>
          <Typography variant="h6" gutterBottom>
            Recent Tasks
          </Typography>
          {dashboardData?.recentTasks?.map((task) => (
            <Box key={task._id} sx={{ mb: 2, p: 2, border: '1px solid #eee', borderRadius: 1 }}>
              <Typography variant="subtitle1">{task.title}</Typography>
              <Typography variant="body2" color="text.secondary">
                Status: <Chip label={task.status} size="small" />
              </Typography>
            </Box>
          ))}
        </Paper>
      </Grid>
      
      <Grid item xs={12} md={6}>
        <Paper sx={{ p: 3 }}>
          <Typography variant="h6" gutterBottom>
            Recent Attendance
          </Typography>
          {dashboardData?.recentAttendance?.map((attendance) => (
            <Box key={attendance._id} sx={{ mb: 1, display: 'flex', justifyContent: 'space-between' }}>
              <Typography variant="body2">
                {new Date(attendance.date).toLocaleDateString()}
              </Typography>
              <Chip 
                label={attendance.status} 
                size="small"
                color={
                  attendance.status === 'present' ? 'success' : 
                  attendance.status === 'absent' ? 'error' : 'warning'
                }
              />
            </Box>
          ))}
        </Paper>
      </Grid>
    </Grid>
  );

  const renderDepartmentHeadDashboard = () => (
    <Grid container spacing={3}>
      <Grid item xs={12}>
        <Paper sx={{ p: 3 }}>
          <Typography variant="h5" gutterBottom>
            {dashboardData?.role} Dashboard
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Manage your department: {dashboardData?.department}
          </Typography>
        </Paper>
      </Grid>
      
      <Grid item xs={12} md={4}>
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Team Size
            </Typography>
            <Typography variant="h3">
              {dashboardData?.stats?.teamSize || 0}
            </Typography>
          </CardContent>
        </Card>
      </Grid>
      
      <Grid item xs={12} md={4}>
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Active Tasks
            </Typography>
            <Typography variant="h3">
              {dashboardData?.stats?.activeTasks || 0}
            </Typography>
          </CardContent>
        </Card>
      </Grid>
      
      <Grid item xs={12} md={4}>
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Completed Tasks
            </Typography>
            <Typography variant="h3">
              {dashboardData?.stats?.completedTasks || 0}
            </Typography>
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  );

  const renderDashboard = () => {
    switch (user?.role) {
      case 'founder':
        return renderFounderDashboard();
      case 'co-founder':
        return renderFounderDashboard();
      case 'technical_head':
      case 'sales_head':
      case 'finance_head':
        return renderDepartmentHeadDashboard();
      case 'employee':
        return renderEmployeeDashboard();
      default:
        return <div>Unknown role</div>;
    }
  };

  return (
    <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
      {renderDashboard()}
    </Container>
  );
};

export default Dashboard;