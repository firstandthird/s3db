const fs = require('fs');

const getLocation = (key, config) => `${config.root}/${key.replace(/\//g, config.separator)}`;

const local = {
  put(key, body, acl, config) {
    if (!fs.existsSync(config.root)) {
      fs.mkdirSync(config.root);
    }
    const location = getLocation(key, config);
    fs.writeFileSync(location, JSON.stringify(body));
    return {
      VersionId: Math.random().toString(),
      Key: key,
      Location: location
    };
  },
  get(key, version = false, config, fallback) {
    try {
      const file = fs.readFileSync(getLocation(key, config));
      // try to guess if it's a json object:
      if (key.endsWith('.json')) {
        return JSON.parse(file);
      }
      return {
        Body: file
      };
    } catch (e) {
      if (fallback) {
        return fallback;
      }
      throw e;
    }
  },
  exists(key, config) {
    if (fs.existsSync(getLocation(key, config))) {
      return true;
    }
    return false;
  },
  list(prefix = false, continuationToken = false, pageSize = false, config) {
    const files = [];
    if (!prefix) {
      fs.readdirSync(config.root)
        .map(f => {
          if (!f.includes(config.separator)) {
            return files.push(f);
          }
          const folder = f.split(config.separator)[0];
          if (!files.includes(folder)) {
            return files.push(folder);
          }
          return files;
        });
      return {
        Contents: files.map(f => ({ Key: f.replace(`${config.path}_`, '') }))
      };
    }
    fs.readdirSync(config.root)
      .forEach(f => {
        if (f.startsWith(`${prefix}${config.separator}`)) {
          files.push(f.replace(`${prefix}${config.separator}`, '/')
            .replace(new RegExp(config.separator, 'g', '/'), '/'));
        }
      });
    return {
      CommonPrefixes: files.map(f => ({ Prefix: f }))
    };
  }
};

local.delete = (prefix, publishedPrefix = false, config) => {
  let deleteCount = 0;
  const deleteKey = prefix.replace(new RegExp('/', 'g'), config.separator);
  fs.readdirSync(config.root)
    .forEach(f => {
      if (f.startsWith(deleteKey)) {
        fs.unlinkSync(getLocation(f, config));
        deleteCount++;
      }
    });
  return deleteCount;
};

module.exports = local;
