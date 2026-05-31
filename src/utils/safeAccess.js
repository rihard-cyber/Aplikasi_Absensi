// src/utils/safeAccess.js
import _ from 'lodash';

/**
 * Safely accesses a property on an object by key, preventing prototype pollution.
 * 
 * @param {Object} obj The object to query.
 * @param {string} key The key of the property to get.
 * @param {*} defaultValue The value returned if the resolved value is undefined.
 * @returns {*} Returns the resolved value.
 */
export const safeGet = (obj, key, defaultValue) => {
  if (!obj || typeof obj !== 'object') {
    return defaultValue;
  }
  
  // Guard against prototype pollution keys
  if (key === '__proto__' || key === 'constructor' || key === 'prototype') {
    return defaultValue;
  }

  // To be absolutely safe against prototype access, verify it's not a function/property of Object.prototype
  if (typeof Object.prototype[key] !== 'undefined') {
    // If the key exists on Object.prototype, check if it's an own property of the target object
    if (!Object.prototype.hasOwnProperty.call(obj, key)) {
      return defaultValue;
    }
  }

  return _.get(obj, key, defaultValue);
};
