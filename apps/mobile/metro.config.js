const path = require('path');
const { getDefaultConfig, mergeConfig } = require('@react-native/metro-config');

const projectRoot = __dirname;
/** Monorepo root (hoisted dependencies live here with npm workspaces). */
const workspaceRoot = path.resolve(projectRoot, '../..');

/**
 * Metro configuration — required because `apps/mobile/node_modules` is empty
 * and packages resolve from `zygo/node_modules`.
 *
 * @type {import('@react-native/metro-config').MetroConfig}
 */
const config = {
  watchFolders: [workspaceRoot],
  resolver: {
    nodeModulesPaths: [
      path.resolve(projectRoot, 'node_modules'),
      path.resolve(workspaceRoot, 'node_modules'),
    ],
  },
};

module.exports = mergeConfig(getDefaultConfig(projectRoot), config);
