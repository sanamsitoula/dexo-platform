const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const projectRoot = __dirname;
const monorepoRoot = path.resolve(projectRoot, '../..');

const config = getDefaultConfig(projectRoot);

config.watchFolders = [projectRoot];

config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
];

config.resolver.blockList = [
  new RegExp(`^${escapeRegExp(monorepoRoot)}/node_modules/.*$`),
];

config.watcher = {
  watchman: {
    deferStates: ['vcs'],
  },
  healthCheck: {
    enabled: false,
  },
};

module.exports = config;

function escapeRegExp(string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
