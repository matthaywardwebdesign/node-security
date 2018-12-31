const ERROR_ALREADY_CONFIGURED = 'NodeSecurity has already been configured.';
const ERROR_NOT_ALLOWED_TO_LOAD = ( module, parent = [] ) => `NodeSecurity has blocked an attempt to access module '${module}'. Parent modules = ['${parent.join( ', ' )}']`;

export default {
  ERROR_ALREADY_CONFIGURED,
  ERROR_NOT_ALLOWED_TO_LOAD,
};