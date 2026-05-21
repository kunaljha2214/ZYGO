const path = require('path');
const fs = require('fs');
const { getDefaultConfig, mergeConfig } = require('@react-native/metro-config');

const projectRoot = __dirname;
/** Monorepo root (hoisted dependencies live here with npm workspaces). */
const workspaceRoot = path.resolve(projectRoot, '../..');

const defaultConfig = getDefaultConfig(projectRoot);

const blockList = [
  /[/\\]android[/\\]app[/\\]\.cxx[/\\].*/,
  /[/\\]android[/\\]app[/\\]build[/\\].*/,
  /[/\\]android[/\\]build[/\\].*/,
];

const MAPBOX_PKG = `${path.sep}@rnmapbox${path.sep}maps${path.sep}`;

/** @rnmapbox/maps ships Fabric specs as .ts; Metro must resolve them from .js imports. */
function resolveRnmapboxSpecs(context, moduleName) {
  const origin = context.originModulePath;
  if (!origin.includes(MAPBOX_PKG)) return null;

  let rel = null;
  if (moduleName.startsWith('./specs/')) rel = moduleName.slice(2);
  else if (moduleName.startsWith('../specs/')) rel = moduleName.slice(3);
  else return null;

  const base = path.join(path.dirname(origin), rel);
  for (const ext of ['.ts', '.tsx', '.js']) {
    const candidate = `${base}${ext}`;
    if (fs.existsSync(candidate)) {
      return { type: 'sourceFile', filePath: candidate };
    }
  }
  return null;
}

/**
 * Metro configuration — required because `apps/mobile/node_modules` is empty
 * and packages resolve from `zygo/node_modules`.
 *
 * @type {import('@react-native/metro-config').MetroConfig}
 */
const config = {
  watchFolders: [workspaceRoot],
  resolver: {
    blockList,
    nodeModulesPaths: [
      path.resolve(projectRoot, 'node_modules'),
      path.resolve(workspaceRoot, 'node_modules'),
    ],
    resolveRequest: (context, moduleName, platform) => {
      const mapboxResolved = resolveRnmapboxSpecs(context, moduleName);
      if (mapboxResolved) return mapboxResolved;
      return context.resolveRequest(context, moduleName, platform);
    },
  },
};

module.exports = mergeConfig(defaultConfig, config);
