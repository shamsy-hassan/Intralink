import React, { useEffect, useState } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import {
  Box,
  Container,
  Grid,
  Paper,
  Typography,
  Card,
  CardContent,
  Skeleton,
  Alert,
  Chip,
  Stack,
  IconButton,
  useTheme,
  useMediaQuery,
  alpha
} from '@mui/material';
import {
  Refresh,
  Email,
  Chat,
  Groups,
  TrendingUp,
  Info
} from '@mui/icons-material';
import { analyticsAPI } from '../../lib/api';

// Define the data types for better type safety
interface MessageVolumeData {
  name: string;
  sent: number;
}

interface DepartmentData {
  name: string;
  value: number; // For PieChart
}

interface StatsCardProps {
  title: string;
  value: string;
  icon: React.ReactNode;
  color: string;
}

// CustomTooltip props from recharts
interface CustomTooltipProps {
    active?: boolean;
    payload?: Array<{
        name: string;
        value: number | string;
        color: string;
    }>;
    label?: string;
}

const CommunicationAnalytics: React.FC = () => {
  // Use specific types for useState
  const [messageVolume, setMessageVolume] = useState<MessageVolumeData[]>([]);
  const [messagesByDepartment, setMessagesByDepartment] = useState<DepartmentData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      // Assuming analyticsAPI.getCommunicationAnalytics() returns data in the expected structure
      const response = await analyticsAPI.getCommunicationAnalytics();
      setMessageVolume(response.data.message_volume || []); // Use empty array fallback
      setMessagesByDepartment(response.data.messages_by_department || []); // Use empty array fallback
    } catch (err) {
      setError('Failed to fetch analytics data. Please try again.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const chartColors = [
    theme.palette.primary.main,
    theme.palette.secondary.main,
    theme.palette.success.main,
    theme.palette.warning.main,
    theme.palette.error.main,
    theme.palette.info.main,
  ];

  // Use the defined StatsCardProps interface
  const StatsCard: React.FC<StatsCardProps> = ({ title, value, icon, color }) => (
    <Card sx={{ height: '100%' }}>
      <CardContent>
        <Stack direction="row" alignItems="center" spacing={2}>
          <Box
            sx={{
              backgroundColor: alpha(color, 0.1),
              borderRadius: 2,
              p: 1.5,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            {icon}
          </Box>
          <Box>
            <Typography variant="body2" color="text.secondary">
              {title}
            </Typography>
            <Typography variant="h5" fontWeight="bold">
              {loading ? <Skeleton width={80} /> : value}
            </Typography>
          </Box>
        </Stack>
      </CardContent>
    </Card>
  );

  // Use the defined CustomTooltipProps interface
  const CustomTooltip: React.FC<CustomTooltipProps> = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <Paper elevation={3} sx={{ p: 2 }}>
          <Typography variant="body2" fontWeight="bold">{label}</Typography>
          {payload.map((entry, index: number) => (
            <Typography key={index} variant="body2" sx={{ color: entry.color || theme.palette.text.primary }}>
              {entry.name}: {typeof entry.value === 'number' ? entry.value.toLocaleString() : entry.value}
            </Typography>
          ))}
        </Paper>
      );
    }
    return null;
  };

  // Helper functions to safely calculate statistics, returning defaults for empty arrays
  const totalMessages = messageVolume.reduce((acc, curr) => acc + curr.sent, 0);
  const avgMonthly = messageVolume.length > 0
    ? Math.round(totalMessages / messageVolume.length)
    : 0;

  const peakMonth = messageVolume.length > 0
    ? messageVolume.reduce((max, curr) => (curr.sent > max.sent ? curr : max), messageVolume[0]).name
    : 'N/A';

  const mostActiveDepartment = messagesByDepartment.length > 0
    ? messagesByDepartment.reduce((max, curr) => (curr.value > max.value ? curr : max), messagesByDepartment[0]).name
    : 'N/A';
  
  // Use a sensible default object for the `reduce` initial value when finding the peak month or most active department
  // The original implementation used a non-typed initial value which can be fixed with logic or better initial state handling.
  // The issue in the original code was that `messageVolume.reduce((max: any, curr: any) => curr.sent > max.sent ? curr : max)` 
  // without an initial value will fail if the array is empty. 
  // By checking `messageVolume.length > 0` before the reduce, we avoid the error.

  if (error && !loading) {
    return (
      <Container maxWidth="xl" sx={{ py: 4 }}>
        <Alert
          severity="error"
          action={
            <IconButton onClick={fetchData} color="inherit" size="small">
              <Refresh />
            </IconButton>
          }
        >
          {error}
        </Alert>
      </Container>
    );
  }

  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Stack direction="row" justifyContent="space-between" alignItems="center" spacing={2}>
          <Box>
            <Typography variant="h4" fontWeight="bold" gutterBottom>
              Communication Analytics
            </Typography>
            <Typography variant="body1" color="text.secondary">
              Monitor message volume and department-wise communication patterns
            </Typography>
          </Box>
          <IconButton onClick={fetchData} disabled={loading}>
            <Refresh />
          </IconButton>
        </Stack>
      </Box>

      {/* Stats Cards */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <StatsCard
            title="Total Messages"
            value={loading ? '' : totalMessages.toLocaleString()}
            icon={<Email sx={{ color: theme.palette.primary.main }} />}
            color={theme.palette.primary.main}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatsCard
            title="Avg. Monthly"
            value={loading ? '' : avgMonthly.toLocaleString()}
            icon={<TrendingUp sx={{ color: theme.palette.success.main }} />}
            color={theme.palette.success.main}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatsCard
            title="Departments"
            value={loading ? '' : messagesByDepartment.length.toString()}
            icon={<Groups sx={{ color: theme.palette.secondary.main }} />}
            color={theme.palette.secondary.main}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatsCard
            title="Peak Month"
            value={loading ? '' : peakMonth}
            icon={<Chat sx={{ color: theme.palette.warning.main }} />}
            color={theme.palette.warning.main}
          />
        </Grid>
      </Grid>

      {/* Charts Grid */}
      <Grid container spacing={3}>
        {/* Message Volume Chart */}
        <Grid item xs={12} lg={8}>
          <Paper
            elevation={0}
            sx={{
              p: 3,
              borderRadius: 3,
              height: '100%',
              border: `1px solid ${theme.palette.divider}`,
              bgcolor: 'background.paper'
            }}
          >
            <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 3 }}>
              <Box>
                <Typography variant="h6" fontWeight="bold">
                  Message Volume Trend
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Last {messageVolume.length} months of communication activity
                </Typography>
              </Box>
              <Chip
                icon={<Info />}
                label="Sent Messages"
                size="small"
                sx={{ bgcolor: alpha(theme.palette.primary.main, 0.1) }}
              />
            </Stack>

            {loading || messageVolume.length === 0 ? (
              <Skeleton variant="rectangular" height={400} sx={{ borderRadius: 2 }} />
            ) : (
              <ResponsiveContainer width="100%" height={400}>
                <BarChart data={messageVolume}>
                  <CartesianGrid strokeDasharray="3 3" stroke={theme.palette.divider} />
                  <XAxis
                    dataKey="name"
                    tick={{ fill: theme.palette.text.secondary }}
                    axisLine={{ stroke: theme.palette.divider }}
                  />
                  <YAxis
                    tick={{ fill: theme.palette.text.secondary }}
                    axisLine={{ stroke: theme.palette.divider }}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend />
                  <Bar
                    dataKey="sent"
                    name="Messages Sent"
                    fill={theme.palette.primary.main}
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            )}
          </Paper>
        </Grid>

        {/* Department Distribution Chart */}
        <Grid item xs={12} lg={4}>
          <Paper
            elevation={0}
            sx={{
              p: 3,
              borderRadius: 3,
              height: '100%',
              border: `1px solid ${theme.palette.divider}`,
              bgcolor: 'background.paper'
            }}
          >
            <Typography variant="h6" fontWeight="bold" gutterBottom>
              Department Distribution
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              Messages by department
            </Typography>

            {loading || messagesByDepartment.length === 0 ? (
              <Skeleton variant="circular" width={300} height={300} sx={{ mx: 'auto' }} />
            ) : (
              <ResponsiveContainer width="100%" height={350}>
                <PieChart>
                  <Pie
                    data={messagesByDepartment}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    // Type for entry is DepartmentData
                    label={({ name, value }) => `${name}: ${value.toLocaleString()}`} 
                    outerRadius={isMobile ? 80 : 100}
                    fill="#8884d8"
                    dataKey="value"
                    nameKey="name"
                  >
                    {messagesByDepartment.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={chartColors[index % chartColors.length]}
                        stroke={theme.palette.background.paper}
                        strokeWidth={2}
                      />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                  {!isMobile && <Legend />}
                </PieChart>
              </ResponsiveContainer>
            )}

            {!loading && messagesByDepartment.length > 0 && (
              <Grid container spacing={1} sx={{ mt: 2 }}>
                {messagesByDepartment.map((dept: DepartmentData, index: number) => (
                  <Grid item xs={6} key={dept.name}>
                    <Stack direction="row" alignItems="center" spacing={1}>
                      <Box
                        sx={{
                          width: 12,
                          height: 12,
                          borderRadius: '50%',
                          bgcolor: chartColors[index % chartColors.length]
                        }}
                      />
                      <Typography variant="body2" noWrap>
                        {dept.name}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        ({dept.value.toLocaleString()})
                      </Typography>
                    </Stack>
                  </Grid>
                ))}
              </Grid>
            )}
          </Paper>
        </Grid>
      </Grid>

      {/* Data Summary */}
      {!loading && (
        <Paper
          elevation={0}
          sx={{
            mt: 3,
            p: 3,
            borderRadius: 3,
            border: `1px solid ${theme.palette.divider}`,
            bgcolor: alpha(theme.palette.primary.main, 0.02)
          }}
        >
          <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
            Insights
          </Typography>
          <Grid container spacing={2}>
            <Grid item xs={12} md={6}>
              <Typography variant="body2">
                • Highest message volume in{' '}
                <strong>{peakMonth}</strong>
              </Typography>
              <Typography variant="body2">
                • Department with most messages:{' '}
                <strong>{mostActiveDepartment}</strong>
              </Typography>
            </Grid>
            <Grid item xs={12} md={6}>
              <Typography variant="body2">
                • Average monthly messages:{' '}
                <strong>{avgMonthly.toLocaleString()}</strong>
              </Typography>
              <Typography variant="body2">
                • Total departments tracked:{' '}
                <strong>{messagesByDepartment.length}</strong>
              </Typography>
            </Grid>
          </Grid>
        </Paper>
      )}
    </Container>
  );
};

export default CommunicationAnalytics;