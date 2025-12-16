import ImageKit from 'imagekit-javascript';
import { http } from './http';

let client: ImageKit | null = null;
let clientConfig: { publicKey: string; urlEndpoint: string } | null = null;

export interface ImageKitAuthPayload {
  signature: string;
  expire: number;
  token: string;
  publicKey: string;
  urlEndpoint: string;
}

const getClient = (config: { publicKey: string; urlEndpoint: string }) => {
  if (client && clientConfig?.publicKey === config.publicKey && clientConfig?.urlEndpoint === config.urlEndpoint) {
    return client;
  }

  client = new ImageKit({
    publicKey: config.publicKey,
    urlEndpoint: config.urlEndpoint
  });
  clientConfig = config;

  return client;
};

export const fetchImageKitAuth = async () => {
  const { data } = await http.get<ImageKitAuthPayload>('/imagekit-auth');
  return data;
};

export const uploadToImageKit = async (file: Blob, fileName: string) => {
  const auth = await fetchImageKitAuth();
  const imagekit = getClient({ publicKey: auth.publicKey, urlEndpoint: auth.urlEndpoint });

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
