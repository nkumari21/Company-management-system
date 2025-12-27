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
  Card,
  CardContent,
  Grid,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from '@mui/material';
import axios from 'axios';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';

const Performance = () => {
  const [performance, setPerformance] = useState(null);
  const [leaderboard, setLeaderboard] = useState([]);
  const [loading, setLoading] = useState(true);
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [year, setYear] = useState(new Date().getFullYear());
  const { user } = useAuth();

  const isEmployee = user?.role === 'employee';
  const canViewLeaderboard = user?.role !== 'employee';

  useEffect(() => {
    if (isEmployee) {
      fetchMyPerformance();
    } else {
      fetchLeaderboard();
    }
  }, [month, year, isEmployee]);

  // Refresh performance when performance-updated event is dispatched
  useEffect(() => {
    const handlePerformanceUpdate = () => {
      if (isEmployee) {
        fetchMyPerformance();
      } else {
        fetchLeaderboard();
      }
    };

    window.addEventListener('performance-updated', handlePerformanceUpdate);
    
    // Also refresh when window regains focus (user returns to tab)
    const handleFocus = () => {
      if (isEmployee) {
        fetchMyPerformance();
      } else {
        fetchLeaderboard();
      }
    };
    window.addEventListener('focus', handleFocus);

    return () => {
      window.removeEventListener('performance-updated', handlePerformanceUpdate);
      window.removeEventListener('focus', handleFocus);
    };
  }, [month, year, isEmployee]);

  const fetchMyPerformance = async () => {
    try {
      const res = await axios.get(`/api/performance/my-performance?month=${month}&year=${year}`);
      setPerformance(res.data.data);
    } catch (err) {
      toast.error('Failed to load performance data');
    } finally {
      setLoading(false);
    }
  };

  const fetchLeaderboard = async () => {
    try {
      const res = await axios.get(`/api/performance/leaderboard?month=${month}&year=${year}`);
      setLeaderboard(res.data.data || []);
    } catch (err) {
      toast.error('Failed to load leaderboard');
      setLeaderboard([]);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div>Loading...</div>;
  }

  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 3 }, (_, i) => currentYear - 1 + i);

  return (
    <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
      <Paper sx={{ p: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
          <Typography variant="h5">
            {isEmployee ? 'My Performance' : 'Performance Leaderboard'}
          </Typography>
          <Box sx={{ display: 'flex', gap: 2 }}>
            <FormControl size="small" sx={{ minWidth: 120 }}>
              <InputLabel>Month</InputLabel>
              <Select value={month} onChange={(e) => setMonth(e.target.value)} label="Month">
                {months.map((m, i) => (
                  <MenuItem key={i} value={i + 1}>{m}</MenuItem>
                ))}
              </Select>
            </FormControl>
            <FormControl size="small" sx={{ minWidth: 100 }}>
              <InputLabel>Year</InputLabel>
              <Select value={year} onChange={(e) => setYear(e.target.value)} label="Year">
                {years.map((y) => (
                  <MenuItem key={y} value={y}>{y}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Box>
        </Box>

        {isEmployee && performance ? (
          <Grid container spacing={3}>
            <Grid item xs={12} md={4}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Total Score
                  </Typography>
                  <Typography variant="h3">
                    {performance.totalScore || 0}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} md={4}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Tasks Completed
                  </Typography>
                  <Typography variant="h3">
                    {performance.tasksCompleted || 0}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} md={4}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Late Logins
                  </Typography>
                  <Typography variant="h3" color="error">
                    {performance.lateLogins || 0}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12}>
              <Paper sx={{ p: 2 }}>
                <Typography variant="h6" gutterBottom>
                  Score Breakdown
                </Typography>
                <Typography variant="body1">
                  Task Points: +{performance.scoreBreakdown?.taskPoints || 0}
                </Typography>
                <Typography variant="body1" color="error">
                  Late Login Penalty: {performance.scoreBreakdown?.lateLoginPenalty || 0}
                </Typography>
              </Paper>
            </Grid>
          </Grid>
        ) : (
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Rank</TableCell>
                  <TableCell>Employee</TableCell>
                  <TableCell>Department</TableCell>
                  <TableCell>Score</TableCell>
                  <TableCell>Tasks Completed</TableCell>
                  <TableCell>Late Logins</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {leaderboard.map((entry, index) => (
                  <TableRow key={entry.employeeId?._id || index}>
                    <TableCell>
                      <Chip
                        label={`#${index + 1}`}
                        color={index === 0 ? 'primary' : 'default'}
                      />
                    </TableCell>
                    <TableCell>{entry.employeeId?.name || 'N/A'}</TableCell>
                    <TableCell>{entry.department || 'N/A'}</TableCell>
                    <TableCell>
                      <Typography variant="h6">{entry.totalScore || 0}</Typography>
                    </TableCell>
                    <TableCell>{entry.tasksCompleted || 0}</TableCell>
                    <TableCell>{entry.lateLogins || 0}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}

        {((isEmployee && !performance) || (!isEmployee && leaderboard.length === 0)) && (
          <Box sx={{ textAlign: 'center', py: 4 }}>
            <Typography color="text.secondary">
              No performance data found
            </Typography>
          </Box>
        )}
      </Paper>
    </Container>
  );
};

export default Performance;
