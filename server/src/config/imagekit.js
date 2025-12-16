import ImageKit from 'imagekit';

const requiredImageKitEnvVars = [
  'IMAGEKIT_PUBLIC_KEY',
  'IMAGEKIT_PRIVATE_KEY',
  'IMAGEKIT_URL_ENDPOINT'
];

const missingKeys = requiredImageKitEnvVars.filter((key) => !process.env[key]);

if (missingKeys.length > 0) {
  throw new Error(
    `ImageKit configuration is missing required environment variables: ${missingKeys.join(', ')}. ` +
    'Ensure server/.env is loaded before initializing ImageKit.'
  );
}

const imagekit = new ImageKit({
  publicKey: process.env.IMAGEKIT_PUBLIC_KEY,
  privateKey: process.env.IMAGEKIT_PRIVATE_KEY,
  urlEndpoint: process.env.IMAGEKIT_URL_ENDPOINT
});

export default imagekit;
