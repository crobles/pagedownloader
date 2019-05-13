const arr2string = (arr) => `[ ${arr.join(', ')} ]`;
const obj2string = (o) => JSON.stringify(o, null, 2);

const at = (msg = '', indirectionLevel = 2) => {
  const where = `${new Error().stack.split(/\n/)[indirectionLevel].trim()}`;

  if (Array.isArray(msg)) {
    return `${where}\n${arr2string(msg)}`;
  } else if ('object' === typeof msg) {
    return (msg instanceof Error) ? `${where}\n${msg.stack}` : `${where}\n${obj2string(msg)}`;
  } else if (msg) {
    return `${where}\n${msg}`;
  } else {
    return `${where}`;
  }
};

module.exports = at;
