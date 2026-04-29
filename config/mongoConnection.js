import { MongoClient } from 'mongodb';
import { dbSettings } from './settings.js';

// keeping a single client instance so we're not reopening connections
// on every request. this pattern is called connection pooling.
let _connection = undefined;
let _db = undefined;

const dbConnection = async () => {
  if (_db) return _db;

  // only creating the client if one doesn't already exist
  if (!_connection) {
    _connection = await MongoClient.connect(dbSettings.serverUrl);
  }

  _db = _connection.db(dbSettings.dbName);
  return _db;
};

const closeConnection = async () => {
  if (_connection) {
    await _connection.close();
    _connection = undefined;
    _db = undefined;
  }
};

export { dbConnection, closeConnection };