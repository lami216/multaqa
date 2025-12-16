import ImageKit from 'imagekit-javascript';
import { http } from './http';

const publicKey = import.meta.env.VITE_IMAGEKIT_PUBLIC_KEY;
const urlEndpoint = import.meta.env.VITE_IMAGEKIT_URL_ENDPOINT;

if (!publicKey || !urlEndpoint) {
  console.warn('ImageKit public key or URL endpoint is missing from environment variables.');
}

export const imagekitClient = new ImageKit({
  publicKey: publicKey ?? '',
  urlEndpoint: urlEndpoint ?? '',
  authenticationEndpoint: `${http.defaults.baseURL}/imagekit-auth`
});
