const bcrypt = require('bcrypt')

const BCRYPT_PREFIXES = ['$2a$', '$2b$', '$2y$']

function isBcryptHash(value) {
  return typeof value === 'string' && BCRYPT_PREFIXES.some((prefix) => value.startsWith(prefix))
}

async function hashPassword(password) {
  return bcrypt.hash(password, 10)
}

async function verifyPassword(password, storedHash) {
  if (!storedHash) return false

  if (isBcryptHash(storedHash)) {
    return bcrypt.compare(password, storedHash)
  }

  return password === storedHash
}

module.exports = {
  hashPassword,
  verifyPassword,
  isBcryptHash
}
