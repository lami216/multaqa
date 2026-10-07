db = db.getSiblingDB('multaqa');
db.createUser({
  user: 'multaqa_app',
  pwd: process.env.MONGO_APP_PASSWORD,
  roles: [{ role: 'readWrite', db: 'multaqa' }]
});
