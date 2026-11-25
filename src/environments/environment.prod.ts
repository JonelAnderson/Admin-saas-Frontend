import packageInfo from '../../package.json';

export const environment = {
  appVersion: packageInfo.version,
  production: true,
  // Mismo origen: nginx (Deploy/docker/nginx.conf) reenvía /api a la API. Sin CORS y sin URL fija por servidor.
  apiUrl: '/api/',
  isTestEnvironment: false
};
