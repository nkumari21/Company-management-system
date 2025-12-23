// frontend/src/pages/Attendance.jsx

import React, { useState, useEffect } from 'react';
import {
  Container,
  Paper,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  Box,
  Alert,
} from '@mui/material';
import axios from 'axios';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';

const Attendance = () => {
  const [attendance, setAttendance] = useState([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    fetchAttendance();
  }, []);

  const fetchAttendance = async () => {
    try {
      const res = await axios.get('/api/attendance');
      setAttendance(res.data.data);
    } catch (err) {
      toast.error('Failed to load attendance');
    } finally {
      setLoading(false);
    }
  };

  // Format time for display
  const formatTime = (timeString) => {
    if (!timeString) return '-';
    return new Date(timeString).toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  };

  // Format date for display
  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString([], {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
      <Paper sx={{ p: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Typography variant="h5">
            Attendance Records
          </Typography>
        </Box>

        <Alert severity="info" sx={{ mb: 3 }}>
          Attendance is automatically marked when you login. Logout time is recorded when you logout from the system.
        </Alert>

        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                {user?.role !== 'employee' && <TableCell>Name</TableCell>}
                {user?.role !== 'employee' && <TableCell>Email</TableCell>}
                <TableCell>Date</TableCell>
                <TableCell>Login Time</TableCell>
                <TableCell>Logout Time</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Department</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {attendance.map((record) => (
                <TableRow key={record._id}>
                  {user?.role !== 'employee' && (
                    <TableCell>{record.user?.name || 'N/A'}</TableCell>
                  )}
                  {user?.role !== 'employee' && (
                    <TableCell>{record.user?.email || 'N/A'}</TableCell>
                  )}
                  <TableCell>
                    {formatDate(record.date)}
                  </TableCell>
                  <TableCell>
                    {record.loginTime ? (
                      <Chip
                        label={formatTime(record.loginTime)}
                        size="small"
                        color="primary"
                        variant="outlined"
                      />
                    ) : (
                      <Typography variant="body2" color="text.secondary">
                        Not logged in
                      </Typography>
                    )}
                  </TableCell>
                  <TableCell>
                    {record.logoutTime ? (
                      <Chip
                        label={formatTime(record.logoutTime)}
                        size="small"
                        color="secondary"
                        variant="outlined"
                      />
                    ) : (
                      <Typography variant="body2" color="text.secondary">
                        Not logged out
                      </Typography>
                    )}
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={record.status}
                      size="small"
                      color={
                        record.status === 'present' ? 'success' :
                        record.status === 'absent' ? 'error' :
                        record.status === 'half-day' ? 'warning' : 'default'
                      }
                    />
                  </TableCell>
                  <TableCell>
                    {record.department || 'N/A'}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>

        {attendance.length === 0 && (
          <Box sx={{ textAlign: 'center', py: 4 }}>
            <Typography color="text.secondary">
              No attendance records found
            </Typography>
          </Box>
        )}
      </Paper>
    </Container>
  );
};

export default Attendance;
