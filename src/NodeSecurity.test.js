import nodesecurity from './NodeSecurity';
import { expect } from 'chai';
let NodeSecurity;

describe( 'NodeSecurity', () => {
  /* Create a new instance of NodeSecurity before each test */
  beforeEach(() => {
    NodeSecurity = new nodesecurity();
  });
  
  afterEach(() => {
    /* After each test reset the Module._load implementation */
    NodeSecurity.reset();

    /**
     * Remove all the modules from the module cache.
     * The reason we have to do this is because
     * the module cache remains the same between
     * each test. This does highlight a potential
     * issue with how module access is determined.
     * 
     * To demonstrate let's use a real world example.
     * The package 'trash' has 'fs-extra' as a
     * dependency. 'fs-extra' also has 'fs' as a
     * dependency. If we run one test where we
     * load up 'trash' and the config allows it to
     * pass, 'trash' and all of its dependencies
     * including 'fs-extra' will be cached.
     * 
     * If we now reconfigure and now do a fresh test
     * of NodeSecurity and set the config to not allow
     * 'fs-extra' filesystem access and go ahead and
     * require 'trash' we'd expect that it wouldn't
     * allow it to pass because 'fs-extra' is a
     * dependency of 'trash' and 'fs-extra' doesn't
     * have access to the filesystem. What happens
     * instead is that because 'trash' is cached
     * it skips the entire dependency resolution
     * process and loads our cached module because
     * our config allows 'trash' to be loaded.
     * */
    Object.keys( require.cache ).forEach( key => {
      delete require.cache[ key ];
    });
  });
  
  it( 'should allow to an instance of NodeSecurity to be created.', () => {
    expect( NodeSecurity ).to.be.an.instanceof( nodesecurity );
  });
  
  it( 'should throw an exception when trying to configure NodeSecurity twice.', () => {
    NodeSecurity.configure();
  
    /* Attempt to configure NodeSecurity again */
    expect(() => {
      NodeSecurity.configure();
    }).to.throw();
  });
  
  it( 'should have all of the core modules disabled by default.', () => {
    /* Create a list of all of the core modules */
    const coreModules = [
      'assert', 'buffer', 'child_process', 'cluster', 'crypto',
      'dgram', 'dns', 'domain', 'events', 'fs', 'http', 'https',
      'http2', 'inspector', 'module', 'net', 'os', 'path', 'punycode',
      'querystring', 'perf_hooks', 'readline', 'stream',
      'string_decoder', 'timers', 'tls', 'tty', 'url', 'util',
      'v8', 'vm', 'zlib', 'module', 'node-security',
    ];
  
    /* Loop over each one and make sure they are set to false */
    coreModules.forEach( module => {
      expect( NodeSecurity.config.core[module] ).to.be.false;
    });
  });
  
  it( 'should correctly merge the core config and user config.', () => {
    NodeSecurity.configure({
      core: {
        fs: true,
      }
    });
  
    expect( NodeSecurity.config.core.fs ).to.be.true;
    expect( NodeSecurity.config.core.os ).to.not.be.null;
  });
  
  it( 'should throw an exception when trying to load a blocked module', () => {
    /* Configure the NodeSecurity instance */
    NodeSecurity.configure();
  
    /* Attempt to load the os module and expect an error */
    expect(() => {
      require( 'os' );
    }).to.throw();
  });
  
  it( 'should not throw an exception when loading an allowed module', () => {
    /* Configure the NodeSecurity instance */
    NodeSecurity.configure({
      core: {
        os: true,
      }
    });
  
    /* Attempt to load the os module */
    expect(() => {
      require( 'os' );
    }).not.to.throw();
  });
  
  it( 'should throw an exception when trying to load a third party module that loads a core module', () => {
    /* Configure the NodeSecurity instance */
    NodeSecurity.configure();
  
    expect(() => {
      require( 'fs-extra' );
    }).to.throw();
  });
  
  it( 'should not throw an exception when trying to load a third party module that access allowed core modules', () => {
    /* Configure the NodeSecurity instance */
    NodeSecurity.configure({
      core: {
        fs: true,
        stream: true,
        util: true,
        path: true,
        os: true,
        assert: true,
      }
    });
  
    /* Expect that loading fs-extra, which loads fs, will fail */
    expect(() => {
      require( 'fs-extra' );
    }).not.to.throw();
  });
  
  it( 'should not throw an exception when a globally blocked core module is accessed by a third party module that has the core module allowed in module specific configuration.', () => {
    /* Configure the NodeSecurity instance */
    NodeSecurity.configure({
      core: {
        stream: true,
        util: true,
        path: true,
        os: true,
        assert: true,
      },
      module: {
        'fs-extra': {
          fs: true,
        }
      }
    });
  
    /* Expect that loading fs will fail as it isn't allowed */
    expect(() => {
      require( 'fs' );
    }).to.throw();
  
    /**
     * Expect that loading fs-extra will work, despite it loading fs
     * as we've given fs-extra permission to load the fs module
     */
    expect(() => {
      require( 'fs-extra' );
    }).not.to.throw();
  });
  
  it( 'should throw an exception when a globally allowed core module is accessible by a third party module that has the core module blocked in module specific configuration.', () => {
    /* Configure the NodeSecurity instance */
    NodeSecurity.configure({
      core: {
        fs: true,
        stream: true,
        util: true,
        path: true,
        os: true,
        assert: true,
      },
      module: {
        'fs-extra': {
          fs: false,
        }
      },
    });
  
    /**
     * Expect that loading fs-extra won't work as despite allowing fs
     * globally, we've specifically disallowed it for fs-extra
     */
    expect(() => {
      require( 'fs-extra' );
    }).to.throw();
  });

  it( 'should throw an exception when the parent module is denied access to a core module that is accessed through a child module, even when the configuration allows the child module to have access', () => {
    /* Configure the NodeSecurity instance */
    NodeSecurity.configure({
      core: {
        stream: true,
        util: true,
        path: true,
        os: true,
        assert: true,
        events: true,
        child_process: true,
        crypto: true,
      },
      module: {
        trash: {
          fs: false,
        },
        'fs-extra': {
          fs: true,
        }
      }
    });

    expect(() => {
      require( 'trash' );
    }).to.throw();

    expect(() => {
      require( 'fs-extra' );
    }).to.not.throw();
  });

  it ( 'should block specific functions on core modules when the config specifies it', () => {
    /* Configure the NodeSecurity instance */
    NodeSecurity.configure({
      core: {
        os: {
          arch: false,
        }
      }
    });

    /* Attempt to access os.arch */
    const os = require( 'os' );
    
    expect(() => {
      os.arch();
    }).to.throw();
  });
  
  it( 'continue to honour the behaviour when a secondary instance of NodeSecurity is created and then reset.', () => {
    /* Configure the NodeSecurity instance */
    NodeSecurity.configure();
  
    /* Attempt to load the fs module and expect an error */
    expect(() => {
      require( 'fs' );
    }).to.throw();
  
    /* Create a new instance of NodeSecurity */
    const NodeSecurity2 = new nodesecurity();
  
    /* Configure it then immediately reset it */
    NodeSecurity2.configure();
    NodeSecurity2.reset();
  
    /* Ensure that attempting to load fs still throws an error */
    expect(() => {
      require( 'fs' );
    }).to.throw();
  });
  
  it( 'should strip disallowed environment variables from process.env when the env configuration option is provided.', () => {
    /* Set an example value on the process.env object */
    process.env.SECRET_STUFF = 'Magic';
    process.env.PUBLIC_STUFF = 'Not magic';
  
    /* Configure the NodeSecurity instance */
    NodeSecurity.configure({
      env: {
        PUBLIC_STUFF: true,
      }
    });
  
    /* Ensure the public environment variable is still present */
    expect( process.env.PUBLIC_STUFF ).not.to.be.undefined;
  
    /* Ensure the secret environment variable is not present */
    expect( process.env.SECRET_STUFF ).to.be.undefined;
  });

  it( 'should allow setting env to false to remove all environment variables', () => {
    /* Set an example value on the process.env object */
    process.env.SECRET_STUFF = 'Magic';
    process.env.PUBLIC_STUFF = 'Not magic';
  
    /* Configure the NodeSecurity instance */
    NodeSecurity.configure({
      env: false,
    });
  
    /* Ensure the public environment variable is still present */
    expect( Object.keys( process.env ).length ).to.equal( 0 );
  });

  it( 'should block access to process.binding', () => {
    /* Configure the NodeSecurity instance */
    NodeSecurity.configure({});

    expect(() => {
      process.binding( 'fs' );
    }).to.throw();
  });
});