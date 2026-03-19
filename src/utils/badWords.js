const Filter = require('bad-words');
const filter = new Filter();

const isBadWordsEnabled = () => {
  const raw = process.env.BAD_WORDS_ENABLED;
  if (raw === undefined || raw === null || raw === '') {
    return true;
  }
  const lowered = String(raw).trim().toLowerCase();
  return !['0', 'false', 'off', 'no'].includes(lowered);
};

const containsBadWords = (content) => filter.isProfane(content || '');

module.exports = {
  isBadWordsEnabled,
  containsBadWords,
};
