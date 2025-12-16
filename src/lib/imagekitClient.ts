import ImageKit from 'imagekit-javascript';
import { http } from './http';

let client: ImageKit | null = null;

export interface ImageKitAuthPayload {
  signature: string;
  expire: number;
  token: string;
}

const getClient = () => {
  if (client) return client;

  const publicKey = import.meta.env.VITE_IMAGEKIT_PUBLIC_KEY;
  const urlEndpoint = import.meta.env.VITE_IMAGEKIT_URL_ENDPOINT;

  if (!publicKey || !urlEndpoint) {
    throw new Error('ImageKit non configuré côté client');
  }

  client = new ImageKit({
    publicKey,
    urlEndpoint,
    authenticationEndpoint: ''
  });

  return client;
};

export const fetchImageKitAuth = async () => {
  const { data } = await http.get<ImageKitAuthPayload>('/imagekit-auth');
  return data;
};

export const uploadToImageKit = async (file: Blob, fileName: string) => {
  const auth = await fetchImageKitAuth();
  const imagekit = getClient();

  return imagekit.upload({
    file,
    fileName,
    token: auth.token,
    signature: auth.signature,
    expire: auth.expire,
    folder: 'avatars',
    useUniqueFileName: true
  });
};
