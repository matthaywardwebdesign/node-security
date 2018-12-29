/* Import and create a new instance of NodeSecurity */
const nodesecurity = require( '@matthaywardwebdesign/node-security' );
const NodeSecurity = new nodesecurity();

/* Configure NodeSecurity */
NodeSecurity.configure({
  core: {
    /* Define global fs access */
    fs: false,
    /* Enable other core modules we'll need */
    stream: true,
    util: true,
    path: true,
    os: {
      /* Deny access to OS arch */
      arch: false,
    },
    assert: true,
  },
  module: {
    /* Allow fs-extra to access fs */
    'fs-extra': {
      fs: true,
    }
  }
});

/* This won't throw an error as fs-extra is allowed to access fs */
require( 'fs-extra' );

/* Accessing fs directly will throw an error */
require( 'fs' );

/* Accessing os.arch will throw an error */
const os = require( 'os' );
os.arch();