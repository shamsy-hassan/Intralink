import React from 'react';
import AdminDashboard from './AdminDashboard';
import DashboardOverview from './DashboardOverview';

const AdminPage: React.FC = () => {
  return (
    <AdminDashboard>
      <DashboardOverview />
    </AdminDashboard>
  );
};

export default AdminPage;