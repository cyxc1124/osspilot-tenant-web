import {
  availableObjectAddressProtocols,
  buildObjectAddress,
  resolveObjectAddressDomain,
} from './objectAddress';

// ponytail: smallest runnable check for address join / encoding / protocol fallback
const address = buildObjectAddress('https://oss.example.com/', 'http', 'bucket', 'a/b.txt');
console.assert(address === 'http://oss.example.com/bucket/a/b.txt', address);

const leadingSlash = buildObjectAddress('oss.example.com', 'https', 'bucket', '/a/b.txt');
console.assert(leadingSlash === 'https://oss.example.com/bucket//a/b.txt', leadingSlash);

const emptySegment = buildObjectAddress('oss.example.com', 'https', 'bucket', 'a//b.txt');
console.assert(emptySegment === 'https://oss.example.com/bucket/a//b.txt', emptySegment);

const encoded = buildObjectAddress('oss.example.com', 'https', 'my bucket', 'path/has space#1.txt');
console.assert(
  encoded === 'https://oss.example.com/my%20bucket/path/has%20space%231.txt',
  encoded,
);

const dotKey = 'a/../b/./c.txt';
const percentKey = 'a/%2E%2E/b/%2E/c.txt';
const dotAddress = buildObjectAddress('oss.example.com', 'https', 'bucket', dotKey);
const percentAddress = buildObjectAddress('oss.example.com', 'https', 'bucket', percentKey);
console.assert(dotAddress === `https://oss.example.com/bucket/${encodeURIComponent(dotKey)}`, dotAddress);
console.assert(percentAddress !== dotAddress, percentAddress);
console.assert(new URL(dotAddress).href === dotAddress, new URL(dotAddress).href);

const soleDot = buildObjectAddress('oss.example.com', 'https', 'bucket', '.');
const soleDotDot = buildObjectAddress('oss.example.com', 'https', 'bucket', '..');
const soleDotPercent = buildObjectAddress('oss.example.com', 'https', 'bucket', '%2E');
console.assert(soleDot === 's3://bucket/.', soleDot);
console.assert(soleDotDot === 's3://bucket/..', soleDotDot);
console.assert(soleDotPercent === 'https://oss.example.com/bucket/%252E', soleDotPercent);
console.assert(soleDot !== soleDotPercent, 'dot key must not collide with %2E');

console.assert(
  resolveObjectAddressDomain('https', null, null, 'http://rgw.example:7480') === null,
  'https must not rewrite http endpoint',
);
console.assert(
  resolveObjectAddressDomain('http', null, null, 'http://rgw.example:7480') ===
    'http://rgw.example:7480',
);

console.assert(
  availableObjectAddressProtocols(null, null, 'http://rgw.example:7480').join(',') === 'http',
);
console.assert(
  availableObjectAddressProtocols('http://a', 'https://b', 'http://rgw').join(',') === 'http,https',
);
