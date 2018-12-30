/**
 * Node Security
 * 
 * Core Concept:
 * The core concept behind NodeSecurity is controlling access to
 * the NodeJS built-in / core modules (fs, net) etc. With addition
 * to the ability to block / allow core modules from being used,
 * the plugin architecture also allows us to create more fine
 * grained access control. One example of this would only be
 * permitting file access to a particular set of files.
 * 
 * Default Behaviour:
 * By default all core modules are blocked and will throw runtime
 * exceptions when they are loaded.
 * 
 * Plugins:
 * A NodeSecurity plugin allows a core or third party module to 
 * have its implementation replaced, allowing for a 
 * finer grained control.
 */

import Module from 'module';
import ModuleLoader from './ModuleLoader';
import NodeSecurityPlugin from './plugins/NodeSecurityPlugin';
import Errors from './Errors.js';

class NodeSecurity {
  constructor() {
    /* Create an object to store the current configuration */
    this.config = {
      /* By default all core node modules are disabled */
      core: {
        assert: false,
        buffer: false,
        child_process: false,
        cluster: false,
        crypto: false,
        dgram: false,
        dns: false,
        domain: false,
        events: false,
        fs: false,
        http: false,
        http2: false,
        https: false,
        inspector: false,
        module: false,
        net: false,
        os: false,
        path: false,
        perf_hooks: false,
        punycode: false,
        querystring: false,
        readline: false,
        stream: false,
        string_decoder: false,
        timers: false,
        tls: false,
        tty: false,
        url: false,
        util: false,
        v8: false,
        vm: false,
        zlib: false,
        /**
         * We also consider node-security itself to be a core
         * module. This protects against downstream objects
         * trying to override us.
         **/
        'node-security': false,
      },
      /**
       * The module section of the config stores permissions
       * for individual modules.
       **/
      module: {},
      /**
       * The env config option is specified removes all of the
       * values except for those specified.
       */
      env: null,
      /**
       * Create an object to store all of the plugins 
       * Any additions to the core plugins needed to be included here.
       **/
      plugins: {
        assert: NodeSecurityPlugin,
        buffer: NodeSecurityPlugin,
        child_process: NodeSecurityPlugin,
        cluster: NodeSecurityPlugin,
        crypto: NodeSecurityPlugin,
        dgram: NodeSecurityPlugin,
        dns: NodeSecurityPlugin,
        domain: NodeSecurityPlugin,
        events: NodeSecurityPlugin,
        fs: NodeSecurityPlugin,
        http: NodeSecurityPlugin,
        http2: NodeSecurityPlugin,
        https: NodeSecurityPlugin,
        inspector: NodeSecurityPlugin,
        module: NodeSecurityPlugin,
        net: NodeSecurityPlugin,
        os: NodeSecurityPlugin,
        path: NodeSecurityPlugin,
        perf_hooks: NodeSecurityPlugin,
        punycode: NodeSecurityPlugin,
        querystring: NodeSecurityPlugin,
        readline: NodeSecurityPlugin,
        stream: NodeSecurityPlugin,
        string_decoder: NodeSecurityPlugin,
        timers: NodeSecurityPlugin,
        tls: NodeSecurityPlugin,
        tty: NodeSecurityPlugin,
        url: NodeSecurityPlugin,
        util: NodeSecurityPlugin,
        v8: NodeSecurityPlugin,
        vm: NodeSecurityPlugin,
        zlib: NodeSecurityPlugin,
      },
    };

    /**
     * Store whether or not NodeSecurity has already been configured. We use
     * this value to protect against it being reconfigured by a malicious
     * third party module.
     * */
    this.configured = false;
  }

  /* Called by the user with their own NodeSecurity configuration */
  configure = ( userConfig = {}) => {
    /**
     * Firstly check whether we've already configured NodeSecurity. If so
     * let's throw an error.
     * */
    if ( this.configured ) {
      throw new Error( Errors.ERROR_ALREADY_CONFIGURED );
    }

    /* Combine the default config with the user provided config */
    this.config = {
      core: { ...this.config.core, ...userConfig.core || {}},
      module: { ...this.config.module, ...userConfig.module || {}},
      env: userConfig.env,
      plugins: { ...this.config.plugins, ...userConfig.plugins || {}},
    };

    /**
     * Replace all of the module names with their resolved package
     * paths.
     */
    this.config.module = Object
      .keys( this.config.module )
      .map( key => ({
        key: require.resolve( key ),
        value: this.config.module[key],
      }))
      .reduce(( result, current ) => {
        result[current.key] = current.value;
        return result;
      }, {});

    /**
     * Load all of the plugins.
     * Firstly loop over any core config and find key that have
     * object values. We'll load up the plugin for these.
     */
    Object
      .keys( this.config.core )
      .filter( key => key )
      .forEach( key => {
        const moduleConfig = this.config.core[key];
        /**
         * If the value is an object and we have a plugin
         * for this module then load it
         * */
        if ( typeof moduleConfig === 'object' && this.config.plugins[ key ]) {
          new this.config.plugins[ key ]( key, moduleConfig );
        }
      });


    /** 
     * Check if the the 'env' config option was provided and if so
     * modify the process.env object to only contain the
     * environment variables specified.
     */
    if ( this.config.env != null ) {
      /* Create a new object that we'll replace process.env with */
      const newEnv = Object
        .keys( this.config.env )
        .filter( key => this.config.env[key] )
        .map( key => ({
          key,
          value: process.env[key],
        }))
        .reduce(( result, item ) => {
          result[item.key] = item.value;
          return result;
        }, {});

      /* Replace process.env with the new environment object */
      process.env = newEnv;
    }

    /* Override the Module._load function with our own */
    if ( !this.moduleLoader ) {
      this.moduleLoader = new ModuleLoader( this.config );
      Module._load = this.moduleLoader.load;
    }

    /* Finally, record that we've fully configured NodeSecurity */
    this.configured = true;
  }

  /**
   * Resets the Module._load override 
   * Note: This doesn't provide an easy way for malicious modules
   * to just bypass all of our checks. This is because each time NodeSecurity
   * is configured it takes a new reference to the current definition of Module._load.
   * This means that any instances of NodeSecurity created after the first instance
   * will still apply the rules of the first instance as its copy of Module._load
   * is not the Node internal one, but is the one that NodeSecurity overrided one.
   * This means that each attempted module load will be processed by each configured instance
   * of NodeSecurity and that calling reset() on an instance of NodeSecurity on affects that
   * instance not others created before it */
  reset = () => {
    /* Only do the reset if required */
    if ( this.moduleLoader ) {
      Module._load = this.moduleLoader.getOriginalLoader();
      this.configured = false;
    }
  }
}

export default NodeSecurity;

/* Prevent the prototype being modified */
Object.freeze( module.exports.default.prototype );