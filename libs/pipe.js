const $ = require('cheerio');
const puppeteer = require('puppeteer');
let browser = null;

const map = (arr, cb = () => null, sync = true, args = []) => {
  if (sync) {
    return arr.map( item =>  cb.apply(null, [item].concat(args) ));
  } else {
    return new Promise ( (resolve, reject) => {
      Promise.all( arr.map( async item => await cb.apply(null, [item].concat(args) ) ) )
        .then(_arr => {
          resolve(_arr);
        }).catch(err => {
          reject(err);
        });
    });
  }
};

Array.prototype.injectArr = function ( insertArr, index)  {
  let arr = [].concat(insertArr);
  arr.reverse();
  for (const item of arr) {
    this.splice(index, 0, item);
  }
};

const iteration = {
  map : (arr, cb = () => null, args = [], n ) => {
    let _args = args;
    _args.splice();
    return arr.map( item =>  cb.apply(null, args.injectArr([item], n) ));
  },
  asyncMap : (arr, cb = () => null, args = [], n ) => {
    return new Promise ( (resolve, reject) => {
      Promise.all( arr.map( async item => await cb.apply(null, args.injectArr([item], n) ) ) )
        .then(_arr => {
          resolve(_arr);
        }).catch(err => {
          reject(err);
        });
    });
  },
  loop : (arr, cb = () => null, args = [], n ) => {
    let res = [];
    for (const item of arr) {
      res.push( cb.apply(null, args.injectArr([item], n) )  );
    }
    return res;
  },
  asyncLoop : (arr, cb = () => null, args = [], n ) => {
    return new Promise ( async (resolve, reject) => {
      try {
        let res = [];
        for (const item of arr) {
          res.push( await cb.apply(null, args.injectArr([item], n) )  );
        }
        resolve(res);
      } catch (error) {
        reject(error);
      }
    } );
  }
};

const bifurcation = (value, comparison, cbTrue = () => null, cbFalse = () => null, args = [], n ) => {
  if (value == comparison) {
    return cbTrue.apply(null, args.injectArr([value], n) );
  } else {
    return cbFalse.apply(null, args.injectArr([value], n) );
  }
};

const loop = (arr, cb = () => null, sync = true, args = []) => {
  if (sync) {
    //return arr.map( item => cb.apply(null, args.unshift(item) ) );
    let res = [];
    for (const item of arr) {
      res.push( cb.apply(null, [item].concat(args) )  );
    }
    return res;
  } else {
    return new Promise ( async (resolve, reject) => {
      try {
        let res = [];
        for (const item of arr) {
          res.push( await cb.apply(null, [item].concat(args) )  );
        }
        resolve(res);
      } catch (error) {
        reject(error);
      }
    } );
  }
};

const cheerio = function (selector, html, fx = null, fxArg = null) {
  const _res = $(selector, html);
  if (fx === null) {
    return _res;
  } else if (fxArg === null) {
    return _res[fx]();
  } else {
    return _res[fx]().apply(null, fxArg);
  }
};

const pipe = function () {
  const stepArr = arguments;
  const _ = { bifurcation, iteration, cheerio};
  let tmpVal = stepArr.shift();
  for (const step of stepArr) {
    if (!_.hasOwnProperty(step['fx'])) {
      throw new Error(`${step['fx']} is not a pipe function`);
    }
    if (step['fx'] == 'cheerio') {
      tmpVal = _.cheerio().apply( step['args'].injectArr([tmpVal], 1) );
    } else {
      tmpVal = _[step['fx']]().apply( step['args'].unshift(tmpVal) );
    }
  }

};

