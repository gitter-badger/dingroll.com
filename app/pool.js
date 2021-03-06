var r = require('rethinkdb');
var endex = require('endex');
var Promise = require('bluebird');

module.exports = function poolCtor(cfg) {
  var pool = {};
  var serverReportError = console.error.bind(console);

  var conn;

  function runQueryNormally(query) {
    return query.run(conn);
  }

  var connPromise = r.connect(cfg.rethinkdb).then(function(connection) {
    conn = connection;
    pool.runQuery = runQueryNormally;
    return endex(r).db(cfg.rethinkdb && cfg.rethinkdb.db || 'dingroll')
      .table('users')
        .index('username')
      .table('messages')
        .index('sender')
        .index('target')
        .index('creation')
        .index('mentions', {multi: true})
        .index('hashtags', {multi: true})
      .run(connection);
  }).catch(serverReportError);

  pool.runQuery = function queueQueryRun(query) {
    return new Promise(function(resolve, reject) {
      connPromise.then(function(conn){
        query.run(conn).then(resolve, reject);
        return conn;
      });
    });
  };

  return pool;
};
