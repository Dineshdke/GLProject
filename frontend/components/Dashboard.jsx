
import React from 'react';
import { Link } from 'react-router-dom';

const Dashboard = () => {
  return (
    <div>
      <h1>Dashboard</h1>
      <Link to="/projects">View Projects</Link>
      <br />
      <Link to="/tasks">View Tasks</Link>
    </div>
  );
};

export default Dashboard;
