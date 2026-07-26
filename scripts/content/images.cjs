const WIKIMEDIA_COMMONS_HOST = 'commons.wikimedia.org';
const WIKIMEDIA_UPLOAD_HOST = 'upload.wikimedia.org';
const WIKIMEDIA_FILE_PATH_PREFIX = '/wiki/Special:FilePath/';
const RESPONSIVE_WIDTHS = [640, 960, 1280];
const DEFAULT_WIDTH = 960;

function wikimediaFileUrl(value) {
  let source;
  try {
    source = new URL(value);
  } catch (_error) {
    return null;
  }

  let encodedFilename = '';
  if (
    source.hostname === WIKIMEDIA_COMMONS_HOST
    && source.pathname.startsWith(WIKIMEDIA_FILE_PATH_PREFIX)
  ) {
    encodedFilename = source.pathname.slice(WIKIMEDIA_FILE_PATH_PREFIX.length);
  } else if (
    source.hostname === WIKIMEDIA_UPLOAD_HOST
    && source.pathname.startsWith('/wikipedia/commons/')
  ) {
    encodedFilename = source.pathname.split('/').pop() || '';
  }

  if (!encodedFilename) return null;
  return new URL(
    `https://${WIKIMEDIA_COMMONS_HOST}${WIKIMEDIA_FILE_PATH_PREFIX}${encodedFilename}`
  );
}

function responsiveImageUrl(value, width = DEFAULT_WIDTH) {
  const source = wikimediaFileUrl(value);
  if (!source) return value;

  source.searchParams.set('width', String(width));
  return source.toString();
}

function responsiveImageSrcset(value) {
  if (!wikimediaFileUrl(value)) return '';

  return RESPONSIVE_WIDTHS
    .map((width) => `${responsiveImageUrl(value, width)} ${width}w`)
    .join(', ');
}

module.exports = {
  responsiveImageSrcset,
  responsiveImageUrl,
};
