const NodeCache = require('node-cache');
const { cacheTtlSeconds } = require('../config/config');

const cache = new NodeCache({ stdTTL: cacheTtlSeconds, checkperiod: 120 });

function get(key) {
  return cache.get(key);
}

function set(key, value) {
  return cache.set(key, value);
}

function has(key) {
  return cache.has(key);
}

module.exports = {
  get,
  set,
  has,
};
