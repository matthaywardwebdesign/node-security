class NodeSecurityPlugin {
  constructor( moduleName, config ) {
    const module = require( moduleName );
    /* Overwrite the required functions based on the config */
    Object.keys( config ).filter( key => !config[key] ).forEach( key => {
      module[key] = () => {
        throw new Error( `Attempt to access ${moduleName}.${key} was blocked` ); 
      }
    });
  }
}

export default NodeSecurityPlugin;
