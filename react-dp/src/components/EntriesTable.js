import React from 'react';
import './EntriesTable.css';

const EntriesTable = ({ entries, onDeleteEntry }) => {
  return (
    <div className="entries-container">
      <h2>Entries</h2>
      <div className="table-wrapper">
        <table>
          <thead>
            <tr>
              <th>ID</th>
              <th>Amount</th>
              <th>Description</th>
              <th>Action</th>
            </tr>
          </thead>
        </table>
        <div className="table-body">
          <table>
            <tbody>
              {entries.map(entry => (
                <tr key={entry.id}>
                  <td>{entry.id}</td>
                  <td>{entry.amount}</td>
                  <td>{entry.description}</td>
                  <td>
                    <button onClick={() => onDeleteEntry(entry.id)}>Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default EntriesTable;