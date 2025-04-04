import React, { useState, useEffect } from 'react';
import Header from './components/Header';
import Footer from './components/Footer';
import Form from './components/Form';
import EntriesTable from './components/EntriesTable';
import Message from './components/Message';
import { fetchEntries, addEntry, deleteEntry } from './api';
import './App.css';

const App = () => {
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [isSuccess, setIsSuccess] = useState(true);

  useEffect(() => {
    loadEntries();
  }, []);

  const loadEntries = async () => {
    setLoading(true);
    try {
      const data = await fetchEntries();
      setEntries(data);
    } catch (error) {
      setMessage('Failed to fetch entries. Please try again.');
      setIsSuccess(false);
    } finally {
      setLoading(false);
    }
  };

  const handleAddEntry = async (entry) => {
    try {
      await addEntry(entry);
      setMessage('Record added successfully!');
      setIsSuccess(true);
      loadEntries();
    } catch (error) {
      setMessage('Failed to add record. Please try again.');
      setIsSuccess(false);
    }
  };

  const handleDeleteEntry = async (id) => {
    if (!window.confirm('Are you sure you want to delete this record?')) return;

    try {
      await deleteEntry(id);
      setMessage('Record deleted successfully!');
      setIsSuccess(true);
      loadEntries();
    } catch (error) {
      setMessage('Failed to delete record. Please try again.');
      setIsSuccess(false);
    }
  };

  return (
    <div className="App">
      <Header />
      <div className="container">
        <Form onAddEntry={handleAddEntry} />
        <EntriesTable entries={entries} onDeleteEntry={handleDeleteEntry} />
        {loading && <div className="loading">Loading...</div>}
        <Message message={message} isSuccess={isSuccess} />
      </div>
      <Footer />
    </div>
  );
};

export default App;